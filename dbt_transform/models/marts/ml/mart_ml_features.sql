{{
    config(
        materialized='table',
        schema='ml'
    )
}}

/*
    ML Feature Mart — Hotel Booking Churn Features

    Computes the same 14 features as Python's engineer_features().
    Encoding maps MUST match ml_engine/src/models/churn.py exactly.

    Source: hotel_bookings.csv loaded as DuckDB table.
*/

with source as (
    select * from {{ source('hotel_bookings', 'hotel_bookings') }}
),

filtered as (
    -- Exclude rows where total guests = 0 (data quality issue)
    select *
    from source
    where (adults + COALESCE(children, 0) + babies) > 0
),

features as (
    select
        -- Row identifier
        row_number() over (order by (select null)) as booking_id,

        -- Direct passthrough features
        lead_time,
        (stays_in_weekend_nights + stays_in_week_nights) as total_stay_nights,
        adr,
        is_repeated_guest,
        previous_cancellations,
        previous_bookings_not_canceled,
        booking_changes,
        total_of_special_requests,
        days_in_waiting_list,

        -- Guest total (handle nulls in children column)
        (adults + COALESCE(children, 0) + babies)::BIGINT as guests_total,

        -- Deposit type encoding (must match Python DEPOSIT_TYPE_MAP)
        CASE deposit_type
            WHEN 'No Deposit' THEN 0
            WHEN 'Non Refund' THEN 1
            WHEN 'Refundable' THEN 2
            ELSE 0
        END as deposit_type_encoded,

        -- Market segment encoding (alphabetical ordinal, must match Python MARKET_SEGMENT_MAP)
        CASE market_segment
            WHEN 'Aviation' THEN 0
            WHEN 'Complementary' THEN 1
            WHEN 'Corporate' THEN 2
            WHEN 'Direct' THEN 3
            WHEN 'Groups' THEN 4
            WHEN 'Offline TA/TO' THEN 5
            WHEN 'Online TA' THEN 6
            WHEN 'Undefined' THEN 7
            ELSE 0
        END as market_segment_encoded,

        -- Customer type encoding (alphabetical ordinal, must match Python CUSTOMER_TYPE_MAP)
        CASE customer_type
            WHEN 'Contract' THEN 0
            WHEN 'Group' THEN 1
            WHEN 'Transient' THEN 2
            WHEN 'Transient-Party' THEN 3
            ELSE 0
        END as customer_type_encoded,

        -- Weekend stay ratio (handle division by zero)
        CASE
            WHEN (stays_in_weekend_nights + stays_in_week_nights) = 0 THEN 0.0
            ELSE stays_in_weekend_nights::DOUBLE / (stays_in_weekend_nights + stays_in_week_nights)::DOUBLE
        END as weekend_stay_ratio,

        -- Target variable
        is_canceled

    from filtered
)

select * from features
