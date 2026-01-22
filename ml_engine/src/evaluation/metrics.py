"""
Evaluation metrics for ML models.
"""

import numpy as np
from typing import List, Set


def precision_at_k(predicted: List[str], actual: List[str], k: int = 10) -> float:
    """
    Calculate Precision@K for recommendations.
    
    Args:
        predicted: List of predicted items (ranked)
        actual: List of relevant items
        k: Number of top predictions to consider
        
    Returns:
        Precision@K score
    """
    if not predicted or not actual:
        return 0.0
    
    predicted_k = set(predicted[:k])
    actual_set = set(actual)
    
    hits = len(predicted_k & actual_set)
    return hits / k


def recall_at_k(predicted: List[str], actual: List[str], k: int = 10) -> float:
    """
    Calculate Recall@K for recommendations.
    
    Args:
        predicted: List of predicted items (ranked)
        actual: List of relevant items
        k: Number of top predictions to consider
        
    Returns:
        Recall@K score
    """
    if not predicted or not actual:
        return 0.0
    
    predicted_k = set(predicted[:k])
    actual_set = set(actual)
    
    hits = len(predicted_k & actual_set)
    return hits / len(actual_set)


def ndcg_at_k(predicted: List[str], actual: List[str], k: int = 10) -> float:
    """
    Calculate Normalized Discounted Cumulative Gain at K.
    
    Args:
        predicted: List of predicted items (ranked)
        actual: List of relevant items
        k: Number of top predictions to consider
        
    Returns:
        NDCG@K score
    """
    if not predicted or not actual:
        return 0.0
    
    actual_set = set(actual)
    
    # DCG
    dcg = 0.0
    for i, item in enumerate(predicted[:k]):
        if item in actual_set:
            dcg += 1.0 / np.log2(i + 2)  # i+2 because log2(1) = 0
    
    # Ideal DCG
    idcg = sum(1.0 / np.log2(i + 2) for i in range(min(len(actual), k)))
    
    return dcg / idcg if idcg > 0 else 0.0


def mean_average_precision(
    predicted_lists: List[List[str]], 
    actual_lists: List[List[str]], 
    k: int = 10
) -> float:
    """
    Calculate Mean Average Precision at K.
    
    Args:
        predicted_lists: List of prediction lists per user
        actual_lists: List of actual item lists per user
        k: Number of top predictions to consider
        
    Returns:
        MAP@K score
    """
    if not predicted_lists or not actual_lists:
        return 0.0
    
    aps = []
    for predicted, actual in zip(predicted_lists, actual_lists):
        if not actual:
            continue
        
        actual_set = set(actual)
        hits = 0
        sum_precisions = 0.0
        
        for i, item in enumerate(predicted[:k]):
            if item in actual_set:
                hits += 1
                sum_precisions += hits / (i + 1)
        
        ap = sum_precisions / min(len(actual_set), k)
        aps.append(ap)
    
    return np.mean(aps) if aps else 0.0


def hit_rate(predicted_lists: List[List[str]], actual_lists: List[List[str]], k: int = 10) -> float:
    """
    Calculate Hit Rate (% of users with at least one relevant item in top K).
    
    Args:
        predicted_lists: List of prediction lists per user
        actual_lists: List of actual item lists per user
        k: Number of top predictions to consider
        
    Returns:
        Hit rate
    """
    if not predicted_lists or not actual_lists:
        return 0.0
    
    hits = 0
    for predicted, actual in zip(predicted_lists, actual_lists):
        if not actual:
            continue
        
        predicted_k = set(predicted[:k])
        actual_set = set(actual)
        
        if predicted_k & actual_set:
            hits += 1
    
    return hits / len(predicted_lists)


def coverage(predicted_lists: List[List[str]], all_items: Set[str], k: int = 10) -> float:
    """
    Calculate catalog coverage (% of items recommended at least once).
    
    Args:
        predicted_lists: List of prediction lists per user
        all_items: Set of all possible items
        k: Number of top predictions to consider
        
    Returns:
        Coverage score
    """
    if not predicted_lists or not all_items:
        return 0.0
    
    recommended_items = set()
    for predicted in predicted_lists:
        recommended_items.update(predicted[:k])
    
    return len(recommended_items) / len(all_items)
