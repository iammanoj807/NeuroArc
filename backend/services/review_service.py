import json
import os
from typing import List, Dict, Any
from datetime import datetime
import uuid

# Define the data directory and file path
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
REVIEWS_FILE = os.path.join(DATA_DIR, "reviews.json")

def _ensure_data_file():
    """Ensure the data directory and reviews file exist."""
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)
    
    if not os.path.exists(REVIEWS_FILE):
        with open(REVIEWS_FILE, 'w') as f:
            json.dump([], f)

def get_all_reviews() -> List[Dict[str, Any]]:
    """Retrieve all reviews from storage."""
    _ensure_data_file()
    try:
        with open(REVIEWS_FILE, 'r') as f:
            return json.load(f)
    except json.JSONDecodeError:
        return []

def add_review(name: str, rating: int, comment: str) -> Dict[str, Any]:
    """Add a new review to storage."""
    _ensure_data_file()
    
    # Create new review object
    new_review = {
        "id": str(uuid.uuid4()),
        "name": name,
        "rating": rating,
        "comment": comment,
        "date": datetime.now().isoformat()
    }
    
    # Read existing reviews
    try:
        with open(REVIEWS_FILE, 'r') as f:
            reviews = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        reviews = []
    
    # Prepend new review (newest first)
    reviews.insert(0, new_review)
    
    # Save back to file
    with open(REVIEWS_FILE, 'w') as f:
        json.dump(reviews, f, indent=2)
        
    return new_review

def delete_review(review_id: str) -> bool:
    """Delete a review by ID."""
    _ensure_data_file()
    
    try:
        with open(REVIEWS_FILE, 'r') as f:
            reviews = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return False
    
    # Filter out the review to delete
    initial_count = len(reviews)
    reviews = [r for r in reviews if r.get('id') != review_id]
    
    if len(reviews) == initial_count:
        return False  # Review not found
    
    # Save changes
    with open(REVIEWS_FILE, 'w') as f:
        json.dump(reviews, f, indent=2)
        
    return True
