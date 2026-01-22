# Event Generator

Simulates realistic search traffic for the SearchFlow analytics platform.

## Overview

The Event Generator creates synthetic but realistic user sessions containing search, click, and conversion events. It simulates a travel search platform where users search for destinations, click on results, and occasionally complete bookings.

## File Structure

```
event_generator/
├── Dockerfile
├── requirements.txt
├── src/
│   ├── __init__.py
│   ├── config.py       # Configuration (env vars, defaults)
│   ├── generator.py    # Core event generation logic
│   ├── models.py       # Event dataclasses (SearchEvent, ClickEvent, ConversionEvent)
│   ├── publishers.py   # Output handlers (file, Redis)
│   └── main.py         # CLI entry point
└── tests/
```

## Event Types

| Event | Description | Key Fields |
|-------|-------------|------------|
| **SearchEvent** | User searches for a destination | `query`, `results_count`, `platform`, `filters` |
| **ClickEvent** | User clicks a search result | `result_position`, `result_price`, `result_provider` |
| **ConversionEvent** | User completes a booking | `booking_value`, `commission`, `product_type` |

## Configuration

All configuration via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_HOST` | `localhost` | Redis host for streaming output |
| `REDIS_PORT` | `6379` | Redis port |
| `OUTPUT_DIR` | `/data/raw` | Directory for JSONL output files |
| `EVENTS_PER_SECOND` | `10` | Generation rate (continuous mode) |
| `CLICK_THROUGH_RATE` | `0.30` | Probability of click after search |
| `CONVERSION_RATE` | `0.10` | Probability of conversion after click |
| `USER_POOL_SIZE` | `10000` | Number of simulated users |
| `ANONYMOUS_RATE` | `0.40` | Fraction of anonymous sessions |

## Usage

### Batch Mode (Default)

```bash
# Generate 10,000 events
python -m src.main --count 10000

# Generate with custom rate
python -m src.main --count 50000 --rate 100
```

### Continuous Mode

```bash
# Stream events at 10/second
python -m src.main --mode continuous
```

### Docker

```bash
# Via docker-compose
docker-compose exec event-generator python -m src.main --count 10000

# Via Make
make generate
```

## Output

Events are written to JSONL files in `OUTPUT_DIR`:

- `search_events.jsonl`
- `click_events.jsonl`
- `conversion_events.jsonl`

Example search event:

```json
{
  "event_id": "a1b2c3d4-...",
  "event_type": "search",
  "timestamp": "2026-01-31T12:00:00Z",
  "user_id": "user_123",
  "session_id": "sess_abc",
  "query": "flights to Miami",
  "results_count": 25,
  "platform": "web",
  "device_type": "desktop",
  "geo": {"country": "CA", "city": "Toronto"}
}
```

## Realistic Patterns

The generator implements realistic user behavior:

- **Power-law click positions**: Top results get more clicks
- **Session continuity**: Multiple searches per session
- **Platform-device correlation**: Mobile apps → mobile devices
- **Conversion funnels**: 30% CTR, 10% conversion rate
- **Geographic distribution**: Weighted by population
- **UTM attribution**: Marketing channel simulation
