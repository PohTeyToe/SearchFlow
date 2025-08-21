import duckdb

conn = duckdb.connect("data/searchflow.duckdb")

print("=== Raw Table Counts ===")
raw_tables = ["raw.search_events", "raw.click_events", "raw.conversion_events"]
for table in raw_tables:
    count = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
    print(f"  {table}: {count:,} rows")

print("\n=== Staging Views ===")
staging_tables = [
    "main_staging.stg_search_events", 
    "main_staging.stg_click_events", 
    "main_staging.stg_conversion_events"
]
for table in staging_tables:
    try:
        count = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
        print(f"  {table}: {count:,} rows")
    except Exception as e:
        print(f"  {table}: Error - {e}")

print("\n=== Intermediate Views ===")
int_tables = [
    "main_intermediate.int_search_sessions",
    "main_intermediate.int_user_journeys"
]
for table in int_tables:
    try:
        count = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
        print(f"  {table}: {count:,} rows")
    except Exception as e:
        print(f"  {table}: Error - {e}")

print("\n=== Analytics Mart Tables ===")
analytics_tables = [
    "main_analytics.fct_search_funnel",
    "main_analytics.dim_users"
]
for table in analytics_tables:
    try:
        count = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
        print(f"  {table}: {count:,} rows")
    except Exception as e:
        print(f"  {table}: Error - {e}")

print("\n=== Marketing Mart Tables ===")
marketing_tables = [
    "main_marketing.mart_user_segments",
    "main_marketing.mart_recommendations"
]
for table in marketing_tables:
    try:
        count = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
        print(f"  {table}: {count:,} rows")
    except Exception as e:
        print(f"  {table}: Error - {e}")

print("\n=== Sample Data from fct_search_funnel ===")
result = conn.execute("""
    SELECT funnel_date, total_sessions, total_searches, total_clicks, 
           total_conversions, click_through_rate, conversion_rate
    FROM main_analytics.fct_search_funnel
    ORDER BY funnel_date DESC
    LIMIT 5
""").fetchall()
for row in result:
    print(f"  {row[0]}: {row[1]} sessions, {row[2]} searches, {row[3]} clicks, {row[4]} conversions (CTR: {row[5]:.2%}, CVR: {row[6]:.2%})")

conn.close()
print("\n=== Verification Complete ===")
