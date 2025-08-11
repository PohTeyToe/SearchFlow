{{
    config(
        materialized='view'
    )
}}

/*
    Sessionize search events and calculate session-level metrics.
    
    A session groups user activity with a 30-minute timeout.
    This intermediate model provides the foundation for funnel analysis.
*/

WITH searches AS (
    SELECT * FROM {{ ref('stg_search_events') }}
),

clicks AS (
    SELECT * FROM {{ ref('stg_click_events') }}
),

conversions AS (
    SELECT * FROM {{ ref('stg_conversion_events') }}
),

-- Get first search of each session for context
first_search_per_session AS (
    SELECT
        session_id,
        platform,
        device_type,
        geo_country,
        utm_source,
        utm_campaign
    FROM searches
    QUALIFY ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY event_timestamp) = 1
),

-- Aggregate searches by session
session_searches AS (
    SELECT
        session_id,
        MIN(event_timestamp) AS session_start,
        MAX(event_timestamp) AS session_end,
        COUNT(*) AS search_count,
        COUNT(DISTINCT search_query) AS unique_queries,
        -- Take the user_id if available (any non-null)
        MAX(user_id) AS user_id
    FROM searches
    GROUP BY session_id
),

-- Aggregate clicks by session
session_clicks AS (
    SELECT
        session_id,
        COUNT(*) AS click_count,
        AVG(result_position) AS avg_click_position,
        SUM(result_price) AS total_clicked_value
    FROM clicks
    GROUP BY session_id
),

-- Aggregate conversions by session
session_conversions AS (
    SELECT
        c.session_id,
        COUNT(*) AS conversion_count,
        SUM(c.booking_value) AS total_booking_value,
        SUM(c.commission) AS total_commission
    FROM conversions c
    GROUP BY c.session_id
)

SELECT
    ss.session_id,
    ss.user_id,
    ss.session_start,
    ss.session_end,
    
    -- Session duration in minutes
    EXTRACT(EPOCH FROM (ss.session_end - ss.session_start)) / 60 AS session_duration_minutes,
    
    -- Counts
    ss.search_count,
    ss.unique_queries,
    COALESCE(sc.click_count, 0) AS click_count,
    COALESCE(sc.avg_click_position, 0) AS avg_click_position,
    COALESCE(scv.conversion_count, 0) AS conversion_count,
    COALESCE(scv.total_booking_value, 0) AS total_booking_value,
    COALESCE(scv.total_commission, 0) AS total_commission,
    
    -- Session context (from first search)
    fs.platform,
    fs.device_type,
    fs.geo_country,
    fs.utm_source,
    fs.utm_campaign,
    
    -- Derived rates
    CASE 
        WHEN ss.search_count > 0 
        THEN CAST(COALESCE(sc.click_count, 0) AS FLOAT) / ss.search_count 
        ELSE 0 
    END AS session_ctr,
    
    CASE 
        WHEN COALESCE(sc.click_count, 0) > 0 
        THEN CAST(COALESCE(scv.conversion_count, 0) AS FLOAT) / sc.click_count 
        ELSE 0 
    END AS session_conversion_rate,
    
    -- Session outcome classification
    CASE
        WHEN COALESCE(scv.conversion_count, 0) > 0 THEN 'converted'
        WHEN COALESCE(sc.click_count, 0) > 0 THEN 'engaged'
        ELSE 'bounced'
    END AS session_outcome

FROM session_searches ss
LEFT JOIN first_search_per_session fs ON ss.session_id = fs.session_id
LEFT JOIN session_clicks sc ON ss.session_id = sc.session_id
LEFT JOIN session_conversions scv ON ss.session_id = scv.session_id
