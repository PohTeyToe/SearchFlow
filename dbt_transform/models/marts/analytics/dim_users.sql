{{
    config(
        materialized='table'
    )
}}

/*
    User dimension with lifetime metrics.
    
    This table powers:
    - User segmentation
    - Lifetime value analysis
    - Cohort analysis
    - User-level reporting
*/

WITH sessions AS (
    SELECT * FROM {{ ref('int_search_sessions') }}
    WHERE user_id IS NOT NULL
),

user_metrics AS (
    SELECT
        user_id,
        
        -- Lifecycle dates
        MIN(session_start) AS first_seen_at,
        MAX(session_end) AS last_seen_at,
        
        -- Activity counts
        COUNT(DISTINCT session_id) AS total_sessions,
        SUM(search_count) AS lifetime_searches,
        SUM(click_count) AS lifetime_clicks,
        SUM(conversion_count) AS lifetime_conversions,
        
        -- Revenue
        SUM(total_booking_value) AS lifetime_revenue,
        SUM(total_commission) AS lifetime_commission,
        
        -- Most common values (simplified mode calculation)
        -- In production, use a proper mode function
        MAX(platform) AS primary_platform,
        MAX(device_type) AS primary_device,
        MAX(geo_country) AS primary_country,
        
        -- Engagement averages
        AVG(session_duration_minutes) AS avg_session_duration,
        AVG(session_ctr) AS avg_ctr,
        AVG(session_conversion_rate) AS avg_conversion_rate
        
    FROM sessions
    GROUP BY user_id
)

SELECT
    user_id,
    first_seen_at,
    last_seen_at,
    
    -- Days since last activity
    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - last_seen_at)) / 86400 AS days_since_last_seen,
    
    -- Account age in days
    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - first_seen_at)) / 86400 AS account_age_days,
    
    -- Activity metrics
    total_sessions,
    lifetime_searches,
    lifetime_clicks,
    lifetime_conversions,
    
    -- Revenue metrics
    lifetime_revenue,
    lifetime_commission,
    
    -- User context
    primary_platform,
    primary_device,
    primary_country,
    
    -- Engagement metrics
    avg_session_duration,
    avg_ctr,
    avg_conversion_rate,
    
    -- Calculated lifetime rates
    CASE 
        WHEN lifetime_searches > 0 
        THEN CAST(lifetime_clicks AS FLOAT) / lifetime_searches 
        ELSE 0 
    END AS lifetime_ctr,
    
    CASE 
        WHEN lifetime_clicks > 0 
        THEN CAST(lifetime_conversions AS FLOAT) / lifetime_clicks 
        ELSE 0 
    END AS lifetime_conversion_rate,
    
    -- Revenue per metrics
    CASE 
        WHEN total_sessions > 0 
        THEN lifetime_revenue / total_sessions 
        ELSE 0 
    END AS revenue_per_session,
    
    CASE 
        WHEN lifetime_conversions > 0 
        THEN lifetime_revenue / lifetime_conversions 
        ELSE 0 
    END AS avg_order_value

FROM user_metrics
