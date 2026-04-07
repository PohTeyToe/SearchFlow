"""Simulate data quality incidents to validate the detection framework.

Usage: python scripts/simulate_incident.py

Injects anomalies into a temporary DuckDB database, runs validation checks,
and generates an incident timeline showing which checks caught which issues.
"""

import os
import shutil
import tempfile
from datetime import datetime, timedelta

import duckdb


def create_test_database(db_path: str) -> duckdb.DuckDBPyConnection:
    """Create a test database with sample data for incident simulation."""
    conn = duckdb.connect(db_path)

    conn.execute("CREATE SCHEMA IF NOT EXISTS raw")
    # Intentionally omit NOT NULL constraints -- the dbt test layer enforces
    # them, and we want the simulation to show that validation catches nulls.
    conn.execute("""
        CREATE TABLE IF NOT EXISTS raw.search_events (
            event_id VARCHAR PRIMARY KEY,
            user_id VARCHAR,
            event_type VARCHAR,
            query VARCHAR,
            event_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            adr DOUBLE,
            ctr DOUBLE
        )
    """)

    # Insert baseline data
    for i in range(100):
        conn.execute(
            "INSERT INTO raw.search_events VALUES (?, ?, ?, ?, ?, ?, ?)",
            [
                f"evt_{i:04d}",
                f"user_{i % 50:04d}",
                "search",
                f"query_{i}",
                datetime.now() - timedelta(hours=i),
                50.0 + (i % 20) * 5,
                0.1 + (i % 10) * 0.05,
            ],
        )

    return conn


def inject_null_anomalies(conn: duckdb.DuckDBPyConnection) -> dict:
    """Inject rows with NULL values in required columns."""
    injected = []
    for i in range(5):
        event_id = f"null_evt_{i:04d}"
        conn.execute(
            "INSERT INTO raw.search_events (event_id, user_id, event_type, adr, ctr) VALUES (?, NULL, ?, ?, ?)",
            [event_id, "search", 100.0, 0.2],
        )
        injected.append({"event_id": event_id, "anomaly": "null_user_id"})
    return {"type": "null_required_fields", "count": len(injected), "details": injected}


def inject_negative_adr(conn: duckdb.DuckDBPyConnection) -> dict:
    """Inject rows with negative ADR values."""
    injected = []
    for i in range(3):
        event_id = f"neg_adr_{i:04d}"
        conn.execute(
            "INSERT INTO raw.search_events VALUES (?, ?, ?, ?, ?, ?, ?)",
            [event_id, f"user_{900+i}", "search", "test", datetime.now(), -50.0 - i * 10, 0.3],
        )
        injected.append({"event_id": event_id, "adr": -50.0 - i * 10})
    return {"type": "negative_adr", "count": len(injected), "details": injected}


def inject_duplicate_events(conn: duckdb.DuckDBPyConnection) -> dict:
    """Inject events that duplicate existing event_ids (will be ignored by PRIMARY KEY)."""
    # Since event_id is PK, we insert with different IDs but same user data to simulate duplicates
    injected = []
    for i in range(10):
        event_id = f"dup_evt_{i:04d}"
        conn.execute(
            "INSERT OR IGNORE INTO raw.search_events VALUES (?, ?, ?, ?, ?, ?, ?)",
            [event_id, "user_0001", "search", "duplicate_query", datetime.now(), 100.0, 0.5],
        )
        injected.append({"event_id": event_id})
    return {"type": "duplicate_patterns", "count": len(injected)}


def inject_invalid_ctr(conn: duckdb.DuckDBPyConnection) -> dict:
    """Inject rows with CTR > 1.0 (impossible conversion rate)."""
    injected = []
    for i in range(3):
        event_id = f"bad_ctr_{i:04d}"
        conn.execute(
            "INSERT INTO raw.search_events VALUES (?, ?, ?, ?, ?, ?, ?)",
            [event_id, f"user_{800+i}", "search", "test", datetime.now(), 100.0, 1.5 + i * 0.3],
        )
        injected.append({"event_id": event_id, "ctr": 1.5 + i * 0.3})
    return {"type": "invalid_ctr", "count": len(injected), "details": injected}


def inject_future_timestamps(conn: duckdb.DuckDBPyConnection) -> dict:
    """Inject events with timestamps far in the future."""
    injected = []
    future = datetime.now() + timedelta(days=365)
    for i in range(3):
        event_id = f"future_evt_{i:04d}"
        conn.execute(
            "INSERT INTO raw.search_events VALUES (?, ?, ?, ?, ?, ?, ?)",
            [event_id, f"user_{700+i}", "search", "test", future, 100.0, 0.2],
        )
        injected.append({"event_id": event_id, "timestamp": future.isoformat()})
    return {"type": "future_timestamps", "count": len(injected), "details": injected}


def run_validation_checks(conn: duckdb.DuckDBPyConnection) -> list[dict]:
    """Run data quality checks similar to dbt tests."""
    results = []

    # Check 1: not_null on user_id
    null_count = conn.execute(
        "SELECT COUNT(*) FROM raw.search_events WHERE user_id IS NULL"
    ).fetchone()[0]
    results.append({
        "test": "not_null_user_id",
        "passed": null_count == 0,
        "failures": null_count,
        "message": f"Found {null_count} rows with NULL user_id",
    })

    # Check 2: positive ADR
    neg_adr = conn.execute(
        "SELECT COUNT(*) FROM raw.search_events WHERE adr < 0"
    ).fetchone()[0]
    results.append({
        "test": "positive_adr",
        "passed": neg_adr == 0,
        "failures": neg_adr,
        "message": f"Found {neg_adr} rows with negative ADR",
    })

    # Check 3: valid CTR (0-1 range)
    bad_ctr = conn.execute(
        "SELECT COUNT(*) FROM raw.search_events WHERE ctr > 1.0 OR ctr < 0.0"
    ).fetchone()[0]
    results.append({
        "test": "valid_ctr_range",
        "passed": bad_ctr == 0,
        "failures": bad_ctr,
        "message": f"Found {bad_ctr} rows with CTR outside [0, 1]",
    })

    # Check 4: no future timestamps
    future_count = conn.execute(
        "SELECT COUNT(*) FROM raw.search_events WHERE event_timestamp > CURRENT_TIMESTAMP + INTERVAL '1' DAY"
    ).fetchone()[0]
    results.append({
        "test": "no_future_timestamps",
        "passed": future_count == 0,
        "failures": future_count,
        "message": f"Found {future_count} rows with future timestamps",
    })

    # Check 5: unique event_id (always passes due to PRIMARY KEY)
    total = conn.execute("SELECT COUNT(*) FROM raw.search_events").fetchone()[0]
    distinct = conn.execute("SELECT COUNT(DISTINCT event_id) FROM raw.search_events").fetchone()[0]
    results.append({
        "test": "unique_event_id",
        "passed": total == distinct,
        "failures": total - distinct,
        "message": f"Total: {total}, Distinct: {distinct}",
    })

    return results


def main():
    # Use a temporary database
    tmp_dir = tempfile.mkdtemp(prefix="searchflow_incident_")
    db_path = os.path.join(tmp_dir, "test.duckdb")

    print("=" * 60)
    print("  SearchFlow Data Incident Simulation")
    print("=" * 60)
    print()

    try:
        # Create test database
        conn = create_test_database(db_path)
        baseline = conn.execute("SELECT COUNT(*) FROM raw.search_events").fetchone()[0]
        print(f"Baseline: {baseline} rows in raw.search_events")
        print()

        # Inject anomalies
        print("Injecting anomalies...")
        injections = []
        injections.append(inject_null_anomalies(conn))
        injections.append(inject_negative_adr(conn))
        injections.append(inject_duplicate_events(conn))
        injections.append(inject_invalid_ctr(conn))
        injections.append(inject_future_timestamps(conn))

        total_injected = sum(i["count"] for i in injections)
        print(f"Injected {total_injected} anomalous rows across {len(injections)} categories")
        print()

        for inj in injections:
            print(f"  - {inj['type']}: {inj['count']} rows")
        print()

        # Run validation
        print("Running validation checks...")
        results = run_validation_checks(conn)
        print()

        passed = sum(1 for r in results if r["passed"])
        failed = sum(1 for r in results if not r["passed"])

        print(f"Results: {passed} passed, {failed} failed")
        print()

        for r in results:
            status = "PASS" if r["passed"] else "FAIL"
            print(f"  [{status}] {r['test']}: {r['message']}")

        print()
        print("-" * 60)
        print("Incident Timeline:")
        print(f"  {datetime.now().strftime('%H:%M:%S')} - Anomalies injected")
        print(f"  {datetime.now().strftime('%H:%M:%S')} - Validation checks executed")
        print(f"  {datetime.now().strftime('%H:%M:%S')} - {failed} issues detected, {passed} checks clean")
        print()

        if failed > 0:
            print("Detection framework caught the injected anomalies.")
        else:
            print("WARNING: No anomalies detected -- check validation rules.")

        conn.close()

    finally:
        # Cleanup
        shutil.rmtree(tmp_dir, ignore_errors=True)
        print("\nCleanup: temporary database removed")


if __name__ == "__main__":
    main()
