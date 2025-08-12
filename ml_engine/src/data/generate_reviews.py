"""
Synthetic review data generator for sentiment model training.

Generates realistic travel reviews with sentiment labels
for fine-tuning the sentiment classifier.
"""

import random
from typing import List, Tuple
from dataclasses import dataclass


@dataclass
class Review:
    """Synthetic user review."""
    text: str
    sentiment: str  # positive, negative, neutral
    destination: str
    rating: int  # 1-5


# Review templates by sentiment
POSITIVE_TEMPLATES = [
    "Amazing trip to {dest}! The {aspect} was absolutely incredible. Would definitely recommend to anyone looking for a {adj} vacation.",
    "Best travel experience ever! {dest} exceeded all my expectations. The {aspect} were top-notch and the {aspect2} was perfect.",
    "Loved every moment in {dest}. The booking process was seamless and the {aspect} was exactly as described. 5 stars!",
    "Outstanding service from start to finish. {dest} is now my favorite destination. The {aspect} alone made the trip worth it.",
    "{dest} was a dream come true! Perfect weather, amazing {aspect}, and the {aspect2} was unbelievable. Can't wait to go back!",
    "Highly recommend {dest}! The {aspect} was fantastic and everything was so well organized. Best vacation I've had in years.",
    "What a wonderful experience in {dest}! The {aspect} was breathtaking and the {aspect2} exceeded expectations.",
    "Absolutely perfect trip to {dest}. From the {aspect} to the {aspect2}, everything was flawless. Already planning my return!",
]

NEGATIVE_TEMPLATES = [
    "Disappointed with my trip to {dest}. The {aspect} was terrible and nothing like the photos. Would not recommend.",
    "Worst travel experience ever. {dest} was overcrowded and the {aspect} was in poor condition. Complete waste of money.",
    "Very unhappy with the booking. {dest} did not meet expectations at all. The {aspect} was dirty and the {aspect2} was rude.",
    "Do not book this! {dest} was nothing like advertised. The {aspect} was broken and customer service was unhelpful.",
    "Terrible experience in {dest}. The {aspect} was awful, the {aspect2} was overpriced, and nothing went as planned.",
    "Major issues with my {dest} trip. The {aspect} was completely different from the listing. Very disappointing.",
    "Regret booking this trip to {dest}. The {aspect} was subpar and the {aspect2} left much to be desired.",
    "Avoid {dest} at all costs. Overrated and overpriced. The {aspect} was mediocre at best.",
]

NEUTRAL_TEMPLATES = [
    "My trip to {dest} was okay. The {aspect} was decent but nothing special. Average experience overall.",
    "{dest} met basic expectations. The {aspect} was fine, though the {aspect2} could have been better.",
    "Mixed feelings about {dest}. Some things were good like the {aspect}, but the {aspect2} was just okay.",
    "Standard trip to {dest}. Nothing particularly wrong, but nothing exceptional either. The {aspect} was adequate.",
    "{dest} was alright. The {aspect} was as expected. Not bad, not great. Would consider returning.",
    "Fair experience in {dest}. The {aspect} was satisfactory and the {aspect2} was acceptable.",
    "Middle-of-the-road trip to {dest}. The {aspect} was passable. Not disappointed but not impressed.",
    "Average vacation in {dest}. Some good moments with the {aspect}, some not-so-good with the {aspect2}.",
]

DESTINATIONS = [
    "Miami", "Toronto", "New York", "Los Angeles", "Las Vegas",
    "Cancun", "Vancouver", "Montreal", "Chicago", "Boston",
    "San Francisco", "Seattle", "Denver", "Orlando", "Hawaii",
    "Paris", "London", "Tokyo", "Barcelona", "Rome"
]

ASPECTS = [
    "hotel", "beach", "restaurant", "service", "pool", "room",
    "location", "food", "views", "amenities", "staff", "breakfast",
    "spa", "nightlife", "activities", "tours", "transportation"
]

POSITIVE_ADJECTIVES = [
    "relaxing", "memorable", "luxurious", "perfect", "wonderful",
    "amazing", "fantastic", "incredible", "unforgettable", "magical"
]


def generate_review(sentiment: str) -> Review:
    """Generate a single synthetic review."""
    dest = random.choice(DESTINATIONS)
    aspect = random.choice(ASPECTS)
    aspect2 = random.choice([a for a in ASPECTS if a != aspect])
    adj = random.choice(POSITIVE_ADJECTIVES)
    
    if sentiment == "positive":
        template = random.choice(POSITIVE_TEMPLATES)
        rating = random.choice([4, 5])
    elif sentiment == "negative":
        template = random.choice(NEGATIVE_TEMPLATES)
        rating = random.choice([1, 2])
    else:  # neutral
        template = random.choice(NEUTRAL_TEMPLATES)
        rating = 3
    
    text = template.format(dest=dest, aspect=aspect, aspect2=aspect2, adj=adj)
    
    return Review(
        text=text,
        sentiment=sentiment,
        destination=dest,
        rating=rating
    )


def generate_dataset(
    n_samples: int = 25000,
    pos_ratio: float = 0.4,
    neg_ratio: float = 0.3,
    neu_ratio: float = 0.3
) -> Tuple[List[str], List[str]]:
    """
    Generate a balanced dataset of synthetic reviews.
    
    Args:
        n_samples: Total number of reviews
        pos_ratio: Fraction of positive reviews
        neg_ratio: Fraction of negative reviews
        neu_ratio: Fraction of neutral reviews
        
    Returns:
        Tuple of (texts, labels)
    """
    n_pos = int(n_samples * pos_ratio)
    n_neg = int(n_samples * neg_ratio)
    n_neu = n_samples - n_pos - n_neg
    
    reviews = []
    
    # Generate positive reviews
    for _ in range(n_pos):
        reviews.append(generate_review("positive"))
    
    # Generate negative reviews
    for _ in range(n_neg):
        reviews.append(generate_review("negative"))
    
    # Generate neutral reviews
    for _ in range(n_neu):
        reviews.append(generate_review("neutral"))
    
    # Shuffle
    random.shuffle(reviews)
    
    texts = [r.text for r in reviews]
    labels = [r.sentiment for r in reviews]
    
    return texts, labels


def save_dataset(texts: List[str], labels: List[str], path: str):
    """Save dataset to CSV."""
    import csv
    import os
    
    os.makedirs(os.path.dirname(path), exist_ok=True)
    
    with open(path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['text', 'sentiment'])
        for text, label in zip(texts, labels):
            writer.writerow([text, label])


if __name__ == "__main__":
    print("Generating 25,000 synthetic reviews...")
    texts, labels = generate_dataset(25000)
    
    print(f"Generated {len(texts)} reviews:")
    print(f"  Positive: {labels.count('positive')}")
    print(f"  Negative: {labels.count('negative')}")
    print(f"  Neutral: {labels.count('neutral')}")
    
    save_dataset(texts, labels, "./data/reviews.csv")
    print("Saved to ./data/reviews.csv")
