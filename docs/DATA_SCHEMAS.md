# Data Schemas & Models

This document defines all data schemas used in SearchFlow.

---

## 1. Event Schemas (Source)

### SearchEvent

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "SearchEvent",
  "type": "object",
  "required": ["event_id", "event_type", "timestamp", "session_id", "query"],
  "properties": {
    "event_id": {
      "type": "string",
      "format": "uuid",
      "description": "Unique identifier for this event"
    },
    "event_type": {
      "type": "string",
      "const": "search"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 timestamp when event occurred"
    },
    "user_id": {
      "type": ["string", "null"],
      "description": "User ID if logged in, null for anonymous"
    },
    "session_id": {
      "type": "string",
      "description": "Session identifier for grouping events"
    },
    "query": {
      "type": "string",
      "description": "Search query text",
      "examples": ["cheap flights to miami", "hotels in toronto"]
    },
    "filters": {
      "type": "object",
      "properties": {
        "price_min": { "type": "number" },
        "price_max": { "type": "number" },
        "dates": { 
          "type": "array",
          "items": { "type": "string", "format": "date" }
        },
        "travelers": { "type": "integer" }
      }
    },
    "results_count": {
      "type": "integer",
      "description": "Number of results returned"
    },
    "page": {
      "type": "integer",
      "default": 1,
      "description": "Results page number"
    },
    "platform": {
      "type": "string",
      "enum": ["web", "ios", "android"],
      "description": "Platform where search was performed"
    },
    "device_type": {
      "type": "string",
      "enum": ["desktop", "mobile", "tablet"]
    },
    "geo": {
      "type": "object",
      "properties": {
        "country": { "type": "string", "minLength": 2, "maxLength": 2 },
        "city": { "type": "string" },
        "latitude": { "type": "number" },
        "longitude": { "type": "number" }
      }
    },
    "utm_source": {
      "type": ["string", "null"],
      "description": "Marketing attribution source"
    },
    "utm_medium": {
      "type": ["string", "null"]
    },
    "utm_campaign": {
      "type": ["string", "null"]
    }
  }
}
```

### ClickEvent

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "ClickEvent",
  "type": "object",
  "required": ["event_id", "event_type", "timestamp", "session_id", "search_event_id", "result_id"],
  "properties": {
    "event_id": {
      "type": "string",
      "format": "uuid"
    },
    "event_type": {
      "type": "string",
      "const": "click"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    },
    "user_id": {
      "type": ["string", "null"]
    },
    "session_id": {
      "type": "string"
    },
    "search_event_id": {
      "type": "string",
      "format": "uuid",
      "description": "Links to the search that produced this click"
    },
    "result_position": {
      "type": "integer",
      "minimum": 1,
      "description": "Position in search results (1-indexed)"
    },
    "result_id": {
      "type": "string",
      "description": "ID of the clicked result (deal, flight, hotel)"
    },
    "result_type": {
      "type": "string",
      "enum": ["flight", "hotel", "car", "package"]
    },
    "result_price": {
      "type": "number",
      "description": "Price displayed at time of click"
    },
    "result_provider": {
      "type": "string",
      "description": "Provider/vendor of the result",
      "examples": ["expedia", "booking", "kayak"]
    },
    "result_destination": {
      "type": "string",
      "description": "Destination of the result",
      "examples": ["Miami", "Toronto", "NYC"]
    }
  }
}
```

### ConversionEvent

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "ConversionEvent",
  "type": "object",
  "required": ["event_id", "event_type", "timestamp", "session_id", "click_event_id", "booking_value"],
  "properties": {
    "event_id": {
      "type": "string",
      "format": "uuid"
    },
    "event_type": {
      "type": "string",
      "const": "conversion"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    },
    "user_id": {
      "type": ["string", "null"]
    },
    "session_id": {
      "type": "string"
    },
    "click_event_id": {
      "type": "string",
      "format": "uuid",
      "description": "Links to the click that led to this conversion"
    },
    "booking_value": {
      "type": "number",
      "description": "Total booking value"
    },
    "commission": {
      "type": "number",
      "description": "Commission earned on this booking"
    },
    "currency": {
      "type": "string",
      "default": "CAD",
      "minLength": 3,
      "maxLength": 3
    },
    "product_type": {
      "type": "string",
      "enum": ["flight", "hotel", "car", "package"]
    },
    "provider": {
      "type": "string"
    }
  }
}
```

---

## 2. Raw Tables (Warehouse)

### raw_search_events

```sql
CREATE TABLE raw_search_events (
    event_id        VARCHAR(36) PRIMARY KEY,
    payload         JSON NOT NULL,           -- Full event JSON
    ingested_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    source_file     VARCHAR(255),            -- For batch loads
    batch_id        VARCHAR(36)              -- For tracking
);

-- Index for incremental processing
CREATE INDEX idx_raw_search_ingested ON raw_search_events(ingested_at);
```

### raw_click_events

```sql
CREATE TABLE raw_click_events (
    event_id        VARCHAR(36) PRIMARY KEY,
    payload         JSON NOT NULL,
    ingested_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    source_file     VARCHAR(255),
    batch_id        VARCHAR(36)
);

CREATE INDEX idx_raw_click_ingested ON raw_click_events(ingested_at);
```

### raw_conversion_events

```sql
CREATE TABLE raw_conversion_events (
    event_id        VARCHAR(36) PRIMARY KEY,
    payload         JSON NOT NULL,
    ingested_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    source_file     VARCHAR(255),
    batch_id        VARCHAR(36)
);

CREATE INDEX idx_raw_conversion_ingested ON raw_conversion_events(ingested_at);
```

---

## 3. Staging Models (dbt)

### stg_search_events

```sql
-- models/staging/stg_search_events.sql

{{
    config(
        materialized='view'
    )
}}

WITH source AS (
    SELECT * FROM {{ source('raw', 'raw_search_events') }}
),

extracted AS (
    SELECT
        event_id,
        payload->>'event_type' AS event_type,
        CAST(payload->>'timestamp' AS TIMESTAMP) AS event_timestamp,
        payload->>'user_id' AS user_id,
        payload->>'session_id' AS session_id,
        LOWER(TRIM(payload->>'query')) AS search_query,
        CAST(payload->>'results_count' AS INTEGER) AS results_count,
        CAST(payload->>'page' AS INTEGER) AS page_number,
        payload->>'platform' AS platform,
        payload->>'device_type' AS device_type,
        payload->'geo'->>'country' AS geo_country,
        payload->'geo'->>'city' AS geo_city,
        payload->>'utm_source' AS utm_source,
        payload->>'utm_medium' AS utm_medium,
        payload->>'utm_campaign' AS utm_campaign,
        ingested_at,
        -- Deduplication
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
```

### stg_click_events

```sql
-- models/staging/stg_click_events.sql

{{
    config(
        materialized='view'
    )
}}

WITH source AS (
    SELECT * FROM {{ source('raw', 'raw_click_events') }}
),

extracted AS (
    SELECT
        event_id,
        payload->>'event_type' AS event_type,
        CAST(payload->>'timestamp' AS TIMESTAMP) AS event_timestamp,
        payload->>'user_id' AS user_id,
        payload->>'session_id' AS session_id,
        payload->>'search_event_id' AS search_event_id,
        CAST(payload->>'result_position' AS INTEGER) AS result_position,
        payload->>'result_id' AS result_id,
        payload->>'result_type' AS result_type,
        CAST(payload->>'result_price' AS DECIMAL(10,2)) AS result_price,
        payload->>'result_provider' AS result_provider,
        payload->>'result_destination' AS result_destination,
        ingested_at,
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
```

### stg_conversion_events

```sql
-- models/staging/stg_conversion_events.sql

{{
    config(
        materialized='view'
    )
}}

WITH source AS (
    SELECT * FROM {{ source('raw', 'raw_conversion_events') }}
),

extracted AS (
    SELECT
        event_id,
        payload->>'event_type' AS event_type,
        CAST(payload->>'timestamp' AS TIMESTAMP) AS event_timestamp,
        payload->>'user_id' AS user_id,
        payload->>'session_id' AS session_id,
        payload->>'click_event_id' AS click_event_id,
        CAST(payload->>'booking_value' AS DECIMAL(10,2)) AS booking_value,
        CAST(payload->>'commission' AS DECIMAL(10,2)) AS commission,
        payload->>'currency' AS currency,
        payload->>'product_type' AS product_type,
        payload->>'provider' AS provider,
        ingested_at,
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
```

---

## 4. Intermediate Models (dbt)

### int_search_sessions

```sql
-- models/intermediate/int_search_sessions.sql

{{
    config(
        materialized='view'
    )
}}

/*
    Sessionize events using 30-minute timeout.
    Calculate session-level metrics.
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

session_searches AS (
    SELECT
        session_id,
        MIN(event_timestamp) AS session_start,
        MAX(event_timestamp) AS session_end,
        COUNT(*) AS search_count,
        COUNT(DISTINCT search_query) AS unique_queries,
        MAX(user_id) AS user_id,  -- Take non-null if exists
        MAX(platform) AS platform,
        MAX(device_type) AS device_type,
        MAX(geo_country) AS geo_country,
        MAX(utm_source) AS utm_source,
        MAX(utm_campaign) AS utm_campaign
    FROM searches
    GROUP BY session_id
),

session_clicks AS (
    SELECT
        session_id,
        COUNT(*) AS click_count,
        AVG(result_position) AS avg_click_position,
        SUM(result_price) AS total_clicked_value
    FROM clicks
    GROUP BY session_id
),

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
    EXTRACT(EPOCH FROM (ss.session_end - ss.session_start)) / 60 AS session_duration_minutes,
    ss.search_count,
    ss.unique_queries,
    COALESCE(sc.click_count, 0) AS click_count,
    COALESCE(sc.avg_click_position, 0) AS avg_click_position,
    COALESCE(scv.conversion_count, 0) AS conversion_count,
    COALESCE(scv.total_booking_value, 0) AS total_booking_value,
    COALESCE(scv.total_commission, 0) AS total_commission,
    ss.platform,
    ss.device_type,
    ss.geo_country,
    ss.utm_source,
    ss.utm_campaign,
    -- Derived metrics
    CASE 
        WHEN ss.search_count > 0 THEN COALESCE(sc.click_count, 0)::FLOAT / ss.search_count 
        ELSE 0 
    END AS session_ctr,
    CASE 
        WHEN COALESCE(sc.click_count, 0) > 0 THEN COALESCE(scv.conversion_count, 0)::FLOAT / sc.click_count 
        ELSE 0 
    END AS session_conversion_rate,
    -- Session outcome
    CASE
        WHEN COALESCE(scv.conversion_count, 0) > 0 THEN 'converted'
        WHEN COALESCE(sc.click_count, 0) > 0 THEN 'engaged'
        ELSE 'bounced'
    END AS session_outcome
FROM session_searches ss
LEFT JOIN session_clicks sc ON ss.session_id = sc.session_id
LEFT JOIN session_conversions scv ON ss.session_id = scv.session_id
```

### int_user_journeys

```sql
-- models/intermediate/int_user_journeys.sql

{{
    config(
        materialized='view'
    )
}}

/*
    Track user journey from search to conversion.
    Used for attribution modeling.
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
        s.event_id AS search_event_id,
        s.event_timestamp AS search_timestamp,
        s.user_id,
        s.session_id,
        s.search_query,
        s.utm_source,
        s.utm_campaign,
        c.event_id AS click_event_id,
        c.event_timestamp AS click_timestamp,
        c.result_position,
        c.result_type,
        c.result_price,
        c.result_destination,
        cv.event_id AS conversion_event_id,
        cv.event_timestamp AS conversion_timestamp,
        cv.booking_value,
        cv.commission,
        -- Time deltas
        EXTRACT(EPOCH FROM (c.event_timestamp - s.event_timestamp)) AS search_to_click_seconds,
        EXTRACT(EPOCH FROM (cv.event_timestamp - c.event_timestamp)) AS click_to_conversion_seconds
    FROM searches s
    LEFT JOIN clicks c ON s.event_id = c.search_event_id
    LEFT JOIN conversions cv ON c.event_id = cv.click_event_id
)

SELECT
    search_event_id,
    search_timestamp,
    user_id,
    session_id,
    search_query,
    utm_source,
    utm_campaign,
    click_event_id,
    click_timestamp,
    result_position,
    result_type,
    result_price,
    result_destination,
    conversion_event_id,
    conversion_timestamp,
    booking_value,
    commission,
    search_to_click_seconds,
    click_to_conversion_seconds,
    -- Journey stage
    CASE
        WHEN conversion_event_id IS NOT NULL THEN 'converted'
        WHEN click_event_id IS NOT NULL THEN 'clicked'
        ELSE 'searched_only'
    END AS journey_stage
FROM journeys
```

---

## 5. Mart Models (dbt)

### fct_search_funnel

```sql
-- models/marts/analytics/fct_search_funnel.sql

{{
    config(
        materialized='incremental',
        unique_key='funnel_date'
    )
}}

/*
    Daily funnel metrics aggregated by dimensions.
    This is the primary analytics fact table.
*/

WITH sessions AS (
    SELECT * FROM {{ ref('int_search_sessions') }}
    {% if is_incremental() %}
    WHERE session_start >= (SELECT MAX(funnel_date) FROM {{ this }}) - INTERVAL '1 day'
    {% endif %}
)

SELECT
    DATE(session_start) AS funnel_date,
    platform,
    device_type,
    geo_country,
    utm_source,
    utm_campaign,
    -- Funnel counts
    COUNT(DISTINCT session_id) AS total_sessions,
    SUM(search_count) AS total_searches,
    SUM(click_count) AS total_clicks,
    SUM(conversion_count) AS total_conversions,
    -- Revenue
    SUM(total_booking_value) AS total_revenue,
    SUM(total_commission) AS total_commission,
    -- Rates
    CASE 
        WHEN SUM(search_count) > 0 
        THEN SUM(click_count)::FLOAT / SUM(search_count) 
        ELSE 0 
    END AS click_through_rate,
    CASE 
        WHEN SUM(click_count) > 0 
        THEN SUM(conversion_count)::FLOAT / SUM(click_count) 
        ELSE 0 
    END AS conversion_rate,
    -- Averages
    AVG(session_duration_minutes) AS avg_session_duration,
    AVG(avg_click_position) AS avg_click_position,
    CASE 
        WHEN SUM(conversion_count) > 0 
        THEN SUM(total_booking_value) / SUM(conversion_count) 
        ELSE 0 
    END AS avg_order_value
FROM sessions
GROUP BY 1, 2, 3, 4, 5, 6
```

### dim_users

```sql
-- models/marts/analytics/dim_users.sql

{{
    config(
        materialized='table'
    )
}}

/*
    User dimension with lifetime metrics.
    Used for segmentation and LTV analysis.
*/

WITH sessions AS (
    SELECT * FROM {{ ref('int_search_sessions') }}
    WHERE user_id IS NOT NULL
),

user_metrics AS (
    SELECT
        user_id,
        MIN(session_start) AS first_seen_at,
        MAX(session_end) AS last_seen_at,
        COUNT(DISTINCT session_id) AS total_sessions,
        SUM(search_count) AS lifetime_searches,
        SUM(click_count) AS lifetime_clicks,
        SUM(conversion_count) AS lifetime_conversions,
        SUM(total_booking_value) AS lifetime_revenue,
        SUM(total_commission) AS lifetime_commission,
        -- Most common values
        MODE() WITHIN GROUP (ORDER BY platform) AS primary_platform,
        MODE() WITHIN GROUP (ORDER BY device_type) AS primary_device,
        MODE() WITHIN GROUP (ORDER BY geo_country) AS primary_country,
        -- Engagement
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
    CURRENT_TIMESTAMP - last_seen_at AS days_since_last_seen,
    total_sessions,
    lifetime_searches,
    lifetime_clicks,
    lifetime_conversions,
    lifetime_revenue,
    lifetime_commission,
    primary_platform,
    primary_device,
    primary_country,
    avg_session_duration,
    avg_ctr,
    avg_conversion_rate,
    -- Calculated metrics
    CASE 
        WHEN lifetime_searches > 0 
        THEN lifetime_clicks::FLOAT / lifetime_searches 
        ELSE 0 
    END AS lifetime_ctr,
    CASE 
        WHEN lifetime_clicks > 0 
        THEN lifetime_conversions::FLOAT / lifetime_clicks 
        ELSE 0 
    END AS lifetime_conversion_rate,
    CASE 
        WHEN total_sessions > 0 
        THEN lifetime_revenue / total_sessions 
        ELSE 0 
    END AS revenue_per_session
FROM user_metrics
```

### mart_user_segments (FOR REVERSE-ETL)

```sql
-- models/marts/marketing/mart_user_segments.sql

{{
    config(
        materialized='table'
    )
}}

/*
    User segmentation for marketing automation.
    This is synced to CRM via Reverse-ETL.
    
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

recent_searches AS (
    SELECT DISTINCT user_id
    FROM {{ ref('stg_search_events') }}
    WHERE event_timestamp >= CURRENT_TIMESTAMP - INTERVAL '48 hours'
      AND user_id IS NOT NULL
),

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
        -- Determine segment (priority order)
        CASE
            WHEN u.lifetime_revenue > 500 OR u.lifetime_conversions >= 5 
                THEN 'high_value'
            WHEN u.first_seen_at >= CURRENT_TIMESTAMP - INTERVAL '7 days' 
                THEN 'new_user'
            WHEN EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - u.last_seen_at)) / 86400 > 30 
                 AND u.lifetime_conversions > 0
                THEN 'at_risk'
            WHEN rs.user_id IS NOT NULL AND rc.user_id IS NULL
                THEN 'abandoned_search'
            ELSE 'regular'
        END AS segment,
        -- Engagement score (0-100)
        LEAST(100, (
            (CASE WHEN u.lifetime_conversions > 0 THEN 30 ELSE 0 END) +
            (LEAST(u.total_sessions, 10) * 3) +
            (CASE WHEN u.avg_ctr > 0.3 THEN 20 ELSE u.avg_ctr * 60 END) +
            (CASE WHEN EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - u.last_seen_at)) / 86400 < 7 THEN 20 ELSE 0 END)
        )) AS engagement_score,
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
    primary_platform,
    primary_country,
    segmented_at
FROM segmented
```

### mart_recommendations (FOR REVERSE-ETL)

```sql
-- models/marts/marketing/mart_recommendations.sql

{{
    config(
        materialized='table'
    )
}}

/*
    Simple collaborative filtering for recommendations.
    Based on: "Users who searched for X also booked Y"
    
    This is synced to Redis for real-time search personalization.
*/

WITH user_destinations AS (
    -- Get destinations users have shown interest in (clicked or converted)
    SELECT DISTINCT
        c.user_id,
        c.result_destination AS destination,
        CASE WHEN cv.event_id IS NOT NULL THEN 1.0 ELSE 0.5 END AS signal_strength
    FROM {{ ref('stg_click_events') }} c
    LEFT JOIN {{ ref('stg_conversion_events') }} cv ON c.event_id = cv.click_event_id
    WHERE c.user_id IS NOT NULL
      AND c.result_destination IS NOT NULL
),

-- Find similar users (share at least 2 destinations)
user_similarity AS (
    SELECT
        a.user_id AS user_a,
        b.user_id AS user_b,
        COUNT(DISTINCT a.destination) AS shared_destinations
    FROM user_destinations a
    JOIN user_destinations b 
        ON a.destination = b.destination 
        AND a.user_id != b.user_id
    GROUP BY a.user_id, b.user_id
    HAVING COUNT(DISTINCT a.destination) >= 2
),

-- Get destinations that similar users liked but target user hasn't seen
recommendations AS (
    SELECT
        us.user_a AS user_id,
        ud.destination,
        SUM(us.shared_destinations * ud.signal_strength) AS score,
        COUNT(DISTINCT us.user_b) AS recommenders
    FROM user_similarity us
    JOIN user_destinations ud ON us.user_b = ud.user_id
    WHERE NOT EXISTS (
        SELECT 1 FROM user_destinations existing
        WHERE existing.user_id = us.user_a 
          AND existing.destination = ud.destination
    )
    GROUP BY us.user_a, ud.destination
)

SELECT
    user_id,
    destination AS recommended_destination,
    score AS recommendation_score,
    recommenders AS supporting_users,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY score DESC) AS rank,
    CURRENT_TIMESTAMP AS generated_at
FROM recommendations
WHERE score > 1  -- Minimum threshold
QUALIFY rank <= 10  -- Top 10 recommendations per user
```

---

## 6. Operational Tables (Reverse-ETL Destinations)

### crm_user_segments

```sql
-- Destination for Reverse-ETL user segment sync
CREATE TABLE crm_user_segments (
    user_id             VARCHAR(36) PRIMARY KEY,
    segment             VARCHAR(50) NOT NULL,
    engagement_score    INTEGER,
    lifetime_revenue    DECIMAL(12,2),
    lifetime_conversions INTEGER,
    primary_platform    VARCHAR(20),
    primary_country     VARCHAR(2),
    first_seen_at       TIMESTAMP,
    last_seen_at        TIMESTAMP,
    synced_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- For tracking changes
    previous_segment    VARCHAR(50),
    segment_changed_at  TIMESTAMP
);

CREATE INDEX idx_crm_segment ON crm_user_segments(segment);
CREATE INDEX idx_crm_synced ON crm_user_segments(synced_at);
```

### email_queue

```sql
-- Queue for email triggers (simulated, would be Redis in production)
CREATE TABLE email_queue (
    id                  SERIAL PRIMARY KEY,
    user_id             VARCHAR(36) NOT NULL,
    email_template      VARCHAR(100) NOT NULL,
    payload             JSON NOT NULL,
    priority            INTEGER DEFAULT 5,
    status              VARCHAR(20) DEFAULT 'pending',
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at        TIMESTAMP,
    
    CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'sent', 'failed'))
);

CREATE INDEX idx_email_status ON email_queue(status, priority);
```

---

## 7. Test Definitions

### Schema Tests (`_schema.yml`)

```yaml
version: 2

sources:
  - name: raw
    database: searchflow
    schema: raw
    tables:
      - name: raw_search_events
        columns:
          - name: event_id
            tests:
              - unique
              - not_null
          - name: payload
            tests:
              - not_null
        freshness:
          warn_after: {count: 1, period: hour}
          error_after: {count: 6, period: hour}

models:
  - name: stg_search_events
    columns:
      - name: event_id
        tests:
          - unique
          - not_null
      - name: event_timestamp
        tests:
          - not_null
      - name: session_id
        tests:
          - not_null
      - name: platform
        tests:
          - accepted_values:
              values: ['web', 'ios', 'android']

  - name: fct_search_funnel
    tests:
      - dbt_utils.expression_is_true:
          expression: "total_clicks <= total_searches"
      - dbt_utils.expression_is_true:
          expression: "total_conversions <= total_clicks"
      - dbt_utils.expression_is_true:
          expression: "click_through_rate >= 0 AND click_through_rate <= 1"
      - dbt_utils.expression_is_true:
          expression: "conversion_rate >= 0 AND conversion_rate <= 1"

  - name: mart_user_segments
    columns:
      - name: user_id
        tests:
          - unique
          - not_null
      - name: segment
        tests:
          - not_null
          - accepted_values:
              values: ['high_value', 'at_risk', 'abandoned_search', 'new_user', 'regular']
      - name: engagement_score
        tests:
          - dbt_utils.expression_is_true:
              expression: "engagement_score >= 0 AND engagement_score <= 100"
```
