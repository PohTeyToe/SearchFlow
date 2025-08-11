{{
    config(
        materialized='table'
    )
}}

/*
    Daily funnel metrics aggregated by key dimensions.
    
    This is the primary analytics fact table for understanding:
    - Search volume and trends
    - Click-through rates by segment
    - Conversion rates and revenue
    - Channel performance
*/

WITH sessions AS (
    SELECT * FROM {{ ref('int_search_sessions') }}
)

SELECT
    -- Date dimension
    DATE(session_start) AS funnel_date,
    
    -- Dimensional cuts
    platform,
    device_type,
    geo_country,
    utm_source,
    utm_campaign,
    
    -- Funnel metrics
    COUNT(DISTINCT session_id) AS total_sessions,
    SUM(search_count) AS total_searches,
    SUM(click_count) AS total_clicks,
    SUM(conversion_count) AS total_conversions,
    
    -- Revenue metrics
    SUM(total_booking_value) AS total_revenue,
    SUM(total_commission) AS total_commission,
    
    -- Funnel rates
    CASE 
        WHEN SUM(search_count) > 0 
        THEN CAST(SUM(click_count) AS FLOAT) / SUM(search_count) 
        ELSE 0 
    END AS click_through_rate,
    
    CASE 
        WHEN SUM(click_count) > 0 
        THEN CAST(SUM(conversion_count) AS FLOAT) / SUM(click_count) 
        ELSE 0 
    END AS conversion_rate,
    
    CASE 
        WHEN SUM(search_count) > 0 
        THEN CAST(SUM(conversion_count) AS FLOAT) / SUM(search_count) 
        ELSE 0 
    END AS search_to_conversion_rate,
    
    -- Engagement metrics
    AVG(session_duration_minutes) AS avg_session_duration_minutes,
    AVG(avg_click_position) AS avg_click_position,
    AVG(unique_queries) AS avg_queries_per_session,
    
    -- Revenue per metrics
    CASE 
        WHEN SUM(conversion_count) > 0 
        THEN SUM(total_booking_value) / SUM(conversion_count) 
        ELSE 0 
    END AS avg_order_value,
    
    CASE 
        WHEN COUNT(DISTINCT session_id) > 0 
        THEN SUM(total_booking_value) / COUNT(DISTINCT session_id) 
        ELSE 0 
    END AS revenue_per_session,
    
    -- Outcome distribution
    SUM(CASE WHEN session_outcome = 'converted' THEN 1 ELSE 0 END) AS converted_sessions,
    SUM(CASE WHEN session_outcome = 'engaged' THEN 1 ELSE 0 END) AS engaged_sessions,
    SUM(CASE WHEN session_outcome = 'bounced' THEN 1 ELSE 0 END) AS bounced_sessions

FROM sessions
GROUP BY 1, 2, 3, 4, 5, 6
