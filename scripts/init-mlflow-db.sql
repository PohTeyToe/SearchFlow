-- MLflow Database Initialization
-- Runs via /docker-entrypoint-initdb.d/ on first Postgres boot

SELECT 'Creating mlflow database...' AS status;
CREATE DATABASE mlflow;
GRANT ALL PRIVILEGES ON DATABASE mlflow TO airflow;
SELECT 'MLflow database initialization complete!' AS status;
