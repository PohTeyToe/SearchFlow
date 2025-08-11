{{
    config(
        materialized='view'
    )
}}

/*
    Staging model for conversion/booking events.
    
    Transformations:
    - Extract fields from JSON payload
    - Type casting
    - Deduplication by event_id
*/

WITH source AS (
    SELECT * FROM {{ source('raw', 'conversion_events') }}
),

extracted AS (
    SELECT
        event_id,
        
        -- Extract and cast fields from JSON payload (DuckDB syntax)
        json_extract_string(payload, '$.event_type') AS event_type,
        CAST(json_extract_string(payload, '$.timestamp') AS TIMESTAMP) AS event_timestamp,
        json_extract_string(payload, '$.user_id') AS user_id,
        json_extract_string(payload, '$.session_id') AS session_id,
        
        -- Link to click
        json_extract_string(payload, '$.click_event_id') AS click_event_id,
        
        -- Booking details
        CAST(json_extract_string(payload, '$.booking_value') AS DECIMAL(10,2)) AS booking_value,
        CAST(json_extract_string(payload, '$.commission') AS DECIMAL(10,2)) AS commission,
        json_extract_string(payload, '$.currency') AS currency,
        json_extract_string(payload, '$.product_type') AS product_type,
        json_extract_string(payload, '$.provider') AS provider,
        
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
    click_event_id,
    booking_value,
    commission,
    currency,
    product_type,
    provider,
    ingested_at
FROM extracted
WHERE row_num = 1
