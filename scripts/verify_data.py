import duckdb

conn = duckdb.connect("data/searchflow.duckdb")

print("=== Checking payload structure ===")
result = conn.execute("""
    SELECT event_id, payload 
    FROM raw.search_events 
    LIMIT 1
""").fetchone()
print(f"event_id: {result[0]}")
print(f"payload type: {type(result[1])}")
print(f"payload: {result[1][:500]}...")

print("\n=== Testing json_extract_string ===")
result = conn.execute("""
    SELECT 
        event_id,
        json_extract_string(payload, '$.event_type') as event_type,
        json_extract_string(payload, '$.timestamp') as timestamp,
        json_extract_string(payload, '$.user_id') as user_id
    FROM raw.search_events 
    LIMIT 3
""").fetchall()
for row in result:
    print(row)

conn.close()
