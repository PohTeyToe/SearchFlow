# Contributing to SearchFlow

Thank you for your interest in contributing to SearchFlow!

## Development Setup

### Prerequisites

- Docker & Docker Compose
- Python 3.11+
- Node.js 18+ (for dashboard)
- Make (optional, for shortcuts)

### Local Setup

```bash
# Clone the repository
git clone https://github.com/your-username/SearchFlow.git
cd SearchFlow

# Setup environment
make setup

# Start services
make start

# Run demo
make demo
```

## Code Style

### Python

- **Formatter**: Black (line length 88)
- **Linter**: Ruff
- **Type hints**: Required for public functions
- **Docstrings**: Google style

```python
def process_events(events: List[Event], batch_size: int = 100) -> int:
    """Process a batch of events.
    
    Args:
        events: List of events to process.
        batch_size: Number of events per batch.
        
    Returns:
        Number of events processed.
    """
    ...
```

### SQL (dbt)

- **Keywords**: UPPERCASE (`SELECT`, `FROM`, `WHERE`)
- **Indentation**: 4 spaces
- **CTEs**: Preferred over subqueries
- **Naming**: `snake_case` for tables and columns

```sql
WITH source AS (
    SELECT *
    FROM {{ source('raw', 'events') }}
),

transformed AS (
    SELECT
        event_id,
        event_type,
        CAST(timestamp AS TIMESTAMP) AS event_timestamp
    FROM source
)

SELECT * FROM transformed
```

### TypeScript (Dashboard)

- **Formatter**: Prettier
- **Linter**: ESLint
- **Types**: Explicit types for props and state

## Testing

### dbt Tests

```bash
make dbt-test
```

### Python Tests

```bash
# Event generator
cd event_generator && pytest

# Reverse-ETL
cd reverse_etl && pytest
```

### Dashboard

```bash
cd dashboard
npm run lint
npm run typecheck
```

## Pull Request Process

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/my-feature`)
3. **Make** your changes with tests
4. **Run** linting and tests locally
5. **Commit** with clear messages
6. **Push** to your fork
7. **Open** a Pull Request

### Commit Messages

Follow conventional commits:

```
feat: add user cohort analysis model
fix: correct null handling in stg_clicks
docs: update architecture diagram
test: add tests for conversion attribution
```

## Questions?

Open an issue or reach out via the repository discussions.
