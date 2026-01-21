-- SearchFlow Database Initialization
-- Run this script to set up all required databases
-- Execute with: docker exec searchflow-postgres psql -U airflow -f /scripts/init_databases.sql

-- Create Metabase database (for Metabase metadata)
SELECT 'Creating metabase database...' AS status;
CREATE DATABASE metabase;

-- Create SearchFlow database (for application data)
SELECT 'Creating searchflow database...' AS status;
CREATE DATABASE searchflow;

-- Create searchflow user
SELECT 'Creating searchflow user...' AS status;
CREATE USER searchflow WITH PASSWORD 'searchflow123';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE searchflow TO searchflow;

SELECT 'Database initialization complete!' AS status;
