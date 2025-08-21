{{
    config(
        materialized='table',
        tags=['reverse-etl']
    )
}}

/*
    User segmentation for marketing automation.
    
    THIS MODEL IS SYNCED TO CRM VIA REVERSE-ETL.
    
    Segments:
    - high_value: LTV > $500 or 5+ conversions
    - at_risk: No activity in 30+ days, was previously active
    - abandoned_search: Searched in last 48h, no conversion
    - new_user: First seen in last 7 days
    - regular: Everyone else
*/

WITH users AS (
    SELECT * FROM {{ ref('dim_users') }}
),

-- Find users with recent searches (last 48h)
recent_searches AS (
    SELECT DISTINCT user_id
    FROM {{ ref('stg_search_events') }}
    WHERE event_timestamp >= CURRENT_TIMESTAMP - INTERVAL '48 hours'
      AND user_id IS NOT NULL
),

-- Find users with recent conversions (last 48h)
recent_conversions AS (
    SELECT DISTINCT user_id
    FROM {{ ref('stg_conversion_events') }}
    WHERE event_timestamp >= CURRENT_TIMESTAMP - INTERVAL '48 hours'
      AND user_id IS NOT NULL
),

segmented AS (
    SELECT
        u.user_id,
        u.first_seen_at,
        u.last_seen_at,
        u.lifetime_revenue,
        u.lifetime_conversions,
        u.lifetime_searches,
        u.primary_platform,
        u.primary_country,
        u.days_since_last_seen,
        u.account_age_days,
        
        -- Segment assignment (priority order)
        CASE
            -- High-value users
            WHEN u.lifetime_revenue > 500 OR u.lifetime_conversions >= 5 
                THEN 'high_value'
            
            -- New users (first seen in last 7 days)
            WHEN u.account_age_days <= 7 
                THEN 'new_user'
            
            -- At-risk users (inactive 30+ days, had conversions before)
            WHEN u.days_since_last_seen > 30 AND u.lifetime_conversions > 0
                THEN 'at_risk'
            
            -- Abandoned search (recent search, no recent conversion)
            WHEN rs.user_id IS NOT NULL AND rc.user_id IS NULL
                THEN 'abandoned_search'
            
            -- Regular users
            ELSE 'regular'
        END AS segment,
        
        -- Engagement score (0-100)
        -- Higher score = more engaged user
        LEAST(100, GREATEST(0, (
            -- Base points for conversions
            CASE WHEN u.lifetime_conversions > 0 THEN 30 ELSE 0 END
            
            -- Points for sessions (up to 30 points)
            + LEAST(u.total_sessions, 10) * 3
            
            -- Points for good CTR (up to 20 points)
            + CASE 
                WHEN u.avg_ctr > 0.3 THEN 20 
                ELSE CAST(u.avg_ctr * 60 AS INTEGER)
              END
            
            -- Recency bonus (up to 20 points)
            + CASE 
                WHEN u.days_since_last_seen < 7 THEN 20
                WHEN u.days_since_last_seen < 14 THEN 15
                WHEN u.days_since_last_seen < 30 THEN 10
                ELSE 0
              END
        ))) AS engagement_score,
        
        CURRENT_TIMESTAMP AS segmented_at
        
    FROM users u
    LEFT JOIN recent_searches rs ON u.user_id = rs.user_id
    LEFT JOIN recent_conversions rc ON u.user_id = rc.user_id
)

SELECT
    user_id,
    segment,
    engagement_score,
    lifetime_revenue,
    lifetime_conversions,
    lifetime_searches,
    first_seen_at,
    last_seen_at,
    days_since_last_seen,
    account_age_days,
    primary_platform,
    primary_country,
    segmented_at
FROM segmented
