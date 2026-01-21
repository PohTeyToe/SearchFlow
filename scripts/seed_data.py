#!/usr/bin/env python3
"""
Seed script to generate initial data for SearchFlow.

This script can be run standalone to populate the warehouse
with sample data for testing and demos.
"""

import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from event_generator.src.config import Config
from event_generator.src.generator import EventGenerator
from event_generator.src.publishers import FilePublisher


def main():
    """Generate seed data for the warehouse."""
    print("🌱 Seeding SearchFlow with sample data...")
    print()
    
    # Configuration
    num_sessions = 1000
    output_dir = os.getenv('OUTPUT_DIR', '/data/raw')
    
    # Create generator and publisher
    config = Config()
    generator = EventGenerator(config)
    publisher = FilePublisher(output_dir=output_dir)
    
    # Generate events
    events_generated = 0
    for i in range(num_sessions):
        for event in generator.generate_session():
            publisher.publish(event)
            events_generated += 1
        
        if (i + 1) % 100 == 0:
            print(f"   Generated {i + 1}/{num_sessions} sessions ({events_generated} events)...")
    
    publisher.close()
    
    print()
    print(f"✅ Seed complete! Generated {events_generated} events from {num_sessions} sessions.")
    print(f"   Output directory: {output_dir}")


if __name__ == '__main__':
    main()
