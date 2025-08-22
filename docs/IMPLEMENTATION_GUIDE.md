# Implementation Guide

Step-by-step instructions for building SearchFlow from scratch.

---

## Phase 1: Foundation (Day 1-2)

### Step 1.1: Project Setup

```bash
# Create directory structure
mkdir -p SearchFlow/{event_generator,airflow,dbt_transform,reverse_etl,warehouse,dashboards,scripts}
mkdir -p SearchFlow/event_generator/{src,tests}
mkdir -p SearchFlow/airflow/{dags,plugins,config}
mkdir -p SearchFlow/dbt_transform/{models,seeds,macros,tests,snapshots}
mkdir -p SearchFlow/dbt_transform/models/{staging,intermediate,marts}
mkdir -p SearchFlow/dbt_transform/models/marts/{analytics,marketing}
mkdir -p SearchFlow/reverse_etl/{src,tests}
mkdir -p SearchFlow/reverse_etl/src/{syncs,destinations}

# Initialize files
touch SearchFlow/.env.example
touch SearchFlow/Makefile
touch SearchFlow/docker-compose.yml
```

### Step 1.2: Environment Variables

Create `.env.example`:
```bash
# Database
DUCKDB_PATH=/data/searchflow.duckdb
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=searchflow
POSTGRES_USER=searchflow
POSTGRES_PASSWORD=searchflow123

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# Airflow
AIRFLOW__CORE__SQL_ALCHEMY_CONN=postgresql+psycopg2://airflow:airflow@postgres:5432/airflow
AIRFLOW__CORE__EXECUTOR=LocalExecutor
AIRFLOW_UID=50000

# Event Generator
EVENTS_PER_SECOND=10
CLICK_THROUGH_RATE=0.30
CONVERSION_RATE=0.10

# dbt
DBT_PROFILES_DIR=/dbt
```

### Step 1.3: Docker Compose

Create `docker-compose.yml` with these services:
1. **postgres** - For Airflow metadata + CRM simulation
2. **redis** - Event queue + recommendations cache
3. **airflow-webserver** - UI on port 8080
4. **airflow-scheduler** - DAG execution
5. **metabase** - Dashboards on port 3000

Key configuration points:
- Mount `./airflow/dags` to `/opt/airflow/dags`
- Mount `./dbt_transform` to `/dbt`
- Mount `./data` for persistent storage
- Use `searchflow-network` for all services

### Step 1.4: Warehouse Init

Create `warehouse/init.sql`:
```sql
-- Raw tables for event ingestion
CREATE SCHEMA IF NOT EXISTS raw;
CREATE SCHEMA IF NOT EXISTS analytics;
CREATE SCHEMA IF NOT EXISTS marketing;

-- Raw event tables (see DATA_SCHEMAS.md for full definitions)
CREATE TABLE raw.search_events (...);
CREATE TABLE raw.click_events (...);
CREATE TABLE raw.conversion_events (...);

-- CRM simulation table
CREATE TABLE public.crm_user_segments (...);
CREATE TABLE public.email_queue (...);
```

---

## Phase 2: Event Generator (Day 2)

### Step 2.1: Data Models

Create `event_generator/src/models.py`:

```python
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, List, Dict
from uuid import uuid4
import json

@dataclass
class SearchEvent:
    query: str
    session_id: str
    event_id: str = field(default_factory=lambda: str(uuid4()))
    event_type: str = "search"
    timestamp: datetime = field(default_factory=datetime.utcnow)
    user_id: Optional[str] = None
    results_count: int = 0
    page: int = 1
    platform: str = "web"
    device_type: str = "desktop"
    geo_country: str = "CA"
    geo_city: str = "Toronto"
    utm_source: Optional[str] = None
    utm_campaign: Optional[str] = None
    
    def to_dict(self) -> Dict:
        return {
            "event_id": self.event_id,
            "event_type": self.event_type,
            "timestamp": self.timestamp.isoformat(),
            "user_id": self.user_id,
            "session_id": self.session_id,
            "query": self.query,
            "results_count": self.results_count,
            "page": self.page,
            "platform": self.platform,
            "device_type": self.device_type,
            "geo": {"country": self.geo_country, "city": self.geo_city},
            "utm_source": self.utm_source,
            "utm_campaign": self.utm_campaign
        }

@dataclass
class ClickEvent:
    search_event_id: str
    session_id: str
    result_id: str
    result_position: int
    result_type: str
    result_price: float
    result_destination: str
    event_id: str = field(default_factory=lambda: str(uuid4()))
    event_type: str = "click"
    timestamp: datetime = field(default_factory=datetime.utcnow)
    user_id: Optional[str] = None
    result_provider: str = "default"
    
    def to_dict(self) -> Dict:
        # Similar structure...

@dataclass
class ConversionEvent:
    click_event_id: str
    session_id: str
    booking_value: float
    commission: float
    product_type: str
    event_id: str = field(default_factory=lambda: str(uuid4()))
    event_type: str = "conversion"
    timestamp: datetime = field(default_factory=datetime.utcnow)
    user_id: Optional[str] = None
    currency: str = "CAD"
    provider: str = "default"
    
    def to_dict(self) -> Dict:
        # Similar structure...
```

### Step 2.2: Generator Logic

Create `event_generator/src/generator.py`:

```python
import random
from datetime import datetime, timedelta
from typing import Generator, Tuple, List
from .models import SearchEvent, ClickEvent, ConversionEvent
from .config import Config

class EventGenerator:
    def __init__(self, config: Config):
        self.config = config
        self.user_pool = [f"user_{i}" for i in range(config.user_pool_size)]
        self.destinations = ["Miami", "Toronto", "NYC", "LA", "Vegas", "Cancun"]
        self.queries = [
            "cheap flights to {dest}",
            "hotels in {dest}",
            "vacation packages {dest}",
            "{dest} deals"
        ]
        self.platforms = ["web", "ios", "android"]
        self.devices = ["desktop", "mobile", "tablet"]
        self.utm_sources = ["google", "facebook", "email", "direct", None]
    
    def generate_session(self) -> Generator[dict, None, None]:
        """Generate a complete user session with search, clicks, conversions."""
        session_id = str(uuid4())
        user_id = random.choice(self.user_pool) if random.random() > self.config.anonymous_rate else None
        
        # Generate 1-5 searches per session
        num_searches = random.randint(1, 5)
        
        for _ in range(num_searches):
            search = self._generate_search(session_id, user_id)
            yield search.to_dict()
            
            # Maybe generate clicks (30% CTR)
            if random.random() < self.config.click_through_rate:
                click = self._generate_click(search, session_id, user_id)
                yield click.to_dict()
                
                # Maybe generate conversion (10% of clicks)
                if random.random() < self.config.conversion_rate:
                    conversion = self._generate_conversion(click, session_id, user_id)
                    yield conversion.to_dict()
    
    def _generate_search(self, session_id: str, user_id: str) -> SearchEvent:
        dest = random.choice(self.destinations)
        query = random.choice(self.queries).format(dest=dest)
        return SearchEvent(
            query=query,
            session_id=session_id,
            user_id=user_id,
            results_count=random.randint(10, 100),
            platform=random.choice(self.platforms),
            device_type=random.choice(self.devices),
            utm_source=random.choice(self.utm_sources)
        )
    
    # Similar methods for _generate_click, _generate_conversion...
```

### Step 2.3: Publisher

Create `event_generator/src/publishers.py`:

```python
import json
import redis
from pathlib import Path
from typing import List, Dict

class RedisPublisher:
    def __init__(self, host: str, port: int):
        self.client = redis.Redis(host=host, port=port)
    
    def publish(self, event: Dict):
        stream = f"events:{event['event_type']}"
        self.client.xadd(stream, {"data": json.dumps(event)})

class FilePublisher:
    def __init__(self, output_dir: Path):
        self.output_dir = output_dir
        self.output_dir.mkdir(parents=True, exist_ok=True)
    
    def publish(self, event: Dict):
        event_type = event['event_type']
        filename = self.output_dir / f"{event_type}_events.jsonl"
        with open(filename, 'a') as f:
            f.write(json.dumps(event) + '\n')
```

---

## Phase 3: Airflow DAGs (Day 3-4)

### Step 3.1: Ingestion DAG

Create `airflow/dags/ingestion_dag.py`:

```python
from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.sensors.filesystem import FileSensor
import duckdb
import json

default_args = {
    'owner': 'searchflow',
    'depends_on_past': False,
    'email_on_failure': False,
    'retries': 3,
    'retry_delay': timedelta(minutes=5),
}

def ingest_events(event_type: str, **context):
    """Load events from JSONL files to raw tables."""
    conn = duckdb.connect('/data/searchflow.duckdb')
    
    # Read new events
    source_file = f'/data/raw/{event_type}_events.jsonl'
    
    # Load to raw table (idempotent - use INSERT OR IGNORE)
    conn.execute(f"""
        INSERT OR IGNORE INTO raw.{event_type}_events (event_id, payload, ingested_at)
        SELECT 
            json_extract_string(line, '$.event_id'),
            line::JSON,
            CURRENT_TIMESTAMP
        FROM read_json_auto('{source_file}', format='newline_delimited')
    """)
    
    row_count = conn.execute(f"SELECT changes()").fetchone()[0]
    context['task_instance'].xcom_push(key=f'{event_type}_count', value=row_count)
    conn.close()

with DAG(
    'searchflow_ingestion',
    default_args=default_args,
    description='Ingest events from sources to raw tables',
    schedule_interval='*/5 * * * *',  # Every 5 minutes
    start_date=datetime(2024, 1, 1),
    catchup=False,
    tags=['ingestion', 'searchflow'],
) as dag:
    
    ingest_searches = PythonOperator(
        task_id='ingest_search_events',
        python_callable=ingest_events,
        op_kwargs={'event_type': 'search'},
    )
    
    ingest_clicks = PythonOperator(
        task_id='ingest_click_events', 
        python_callable=ingest_events,
        op_kwargs={'event_type': 'click'},
    )
    
    ingest_conversions = PythonOperator(
        task_id='ingest_conversion_events',
        python_callable=ingest_events,
        op_kwargs={'event_type': 'conversion'},
    )
    
    # Run in parallel
    [ingest_searches, ingest_clicks, ingest_conversions]
```

### Step 3.2: Transformation DAG

Create `airflow/dags/transformation_dag.py`:

```python
from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.bash import BashOperator

default_args = {
    'owner': 'searchflow',
    'depends_on_past': False,
    'retries': 2,
    'retry_delay': timedelta(minutes=2),
}

with DAG(
    'searchflow_transformation',
    default_args=default_args,
    description='Run dbt transformations',
    schedule_interval='0 * * * *',  # Hourly
    start_date=datetime(2024, 1, 1),
    catchup=False,
    tags=['transformation', 'dbt', 'searchflow'],
) as dag:
    
    dbt_deps = BashOperator(
        task_id='dbt_deps',
        bash_command='cd /dbt && dbt deps',
    )
    
    dbt_run_staging = BashOperator(
        task_id='dbt_run_staging',
        bash_command='cd /dbt && dbt run --select staging',
    )
    
    dbt_run_intermediate = BashOperator(
        task_id='dbt_run_intermediate',
        bash_command='cd /dbt && dbt run --select intermediate',
    )
    
    dbt_run_marts = BashOperator(
        task_id='dbt_run_marts',
        bash_command='cd /dbt && dbt run --select marts',
    )
    
    dbt_test = BashOperator(
        task_id='dbt_test',
        bash_command='cd /dbt && dbt test',
    )
    
    dbt_deps >> dbt_run_staging >> dbt_run_intermediate >> dbt_run_marts >> dbt_test
```

### Step 3.3: Reverse-ETL DAG

Create `airflow/dags/reverse_etl_dag.py`:

```python
from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.python import PythonOperator

default_args = {
    'owner': 'searchflow',
    'retries': 2,
    'retry_delay': timedelta(minutes=5),
}

def sync_user_segments(**context):
    """Sync user segments to CRM table."""
    import duckdb
    import psycopg2
    
    # Read from warehouse
    warehouse = duckdb.connect('/data/searchflow.duckdb')
    segments = warehouse.execute("""
        SELECT user_id, segment, engagement_score, lifetime_revenue,
               lifetime_conversions, primary_platform, primary_country,
               first_seen_at, last_seen_at
        FROM main_marketing.mart_user_segments
    """).fetchall()
    warehouse.close()
    
    # Write to CRM (Postgres)
    crm = psycopg2.connect(
        host='postgres', database='searchflow',
        user='searchflow', password='searchflow123'
    )
    cursor = crm.cursor()
    
    for row in segments:
        cursor.execute("""
            INSERT INTO crm_user_segments 
            (user_id, segment, engagement_score, lifetime_revenue, ...)
            VALUES (%s, %s, %s, %s, ...)
            ON CONFLICT (user_id) DO UPDATE SET
                segment = EXCLUDED.segment,
                engagement_score = EXCLUDED.engagement_score,
                synced_at = CURRENT_TIMESTAMP
        """, row)
    
    crm.commit()
    crm.close()

with DAG(
    'searchflow_reverse_etl',
    default_args=default_args,
    description='Sync marts to operational systems',
    schedule_interval='0 */6 * * *',  # Every 6 hours
    start_date=datetime(2024, 1, 1),
    catchup=False,
    tags=['reverse-etl', 'searchflow'],
) as dag:
    
    sync_segments = PythonOperator(
        task_id='sync_user_segments',
        python_callable=sync_user_segments,
    )
    
    # Add more sync tasks...
```

---

## Phase 4: dbt Project (Day 4-5)

### Step 4.1: Project Configuration

Create `dbt_transform/dbt_project.yml`:

```yaml
name: 'searchflow'
version: '1.0.0'
config-version: 2
profile: 'searchflow'

model-paths: ["models"]
analysis-paths: ["analyses"]
test-paths: ["tests"]
seed-paths: ["seeds"]
macro-paths: ["macros"]
snapshot-paths: ["snapshots"]

vars:
  searchflow:
    conversion_window_hours: 24
    session_timeout_minutes: 30

models:
  searchflow:
    staging:
      +materialized: view
      +schema: staging
    intermediate:
      +materialized: view
      +schema: intermediate
    marts:
      analytics:
        +materialized: table
        +schema: analytics
      marketing:
        +materialized: table
        +schema: marketing
```

Create `dbt_transform/profiles.yml`:

```yaml
searchflow:
  target: dev
  outputs:
    dev:
      type: duckdb
      path: /data/searchflow.duckdb
      threads: 4
    prod:
      type: snowflake
      account: "{{ env_var('SNOWFLAKE_ACCOUNT') }}"
      user: "{{ env_var('SNOWFLAKE_USER') }}"
      password: "{{ env_var('SNOWFLAKE_PASSWORD') }}"
      role: TRANSFORMER
      database: SEARCHFLOW
      warehouse: TRANSFORM_WH
      schema: public
      threads: 8
```

### Step 4.2: Create Models

Implement all models from DATA_SCHEMAS.md:

1. `models/staging/stg_search_events.sql`
2. `models/staging/stg_click_events.sql`
3. `models/staging/stg_conversion_events.sql`
4. `models/intermediate/int_search_sessions.sql`
5. `models/intermediate/int_user_journeys.sql`
6. `models/marts/analytics/fct_search_funnel.sql`
7. `models/marts/analytics/dim_users.sql`
8. `models/marts/marketing/mart_user_segments.sql`
9. `models/marts/marketing/mart_recommendations.sql`

### Step 4.3: Add Tests

Create `models/staging/_staging.yml` with schema tests.
Create `models/marts/analytics/_analytics.yml` with business logic tests.

---

## Phase 5: Reverse-ETL Service (Day 6)

### Step 5.1: Sync Implementation

Create `reverse_etl/src/syncs/user_segments_sync.py`:

```python
import duckdb
import psycopg2
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class UserSegmentsSync:
    def __init__(self, warehouse_path: str, crm_config: dict):
        self.warehouse_path = warehouse_path
        self.crm_config = crm_config
    
    def run(self) -> dict:
        """Execute sync and return metrics."""
        start_time = datetime.utcnow()
        
        # Extract from warehouse
        segments = self._extract_segments()
        
        # Load to CRM
        upserted, unchanged = self._load_to_crm(segments)
        
        return {
            'sync_type': 'user_segments',
            'rows_extracted': len(segments),
            'rows_upserted': upserted,
            'rows_unchanged': unchanged,
            'duration_seconds': (datetime.utcnow() - start_time).total_seconds()
        }
    
    def _extract_segments(self) -> list:
        conn = duckdb.connect(self.warehouse_path)
        result = conn.execute("""
            SELECT * FROM main_marketing.mart_user_segments
            WHERE segmented_at > (
                SELECT COALESCE(MAX(synced_at), '1970-01-01')
                FROM information_schema.tables  -- Would be last sync timestamp
            )
        """).fetchall()
        conn.close()
        return result
    
    def _load_to_crm(self, segments: list) -> tuple:
        # Upsert logic...
        pass
```

---

## Phase 6: Testing & Documentation (Day 7-8)

### Step 6.1: Create Makefile

```makefile
.PHONY: setup start stop generate-events run-pipeline test

setup:
	cp .env.example .env
	docker-compose build

start:
	docker-compose up -d

stop:
	docker-compose down

generate-events:
	docker-compose exec event-generator python -m src.main --duration 60

run-pipeline:
	docker-compose exec airflow-scheduler airflow dags trigger searchflow_ingestion
	sleep 30
	docker-compose exec airflow-scheduler airflow dags trigger searchflow_transformation

test:
	docker-compose exec airflow-scheduler bash -c "cd /dbt && dbt test"

logs:
	docker-compose logs -f

demo:
	./scripts/run_demo.sh
```

### Step 6.2: Demo Script

Create `scripts/run_demo.sh`:

```bash
#!/bin/bash
echo "🚀 Starting SearchFlow Demo..."

# Start services
docker-compose up -d
sleep 30

# Generate events
echo "📊 Generating 10,000 events..."
docker-compose exec event-generator python -m src.main --count 10000

# Run pipeline
echo "⚙️ Running ingestion..."
docker-compose exec airflow-scheduler airflow dags trigger searchflow_ingestion
sleep 60

echo "🔄 Running transformations..."
docker-compose exec airflow-scheduler airflow dags trigger searchflow_transformation
sleep 120

echo "📤 Running reverse-ETL..."
docker-compose exec airflow-scheduler airflow dags trigger searchflow_reverse_etl
sleep 30

# Show results
echo "✅ Demo complete! View results at:"
echo "   - Airflow: http://localhost:8080"
echo "   - Metabase: http://localhost:3000"
```

---

## Verification Checklist

After each phase, verify:

- [ ] **Phase 1**: `docker-compose up` starts all services without errors
- [ ] **Phase 2**: Event generator produces valid JSON events
- [ ] **Phase 3**: Airflow DAGs appear in UI and can be triggered
- [ ] **Phase 4**: `dbt run` completes without errors
- [ ] **Phase 5**: Reverse-ETL populates CRM table
- [ ] **Phase 6**: Full demo runs end-to-end

---

## Troubleshooting

### Common Issues

1. **DuckDB lock errors**: Only one process can write at a time. Use read-only mode for concurrent reads.

2. **Airflow DAG not appearing**: Check for Python syntax errors in DAG file.

3. **dbt connection issues**: Verify profiles.yml path matches DBT_PROFILES_DIR.

4. **Redis connection refused**: Ensure Redis container is running and on same network.
