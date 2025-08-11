"""Main entry point for the SearchFlow event generator."""

import time
import signal
import sys
from datetime import datetime
from typing import Optional

import click

from .config import Config, config
from .generator import EventGenerator
from .publishers import create_publisher, Publisher


# Global flag for graceful shutdown
shutdown_requested = False


def signal_handler(signum, frame):
    """Handle shutdown signals gracefully."""
    global shutdown_requested
    print("\n⚠️  Shutdown requested, finishing current batch...")
    shutdown_requested = True


@click.command()
@click.option(
    "--mode",
    type=click.Choice(["once", "continuous", "burst"]),
    default="once",
    help="Generation mode: once (single batch), continuous (steady stream), burst (fast batch)"
)
@click.option(
    "--count",
    type=int,
    default=10000,
    help="Number of events to generate (for 'once' and 'burst' modes)"
)
@click.option(
    "--rate",
    type=int,
    default=None,
    help="Events per second (overrides config)"
)
@click.option(
    "--output",
    type=click.Choice(["file", "redis", "console", "both"]),
    default="file",
    help="Output destination"
)
@click.option(
    "--duration",
    type=int,
    default=None,
    help="Run for N seconds (continuous mode)"
)
def main(
    mode: str,
    count: int,
    rate: Optional[int],
    output: str,
    duration: Optional[int]
):
    """
    SearchFlow Event Generator
    
    Generates realistic search, click, and conversion events
    to simulate a travel search platform.
    """
    # Setup signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Update config if rate specified
    if rate:
        config.events_per_second = rate
    
    # Create generator and publisher
    generator = EventGenerator(config)
    publisher = create_publisher(output)
    
    print(f"🚀 SearchFlow Event Generator")
    print(f"   Mode: {mode}")
    print(f"   Output: {output}")
    print(f"   Rate: {config.events_per_second} events/sec")
    print()
    
    try:
        if mode == "once":
            run_batch(generator, publisher, count)
        elif mode == "burst":
            run_burst(generator, publisher, count)
        elif mode == "continuous":
            run_continuous(generator, publisher, duration)
    finally:
        publisher.close()
        print("\n✅ Generator stopped.")


def run_batch(generator: EventGenerator, publisher: Publisher, count: int):
    """Generate a fixed number of events at configured rate."""
    print(f"📊 Generating {count:,} events...")
    
    events_generated = 0
    start_time = time.time()
    
    while events_generated < count and not shutdown_requested:
        batch_start = time.time()
        batch_size = min(config.events_per_second, count - events_generated)
        
        # Generate sessions until we hit batch size
        batch_events = 0
        while batch_events < batch_size:
            for event in generator.generate_session():
                publisher.publish(event)
                batch_events += 1
                events_generated += 1
                
                if batch_events >= batch_size:
                    break
        
        # Rate limiting
        elapsed = time.time() - batch_start
        if elapsed < 1.0:
            time.sleep(1.0 - elapsed)
        
        # Progress update
        if events_generated % 1000 == 0:
            print(f"   Generated {events_generated:,} / {count:,} events...")
    
    elapsed = time.time() - start_time
    rate = events_generated / elapsed if elapsed > 0 else 0
    print(f"\n✅ Generated {events_generated:,} events in {elapsed:.1f}s ({rate:.0f}/sec)")


def run_burst(generator: EventGenerator, publisher: Publisher, count: int):
    """Generate events as fast as possible (for load testing)."""
    print(f"⚡ Burst mode: Generating {count:,} events as fast as possible...")
    
    events_generated = 0
    start_time = time.time()
    
    while events_generated < count and not shutdown_requested:
        for event in generator.generate_session():
            publisher.publish(event)
            events_generated += 1
            
            if events_generated >= count:
                break
            
            # Progress update every 10k
            if events_generated % 10000 == 0:
                elapsed = time.time() - start_time
                rate = events_generated / elapsed
                print(f"   {events_generated:,} events ({rate:.0f}/sec)...")
    
    elapsed = time.time() - start_time
    rate = events_generated / elapsed if elapsed > 0 else 0
    print(f"\n✅ Generated {events_generated:,} events in {elapsed:.1f}s ({rate:.0f}/sec)")


def run_continuous(
    generator: EventGenerator,
    publisher: Publisher,
    duration: Optional[int]
):
    """Generate events continuously at configured rate."""
    print(f"♾️  Continuous mode: {config.events_per_second} events/sec")
    if duration:
        print(f"   Duration: {duration} seconds")
    else:
        print(f"   Duration: Until interrupted (Ctrl+C)")
    print()
    
    events_generated = 0
    start_time = time.time()
    last_report_time = start_time
    
    while not shutdown_requested:
        # Check duration limit
        if duration and (time.time() - start_time) >= duration:
            break
        
        batch_start = time.time()
        
        # Generate one second worth of events
        batch_events = 0
        while batch_events < config.events_per_second:
            for event in generator.generate_session():
                publisher.publish(event)
                batch_events += 1
                events_generated += 1
                
                if batch_events >= config.events_per_second:
                    break
        
        # Rate limiting
        elapsed = time.time() - batch_start
        if elapsed < 1.0:
            time.sleep(1.0 - elapsed)
        
        # Report every 10 seconds
        now = time.time()
        if now - last_report_time >= 10:
            total_elapsed = now - start_time
            rate = events_generated / total_elapsed
            print(f"   [{datetime.now().strftime('%H:%M:%S')}] {events_generated:,} events ({rate:.0f}/sec)")
            last_report_time = now
    
    elapsed = time.time() - start_time
    rate = events_generated / elapsed if elapsed > 0 else 0
    print(f"\n✅ Generated {events_generated:,} events in {elapsed:.1f}s ({rate:.0f}/sec)")


if __name__ == "__main__":
    main()
