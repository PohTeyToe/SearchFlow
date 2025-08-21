{{
    config(
        materialized='table',
        tags=['reverse-etl']
    )
}}

/*
    Collaborative filtering recommendations for search personalization.
    
    THIS MODEL IS SYNCED TO REDIS VIA REVERSE-ETL.
    
    Logic: "Users who clicked/booked destinations similar to yours also liked these destinations"
    
    Used by the search service for:
    - Personalized result ranking
    - "Recommended for you" sections
    - Destination suggestions
*/

WITH user_destinations AS (
    -- Get destinations users have shown interest in (clicked or converted)
    -- Use GROUP BY to deduplicate user-destination pairs and take max signal strength
    SELECT
        c.user_id,
        c.result_destination AS destination,
        -- Higher weight for conversions than just clicks
        -- MAX ensures we use conversion weight (1.0) if user ever converted on this destination
        MAX(
            CASE 
                WHEN cv.event_id IS NOT NULL THEN 1.0 
                ELSE 0.5 
            END
        ) AS signal_strength
    FROM {{ ref('stg_click_events') }} c
    LEFT JOIN {{ ref('stg_conversion_events') }} cv 
        ON c.event_id = cv.click_event_id
    WHERE c.user_id IS NOT NULL
      AND c.result_destination IS NOT NULL
    GROUP BY c.user_id, c.result_destination
),

-- Find similar users (share at least 2 destinations of interest)
user_similarity AS (
    SELECT
        a.user_id AS user_a,
        b.user_id AS user_b,
        COUNT(DISTINCT a.destination) AS shared_destinations,
        SUM(a.signal_strength * b.signal_strength) AS similarity_score
    FROM user_destinations a
    INNER JOIN user_destinations b 
        ON a.destination = b.destination 
        AND a.user_id != b.user_id
    GROUP BY a.user_id, b.user_id
    HAVING COUNT(DISTINCT a.destination) >= 2
),

-- Get destinations that similar users liked but target user hasn't seen
candidate_recommendations AS (
    SELECT
        us.user_a AS user_id,
        ud.destination,
        SUM(us.similarity_score * ud.signal_strength) AS raw_score,
        COUNT(DISTINCT us.user_b) AS supporting_users
    FROM user_similarity us
    INNER JOIN user_destinations ud 
        ON us.user_b = ud.user_id
    -- Exclude destinations user has already interacted with
    WHERE NOT EXISTS (
        SELECT 1 
        FROM user_destinations existing
        WHERE existing.user_id = us.user_a 
          AND existing.destination = ud.destination
    )
    GROUP BY us.user_a, ud.destination
),

-- Normalize scores and rank
ranked_recommendations AS (
    SELECT
        user_id,
        destination AS recommended_destination,
        raw_score,
        -- Normalize score to 0-1 range (per user)
        raw_score / MAX(raw_score) OVER (PARTITION BY user_id) AS recommendation_score,
        supporting_users,
        ROW_NUMBER() OVER (
            PARTITION BY user_id 
            ORDER BY raw_score DESC
        ) AS rank
    FROM candidate_recommendations
    WHERE raw_score > 1  -- Minimum threshold for quality
)

SELECT
    user_id,
    recommended_destination,
    ROUND(recommendation_score, 4) AS recommendation_score,
    supporting_users,
    rank,
    CURRENT_TIMESTAMP AS generated_at
FROM ranked_recommendations
WHERE rank <= 10  -- Top 10 recommendations per user
