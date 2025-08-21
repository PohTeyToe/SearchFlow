{{
    config(
        materialized='view'
    )
}}

/*
    Staging model for search events.
    
    Transformations:
    - Extract fields from JSON payload
    - Type casting
    - Deduplication by event_id
    - Lowercase and trim search queries
*/

WITH source AS (
    SELECT * FROM {{ source('raw', 'search_events') }}
),

extracted AS (
    SELECT
        event_id,
        
        -- Extract and cast fields from JSON payload (DuckDB syntax)
        json_extract_string(payload, '$.event_type') AS event_type,
        CAST(json_extract_string(payload, '$.timestamp') AS TIMESTAMP) AS event_timestamp,
        json_extract_string(payload, '$.user_id') AS user_id,
        json_extract_string(payload, '$.session_id') AS session_id,
        
        -- Clean search query
        LOWER(TRIM(json_extract_string(payload, '$.query'))) AS search_query,
        
        -- Numeric fields
        CAST(json_extract_string(payload, '$.results_count') AS INTEGER) AS results_count,
        CAST(json_extract_string(payload, '$.page') AS INTEGER) AS page_number,
        
        -- Categorical fields
        json_extract_string(payload, '$.platform') AS platform,
        json_extract_string(payload, '$.device_type') AS device_type,
        
        -- Geo fields (nested JSON)
        json_extract_string(payload, '$.geo.country') AS geo_country,
        json_extract_string(payload, '$.geo.city') AS geo_city,
        
        -- Marketing attribution
        json_extract_string(payload, '$.utm_source') AS utm_source,
        json_extract_string(payload, '$.utm_medium') AS utm_medium,
        json_extract_string(payload, '$.utm_campaign') AS utm_campaign,
        
        -- Metadata
        ingested_at,
        
        -- Deduplication: keep most recent version of each event
        ROW_NUMBER() OVER (
            PARTITION BY event_id 
            ORDER BY ingested_at DESC
        ) AS row_num
        
    FROM source
)

SELECT
    event_id,
    event_type,
    event_timestamp,
    user_id,
    session_id,
    search_query,
    results_count,
    page_number,
    platform,
    device_type,
    geo_country,
    geo_city,
    utm_source,
    utm_medium,
    utm_campaign,
    ingested_at
FROM extracted
WHERE row_num = 1
