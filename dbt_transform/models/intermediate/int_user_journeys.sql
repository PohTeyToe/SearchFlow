{{
    config(
        materialized='view'
    )
}}

/*
    Track user journey from search to click to conversion.
    
    This model is used for:
    - Attribution modeling (which searches led to conversions)
    - Funnel analysis (where users drop off)
    - Time-to-conversion analysis
    - Search quality evaluation
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

-- Join search -> click -> conversion
journeys AS (
    SELECT
        -- Search details
        s.event_id AS search_event_id,
        s.event_timestamp AS search_timestamp,
        s.user_id,
        s.session_id,
        s.search_query,
        s.results_count AS search_results_count,
        s.platform,
        s.device_type,
        s.geo_country,
        s.utm_source,
        s.utm_campaign,
        
        -- Click details (if any)
        c.event_id AS click_event_id,
        c.event_timestamp AS click_timestamp,
        c.result_position,
        c.result_type,
        c.result_price,
        c.result_destination,
        c.result_provider,
        
        -- Conversion details (if any)
        cv.event_id AS conversion_event_id,
        cv.event_timestamp AS conversion_timestamp,
        cv.booking_value,
        cv.commission,
        cv.product_type AS converted_product_type,
        
        -- Time deltas (in seconds)
        CASE 
            WHEN c.event_timestamp IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (c.event_timestamp - s.event_timestamp))
            ELSE NULL 
        END AS search_to_click_seconds,
        
        CASE 
            WHEN cv.event_timestamp IS NOT NULL AND c.event_timestamp IS NOT NULL
            THEN EXTRACT(EPOCH FROM (cv.event_timestamp - c.event_timestamp))
            ELSE NULL 
        END AS click_to_conversion_seconds,
        
        CASE 
            WHEN cv.event_timestamp IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (cv.event_timestamp - s.event_timestamp))
            ELSE NULL 
        END AS search_to_conversion_seconds
        
    FROM searches s
    LEFT JOIN clicks c ON s.event_id = c.search_event_id
    LEFT JOIN conversions cv ON c.event_id = cv.click_event_id
)

SELECT
    -- IDs
    search_event_id,
    click_event_id,
    conversion_event_id,
    user_id,
    session_id,
    
    -- Search context
    search_timestamp,
    search_query,
    search_results_count,
    platform,
    device_type,
    geo_country,
    utm_source,
    utm_campaign,
    
    -- Click context
    click_timestamp,
    result_position,
    result_type,
    result_price,
    result_destination,
    result_provider,
    
    -- Conversion context
    conversion_timestamp,
    booking_value,
    commission,
    converted_product_type,
    
    -- Time metrics (converted to minutes for readability)
    ROUND(search_to_click_seconds / 60.0, 2) AS search_to_click_minutes,
    ROUND(click_to_conversion_seconds / 60.0, 2) AS click_to_conversion_minutes,
    ROUND(search_to_conversion_seconds / 60.0, 2) AS search_to_conversion_minutes,
    
    -- Journey stage classification
    CASE
        WHEN conversion_event_id IS NOT NULL THEN 'converted'
        WHEN click_event_id IS NOT NULL THEN 'clicked'
        ELSE 'searched_only'
    END AS journey_stage,
    
    -- Conversion flag for easy filtering
    CASE WHEN conversion_event_id IS NOT NULL THEN 1 ELSE 0 END AS is_converted,
    
    -- Attribution: revenue attributed to this search
    COALESCE(booking_value, 0) AS attributed_revenue,
    COALESCE(commission, 0) AS attributed_commission

FROM journeys
