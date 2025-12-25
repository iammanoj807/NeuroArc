"""
Jobs Router - API endpoints for job search
"""
from fastapi import APIRouter, Query
from typing import Optional
from services.job_service import job_service

router = APIRouter()

from pydantic import BaseModel

class SearchFilters(BaseModel):
    fullTime: bool = False
    partTime: bool = False
    permanent: bool = False
    contract: bool = False

class SearchRequest(BaseModel):
    query: str
    location: Optional[str] = None
    country: str = "gb"
    filters: SearchFilters

@router.get("/search")
async def search_jobs_get(
    q: str = Query(..., description="Search keywords"),
    location: Optional[str] = Query(None),
    country: str = Query("gb"),
    page: int = Query(1, ge=1),
    limit: int = Query(100, ge=1, le=200),
    fullTime: Optional[bool] = Query(None),
    partTime: Optional[bool] = Query(None),
    permanent: Optional[bool] = Query(None),
    contract: Optional[bool] = Query(None)
):
    """Legacy GET support for search"""
    return await job_service.search_jobs(
        query=q, location=location, country=country, page=page, results_per_page=limit,
        full_time=fullTime, part_time=partTime, permanent=permanent, contract=contract
    )

@router.post("/search")
async def search_jobs(request: SearchRequest):
    """
    Search for jobs using Reed API via POST request
    """
    result = await job_service.search_jobs(
        query=request.query,
        location=request.location,
        country=request.country,
        page=1, # Default to page 1 for new searches
        results_per_page=100,
        # Map filters
        full_time=request.filters.fullTime,
        part_time=request.filters.partTime,
        permanent=request.filters.permanent,
        contract=request.filters.contract
    )
    return result

@router.get("/countries")
async def get_supported_countries():
    """Get list of supported countries for job search"""
    return {
        "countries": [
            {"code": "gb", "name": "United Kingdom", "flag": "🇬🇧"},
            {"code": "us", "name": "United States", "flag": "🇺🇸"}
        ]
    }
