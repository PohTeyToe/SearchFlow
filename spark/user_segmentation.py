"""
PySpark user segmentation job for SearchFlow.

Reads processed session metrics, computes engagement scores, and
assigns each user to a segment: high_value, at_risk, new_user,
regular, or abandoned_search.  Outputs segment assignments as Parquet.
"""

import logging
import os
from typing import Optional

from pyspark.sql import DataFrame, SparkSession
from pyspark.sql import functions as F

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# ------------------------------------------------------------------
# Engagement scoring
# ------------------------------------------------------------------


def compute_user_engagement(session_metrics: DataFrame) -> DataFrame:
    """Aggregate session metrics into per-user engagement features.

    Features:
        - total_sessions
        - total_page_views
        - total_clicks
        - total_conversions
        - avg_session_duration_seconds
        - bounce_rate (fraction of sessions that are bounces)
        - engagement_score (0-100 composite)
    """
    user_agg = session_metrics.groupBy("user_id").agg(
        F.count("*").alias("total_sessions"),
        F.sum("page_views").alias("total_page_views"),
        F.sum("click_count").alias("total_clicks"),
        F.sum("conversion_count").alias("total_conversions"),
        F.avg("duration_seconds").alias("avg_session_duration_seconds"),
        F.avg(F.col("is_bounce").cast("int")).alias("bounce_rate"),
    )

    # Composite engagement score (0-100)
    # Weighted: sessions (20%), clicks (30%), conversions (40%), low bounce (10%)
    user_agg = user_agg.withColumn(
        "engagement_score",
        F.least(
            F.lit(100.0),
            (
                F.least(F.col("total_sessions") / 10.0, F.lit(1.0)) * 20
                + F.least(F.col("total_clicks") / 20.0, F.lit(1.0)) * 30
                + F.least(F.col("total_conversions") / 3.0, F.lit(1.0)) * 40
                + (1.0 - F.col("bounce_rate")) * 10
            ),
        ),
    )

    return user_agg


# ------------------------------------------------------------------
# Segmentation logic
# ------------------------------------------------------------------


def assign_segments(user_engagement: DataFrame) -> DataFrame:
    """Classify users into segments based on engagement features.

    Segments:
        high_value     -- at least 1 conversion and engagement >= 60
        at_risk        -- had conversions before but low recent engagement (< 30)
        new_user       -- 1-2 sessions total
        abandoned_search -- clicks > 0 but zero conversions
        regular        -- everyone else
    """
    segmented = user_engagement.withColumn(
        "segment",
        F.when(
            (F.col("total_conversions") >= 1) & (F.col("engagement_score") >= 60),
            F.lit("high_value"),
        )
        .when(
            (F.col("total_conversions") >= 1) & (F.col("engagement_score") < 30),
            F.lit("at_risk"),
        )
        .when(
            F.col("total_sessions") <= 2,
            F.lit("new_user"),
        )
        .when(
            (F.col("total_clicks") > 0) & (F.col("total_conversions") == 0),
            F.lit("abandoned_search"),
        )
        .otherwise(F.lit("regular")),
    )

    return segmented


# ------------------------------------------------------------------
# Output
# ------------------------------------------------------------------


def write_segments(
    segments_df: DataFrame,
    output_dir: str,
    jdbc_url: Optional[str] = None,
    jdbc_properties: Optional[dict] = None,
) -> None:
    """Write segment assignments to Parquet or PostgreSQL."""
    if jdbc_url and jdbc_properties:
        logger.info("Writing user segments to PostgreSQL...")
        segments_df.write.jdbc(
            url=jdbc_url,
            table="spark_user_segments",
            mode="overwrite",
            properties=jdbc_properties,
        )
    else:
        logger.info("Writing user segments to Parquet at %s ...", output_dir)
        os.makedirs(output_dir, exist_ok=True)
        segments_df.write.mode("overwrite").parquet(
            os.path.join(output_dir, "user_segments")
        )


# ------------------------------------------------------------------
# Main
# ------------------------------------------------------------------


def main(
    input_dir: str = "/data/spark_output",
    output_dir: str = "/data/spark_output",
    jdbc_url: Optional[str] = None,
) -> None:
    """Run the user segmentation pipeline.

    Args:
        input_dir: Directory containing session_metrics Parquet.
        output_dir: Directory for segment output.
        jdbc_url: Optional JDBC URL for PostgreSQL output.
    """
    spark = (
        SparkSession.builder.appName("SearchFlow-UserSegmentation")
        .config("spark.sql.shuffle.partitions", "8")
        .getOrCreate()
    )

    session_metrics_path = os.path.join(input_dir, "session_metrics")
    logger.info("Reading session metrics from %s", session_metrics_path)
    session_metrics = spark.read.parquet(session_metrics_path)
    logger.info("Loaded %d session records", session_metrics.count())

    logger.info("Computing user engagement scores...")
    user_engagement = compute_user_engagement(session_metrics)

    logger.info("Assigning user segments...")
    segments = assign_segments(user_engagement)
    segments.cache()

    # TODO: persist previous segment for transition tracking
    segment_counts = (
        segments.groupBy("segment")
        .count()
        .orderBy(F.desc("count"))
    )
    logger.info("Segment distribution:")
    segment_counts.show(truncate=False)

    jdbc_properties = None
    if jdbc_url:
        jdbc_properties = {
            "user": os.getenv("POSTGRES_USER", "searchflow"),
            "password": os.getenv("POSTGRES_PASSWORD", "changeme"),
            "driver": "org.postgresql.Driver",
        }

    write_segments(segments, output_dir, jdbc_url, jdbc_properties)
    logger.info("User segmentation complete. Total users: %d", segments.count())

    spark.stop()


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="PySpark user segmentation")
    parser.add_argument("--input-dir", default="/data/spark_output")
    parser.add_argument("--output-dir", default="/data/spark_output")
    parser.add_argument("--jdbc-url", default=None)
    args = parser.parse_args()

    main(args.input_dir, args.output_dir, args.jdbc_url)
