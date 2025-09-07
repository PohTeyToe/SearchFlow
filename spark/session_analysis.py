"""
PySpark session analysis job for SearchFlow.

Reads raw event data (search, click, conversion), sessionizes events
by user_id with a 30-minute inactivity timeout, computes session-level
metrics (duration, page views, bounce rate), builds a conversion funnel,
and writes results to Parquet files (or PostgreSQL via JDBC).
"""

import os
import sys
import logging
from typing import Optional

from pyspark.sql import SparkSession, DataFrame, Window
from pyspark.sql import functions as F
from pyspark.sql.types import (
    StructType,
    StructField,
    StringType,
    IntegerType,
    DoubleType,
    TimestampType,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# ------------------------------------------------------------------
# Schemas
# ------------------------------------------------------------------

SEARCH_SCHEMA = StructType(
    [
        StructField("event_id", StringType(), False),
        StructField("event_type", StringType(), False),
        StructField("timestamp", StringType(), False),
        StructField("user_id", StringType(), True),
        StructField("session_id", StringType(), True),
        StructField("query", StringType(), True),
        StructField("results_count", IntegerType(), True),
        StructField("platform", StringType(), True),
        StructField("device_type", StringType(), True),
    ]
)

CLICK_SCHEMA = StructType(
    [
        StructField("event_id", StringType(), False),
        StructField("event_type", StringType(), False),
        StructField("timestamp", StringType(), False),
        StructField("user_id", StringType(), True),
        StructField("session_id", StringType(), True),
        StructField("search_event_id", StringType(), True),
        StructField("result_position", IntegerType(), True),
        StructField("result_type", StringType(), True),
        StructField("result_price", DoubleType(), True),
        StructField("result_destination", StringType(), True),
    ]
)

CONVERSION_SCHEMA = StructType(
    [
        StructField("event_id", StringType(), False),
        StructField("event_type", StringType(), False),
        StructField("timestamp", StringType(), False),
        StructField("user_id", StringType(), True),
        StructField("session_id", StringType(), True),
        StructField("click_event_id", StringType(), True),
        StructField("booking_value", DoubleType(), True),
        StructField("commission", DoubleType(), True),
        StructField("product_type", StringType(), True),
    ]
)


# ------------------------------------------------------------------
# Data loading
# ------------------------------------------------------------------


def load_events(
    spark: SparkSession,
    data_dir: str,
) -> tuple[DataFrame, DataFrame, DataFrame]:
    """Load search, click, and conversion JSONL files.

    Args:
        spark: Active Spark session.
        data_dir: Path to directory containing *_events.jsonl files.

    Returns:
        Tuple of (search_df, click_df, conversion_df).
    """
    search_path = os.path.join(data_dir, "search_events.jsonl")
    click_path = os.path.join(data_dir, "click_events.jsonl")
    conversion_path = os.path.join(data_dir, "conversion_events.jsonl")

    search_df = spark.read.json(search_path, schema=SEARCH_SCHEMA).withColumn(
        "event_ts", F.to_timestamp("timestamp")
    )
    click_df = spark.read.json(click_path, schema=CLICK_SCHEMA).withColumn(
        "event_ts", F.to_timestamp("timestamp")
    )
    conversion_df = spark.read.json(conversion_path, schema=CONVERSION_SCHEMA).withColumn(
        "event_ts", F.to_timestamp("timestamp")
    )

    return search_df, click_df, conversion_df


# ------------------------------------------------------------------
# Sessionization
# ------------------------------------------------------------------

SESSION_TIMEOUT_SECONDS = 30 * 60  # 30 minutes


def sessionize_events(
    search_df: DataFrame,
    click_df: DataFrame,
    conversion_df: DataFrame,
) -> DataFrame:
    """Sessionize all events by user_id with a 30-minute timeout.

    Events with null user_id are dropped (anonymous traffic).

    The session boundary is detected by comparing each event's timestamp
    to the previous event from the same user. When the gap exceeds
    ``SESSION_TIMEOUT_SECONDS`` a new session is started.

    Returns:
        DataFrame with columns: user_id, event_id, event_type, event_ts,
        computed_session_id.
    """
    # Union all event types into a single frame
    all_events = (
        search_df.select("user_id", "event_id", "event_type", "event_ts")
        .unionByName(click_df.select("user_id", "event_id", "event_type", "event_ts"))
        .unionByName(
            conversion_df.select("user_id", "event_id", "event_type", "event_ts")
        )
        .filter(F.col("user_id").isNotNull())
    )

    user_window = Window.partitionBy("user_id").orderBy("event_ts")

    events_with_lag = all_events.withColumn(
        "prev_ts", F.lag("event_ts").over(user_window)
    ).withColumn(
        "gap_seconds",
        F.when(F.col("prev_ts").isNull(), 0).otherwise(
            F.unix_timestamp("event_ts") - F.unix_timestamp("prev_ts")
        ),
    )

    # Mark new session when gap exceeds threshold
    events_with_boundary = events_with_lag.withColumn(
        "new_session",
        F.when(
            (F.col("gap_seconds") > SESSION_TIMEOUT_SECONDS) | F.col("prev_ts").isNull(),
            F.lit(1),
        ).otherwise(F.lit(0)),
    )

    # Cumulative sum of session boundary flags gives the session number per user
    events_with_session = events_with_boundary.withColumn(
        "session_num", F.sum("new_session").over(user_window)
    ).withColumn(
        "computed_session_id",
        F.concat_ws("_", F.col("user_id"), F.col("session_num").cast("string")),
    )

    return events_with_session.select(
        "user_id", "event_id", "event_type", "event_ts", "computed_session_id"
    )


# ------------------------------------------------------------------
# Session metrics
# ------------------------------------------------------------------


def compute_session_metrics(sessionized_df: DataFrame) -> DataFrame:
    """Compute per-session metrics.

    Metrics:
        - duration_seconds: time between first and last event
        - page_views: count of search events (proxy for page loads)
        - click_count: number of clicks
        - conversion_count: number of conversions
        - is_bounce: session with only one event
    """
    grouped = sessionized_df.groupBy("user_id", "computed_session_id").agg(
        F.min("event_ts").alias("session_start"),
        F.max("event_ts").alias("session_end"),
        F.count("*").alias("event_count"),
        F.sum(F.when(F.col("event_type") == "search", 1).otherwise(0)).alias(
            "page_views"
        ),
        F.sum(F.when(F.col("event_type") == "click", 1).otherwise(0)).alias(
            "click_count"
        ),
        F.sum(F.when(F.col("event_type") == "conversion", 1).otherwise(0)).alias(
            "conversion_count"
        ),
    )

    metrics = grouped.withColumn(
        "duration_seconds",
        F.unix_timestamp("session_end") - F.unix_timestamp("session_start"),
    ).withColumn(
        "is_bounce", F.when(F.col("event_count") == 1, True).otherwise(False)
    )

    return metrics


# ------------------------------------------------------------------
# Conversion funnel
# ------------------------------------------------------------------


def build_conversion_funnel(session_metrics: DataFrame) -> DataFrame:
    """Aggregate funnel: sessions -> sessions with clicks -> sessions with conversions.

    Returns a single-row DataFrame with funnel counts and rates.
    """
    total_sessions = session_metrics.count()
    sessions_with_clicks = session_metrics.filter(F.col("click_count") > 0).count()
    sessions_with_conversions = session_metrics.filter(
        F.col("conversion_count") > 0
    ).count()

    bounce_rate = (
        session_metrics.filter(F.col("is_bounce")).count() / max(total_sessions, 1)
    )
    click_rate = sessions_with_clicks / max(total_sessions, 1)
    conversion_rate = sessions_with_conversions / max(total_sessions, 1)

    spark = session_metrics.sparkSession
    funnel = spark.createDataFrame(
        [
            (
                total_sessions,
                sessions_with_clicks,
                sessions_with_conversions,
                round(bounce_rate, 4),
                round(click_rate, 4),
                round(conversion_rate, 4),
            )
        ],
        [
            "total_sessions",
            "sessions_with_clicks",
            "sessions_with_conversions",
            "bounce_rate",
            "click_rate",
            "conversion_rate",
        ],
    )
    return funnel


# ------------------------------------------------------------------
# Output
# ------------------------------------------------------------------


def write_results(
    session_metrics: DataFrame,
    funnel: DataFrame,
    output_dir: str,
    jdbc_url: Optional[str] = None,
    jdbc_properties: Optional[dict] = None,
) -> None:
    """Write results to Parquet (default) or PostgreSQL via JDBC.

    Args:
        session_metrics: Per-session metrics DataFrame.
        funnel: Conversion funnel summary DataFrame.
        output_dir: Directory for Parquet output.
        jdbc_url: Optional JDBC connection string for Postgres.
        jdbc_properties: Optional dict with ``user`` and ``password``.
    """
    if jdbc_url and jdbc_properties:
        logger.info("Writing session metrics to PostgreSQL...")
        session_metrics.write.jdbc(
            url=jdbc_url,
            table="spark_session_metrics",
            mode="overwrite",
            properties=jdbc_properties,
        )
        funnel.write.jdbc(
            url=jdbc_url,
            table="spark_conversion_funnel",
            mode="overwrite",
            properties=jdbc_properties,
        )
    else:
        logger.info("Writing session metrics to Parquet at %s ...", output_dir)
        os.makedirs(output_dir, exist_ok=True)
        session_metrics.write.mode("overwrite").parquet(
            os.path.join(output_dir, "session_metrics")
        )
        funnel.write.mode("overwrite").parquet(
            os.path.join(output_dir, "conversion_funnel")
        )


# ------------------------------------------------------------------
# Main
# ------------------------------------------------------------------


def main(
    data_dir: str = "/data/raw",
    output_dir: str = "/data/spark_output",
    jdbc_url: Optional[str] = None,
) -> None:
    """Run the session analysis pipeline."""
    spark = (
        SparkSession.builder.appName("SearchFlow-SessionAnalysis")
        .config("spark.sql.shuffle.partitions", "8")
        .getOrCreate()
    )

    logger.info("Loading events from %s", data_dir)
    search_df, click_df, conversion_df = load_events(spark, data_dir)
    logger.info(
        "Loaded  searches=%d  clicks=%d  conversions=%d",
        search_df.count(),
        click_df.count(),
        conversion_df.count(),
    )

    logger.info("Sessionizing events (30-min timeout)...")
    sessionized = sessionize_events(search_df, click_df, conversion_df)

    logger.info("Computing session metrics...")
    session_metrics = compute_session_metrics(sessionized)
    session_metrics.cache()
    logger.info("Total sessions: %d", session_metrics.count())

    logger.info("Building conversion funnel...")
    funnel = build_conversion_funnel(session_metrics)
    funnel.show()

    jdbc_properties = None
    if jdbc_url:
        jdbc_properties = {
            "user": os.getenv("POSTGRES_USER", "searchflow"),
            "password": os.getenv("POSTGRES_PASSWORD", "searchflow123"),
            "driver": "org.postgresql.Driver",
        }

    write_results(session_metrics, funnel, output_dir, jdbc_url, jdbc_properties)
    logger.info("Session analysis complete.")

    spark.stop()


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="PySpark session analysis")
    parser.add_argument("--data-dir", default="/data/raw")
    parser.add_argument("--output-dir", default="/data/spark_output")
    parser.add_argument("--jdbc-url", default=None)
    args = parser.parse_args()

    main(args.data_dir, args.output_dir, args.jdbc_url)
