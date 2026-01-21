-- SearchFlow Database Initialization
-- Run this to set up the warehouse schema

-- ============================================
-- ADDITIONAL DATABASES (for fresh deployments)
-- Note: This runs in the 'airflow' database context.
-- Create additional databases via separate script or manually:
--   CREATE DATABASE metabase;
--   CREATE DATABASE searchflow;
--   CREATE USER searchflow WITH PASSWORD 'searchflow123';
--   GRANT ALL PRIVILEGES ON DATABASE searchflow TO searchflow;
-- ============================================

-- ============================================
-- SCHEMAS
-- ============================================

CREATE SCHEMA IF NOT EXISTS raw;
CREATE SCHEMA IF NOT EXISTS staging;
CREATE SCHEMA IF NOT EXISTS intermediate;
CREATE SCHEMA IF NOT EXISTS analytics;
CREATE SCHEMA IF NOT EXISTS marketing;

-- ============================================
-- RAW TABLES (Append-Only Event Storage)
-- ============================================

CREATE TABLE IF NOT EXISTS raw.search_events (
    event_id        VARCHAR(36) PRIMARY KEY,
    payload         JSON NOT NULL,
    ingested_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    source_file     VARCHAR(255),
    batch_id        VARCHAR(36)
);

CREATE TABLE IF NOT EXISTS raw.click_events (
    event_id        VARCHAR(36) PRIMARY KEY,
    payload         JSON NOT NULL,
    ingested_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    source_file     VARCHAR(255),
    batch_id        VARCHAR(36)
);

CREATE TABLE IF NOT EXISTS raw.conversion_events (
    event_id        VARCHAR(36) PRIMARY KEY,
    payload         JSON NOT NULL,
    ingested_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    source_file     VARCHAR(255),
    batch_id        VARCHAR(36)
);

-- Indexes for incremental processing
CREATE INDEX IF NOT EXISTS idx_raw_search_ingested ON raw.search_events(ingested_at);
CREATE INDEX IF NOT EXISTS idx_raw_click_ingested ON raw.click_events(ingested_at);
CREATE INDEX IF NOT EXISTS idx_raw_conversion_ingested ON raw.conversion_events(ingested_at);

-- ============================================
-- CRM SIMULATION TABLES (Reverse-ETL Destinations)
-- ============================================

CREATE TABLE IF NOT EXISTS public.crm_user_segments (
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
    previous_segment    VARCHAR(50),
    segment_changed_at  TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_crm_segment ON public.crm_user_segments(segment);
CREATE INDEX IF NOT EXISTS idx_crm_synced ON public.crm_user_segments(synced_at);

-- ============================================
-- EMAIL QUEUE (Reverse-ETL Destination)
-- ============================================

CREATE TABLE IF NOT EXISTS public.email_queue (
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

CREATE INDEX IF NOT EXISTS idx_email_status ON public.email_queue(status, priority);

-- ============================================
-- PIPELINE METADATA
-- ============================================

CREATE TABLE IF NOT EXISTS public.pipeline_runs (
    run_id              VARCHAR(36) PRIMARY KEY,
    dag_id              VARCHAR(100) NOT NULL,
    run_type            VARCHAR(50),
    started_at          TIMESTAMP NOT NULL,
    completed_at        TIMESTAMP,
    status              VARCHAR(20),
    rows_processed      INTEGER,
    error_message       TEXT
);

CREATE TABLE IF NOT EXISTS public.sync_log (
    sync_id             VARCHAR(36) PRIMARY KEY,
    sync_type           VARCHAR(100) NOT NULL,
    source_table        VARCHAR(100),
    destination         VARCHAR(100),
    started_at          TIMESTAMP NOT NULL,
    completed_at        TIMESTAMP,
    rows_extracted      INTEGER,
    rows_upserted       INTEGER,
    rows_unchanged      INTEGER,
    error_message       TEXT
);

-- ============================================
-- GRANT PERMISSIONS (for multi-user setup)
-- ============================================

-- Grant usage on schemas
GRANT USAGE ON SCHEMA raw TO PUBLIC;
GRANT USAGE ON SCHEMA staging TO PUBLIC;
GRANT USAGE ON SCHEMA intermediate TO PUBLIC;
GRANT USAGE ON SCHEMA analytics TO PUBLIC;
GRANT USAGE ON SCHEMA marketing TO PUBLIC;

-- Grant SELECT on all tables
GRANT SELECT ON ALL TABLES IN SCHEMA raw TO PUBLIC;
GRANT SELECT ON ALL TABLES IN SCHEMA staging TO PUBLIC;
GRANT SELECT ON ALL TABLES IN SCHEMA intermediate TO PUBLIC;
GRANT SELECT ON ALL TABLES IN SCHEMA analytics TO PUBLIC;
GRANT SELECT ON ALL TABLES IN SCHEMA marketing TO PUBLIC;
