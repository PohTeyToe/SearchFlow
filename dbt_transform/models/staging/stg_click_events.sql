{{
    config(
        materialized='view'
    )
}}

/*
    Staging model for click events.
    
    Transformations:
    - Extract fields from JSON payload
    - Type casting
    - Deduplication by event_id
*/

WITH source AS (
    SELECT * FROM {{ source('raw', 'click_events') }}
),

extracted AS (
    SELECT
        event_id,
        
        -- Extract and cast fields from JSON payload (DuckDB syntax)
        json_extract_string(payload, '$.event_type') AS event_type,
        CAST(json_extract_string(payload, '$.timestamp') AS TIMESTAMP) AS event_timestamp,
        json_extract_string(payload, '$.user_id') AS user_id,
        json_extract_string(payload, '$.session_id') AS session_id,
        
        -- Link to search
        json_extract_string(payload, '$.search_event_id') AS search_event_id,
        
        -- Click details
        CAST(json_extract_string(payload, '$.result_position') AS INTEGER) AS result_position,
        json_extract_string(payload, '$.result_id') AS result_id,
        json_extract_string(payload, '$.result_type') AS result_type,
        CAST(json_extract_string(payload, '$.result_price') AS DECIMAL(10,2)) AS result_price,
        json_extract_string(payload, '$.result_provider') AS result_provider,
        json_extract_string(payload, '$.result_destination') AS result_destination,
        
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
    search_event_id,
    result_position,
    result_id,
    result_type,
    result_price,
    result_provider,
    result_destination,
    ingested_at
FROM extracted
WHERE row_num = 1
