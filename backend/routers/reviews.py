from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
from services import review_service
import os

router = APIRouter()

class ReviewCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=50)
    rating: int = Field(..., ge=1, le=5)
    comment: str = Field(..., min_length=5, max_length=500)

class ReviewResponse(BaseModel):
    id: str
    name: str
    rating: int
    comment: str
    date: str

class DeleteRequest(BaseModel):
    password: str

@router.get("/", response_model=List[ReviewResponse])
async def get_reviews():
    """Get all user reviews."""
    try:
        return review_service.get_all_reviews()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=ReviewResponse)
async def submit_review(review: ReviewCreate):
    """Submit a new review."""
    try:
        return review_service.add_review(
            name=review.name,
            rating=review.rating,
            comment=review.comment
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{review_id}")
async def delete_review(review_id: str, request: DeleteRequest):
    """Delete a review (Admin only - password validated on backend)."""
    admin_password = os.getenv("ADMIN_PASSWORD")
    
    if not admin_password or request.password != admin_password:
        raise HTTPException(status_code=401, detail="Password incorrect")
    
    try:
        success = review_service.delete_review(review_id)
        if not success:
            raise HTTPException(status_code=404, detail="Review not found")
        return {"status": "success", "message": "Review deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

