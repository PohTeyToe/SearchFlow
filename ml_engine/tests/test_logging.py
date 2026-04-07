"""Tests for structured logging configuration."""

import json
import io
import logging
import sys
from unittest.mock import patch

import pytest
import structlog


def _configure_test_logging(service_name: str, stream: io.StringIO):
    """Configure structlog for testing, writing to a StringIO stream."""
    structlog.reset_defaults()
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.UnicodeDecoder(),
            structlog.processors.EventRenamer("event"),
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(logging.DEBUG),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(stream),
        cache_logger_on_first_use=False,
    )


def test_structlog_produces_json_output():
    stream = io.StringIO()
    _configure_test_logging("ml-engine", stream)
    logger = structlog.get_logger()
    logger.info("test_event", key="value")
    output = stream.getvalue().strip()
    parsed = json.loads(output)
    assert parsed["event"] == "test_event"
    assert parsed["key"] == "value"


def test_log_entries_contain_required_keys():
    stream = io.StringIO()
    _configure_test_logging("ml-engine", stream)
    logger = structlog.get_logger()
    logger.info("hello", extra_key="data")
    parsed = json.loads(stream.getvalue().strip())
    assert "timestamp" in parsed
    assert "level" in parsed
    assert "event" in parsed


def test_log_levels_are_consistent():
    stream = io.StringIO()
    _configure_test_logging("ml-engine", stream)
    logger = structlog.get_logger()

    logger.info("info_msg")
    lines = stream.getvalue().strip().split("\n")
    info_entry = json.loads(lines[-1])
    assert info_entry["level"] == "info"

    logger.warning("warn_msg")
    lines = stream.getvalue().strip().split("\n")
    warn_entry = json.loads(lines[-1])
    assert warn_entry["level"] == "warning"

    logger.error("err_msg")
    lines = stream.getvalue().strip().split("\n")
    err_entry = json.loads(lines[-1])
    assert err_entry["level"] == "error"


def test_exception_logging_includes_traceback():
    stream = io.StringIO()
    _configure_test_logging("ml-engine", stream)
    logger = structlog.get_logger()
    try:
        raise ValueError("test error")
    except ValueError:
        logger.exception("caught_error")
    output = stream.getvalue().strip()
    parsed = json.loads(output)
    assert "exception" in parsed or "exc_info" in parsed or "ValueError" in output


def test_structlog_does_not_break_existing_logging():
    stream = io.StringIO()
    _configure_test_logging("ml-engine", stream)
    # stdlib logger should still work
    stdlib_logger = logging.getLogger("test_stdlib")
    handler = logging.StreamHandler(io.StringIO())
    stdlib_logger.addHandler(handler)
    stdlib_logger.setLevel(logging.INFO)
    stdlib_logger.info("stdlib message")
    # No exception means they coexist
