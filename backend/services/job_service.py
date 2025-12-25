"""
Job Service - Reed API Integration
Searches jobs from Reed.co.uk API (UK's largest job board)
"""
import httpx
import os
import base64
from typing import Optional, List, Dict, Any
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class JobService:
    """Service for fetching jobs from Reed API"""
    
    BASE_URL = "https://www.reed.co.uk/api/1.0"
    
    def __init__(self):
        self.api_key = os.getenv("REED_API_KEY", "")
        
        if not self.api_key:
            logger.warning("⚠️ REED_API_KEY not found. Job search will not work.")
            
        credentials = f"{self.api_key}:"
        self.auth_header = base64.b64encode(credentials.encode()).decode()
    
    def _check_api_key(self) -> Optional[Dict[str, Any]]:
        """Check if API key exists, return error dict if not"""
        if not self.api_key:
            return {
                "success": False,
                "error": "API Key missing. Please set REED_API_KEY in environment variables.",
                "jobs": []
            }
        return None
    
    async def search_jobs(
        self,
        query: str,
        location: Optional[str] = None,
        country: str = "gb",
        page: int = 1,
        results_per_page: int = 100,
        full_time: Optional[bool] = None,
        part_time: Optional[bool] = None,
        permanent: Optional[bool] = None,
        contract: Optional[bool] = None
    ) -> Dict[str, Any]:
        """
        Search for jobs using Reed API
        
        Args:
            query: Search keywords (e.g., "Machine Learning Engineer")
            location: Location filter (e.g., "London", "Manchester")
            country: Country code (Reed is UK only)
            page: Page number
            results_per_page: Number of results per page (max 100)
            full_time: Filter for full-time positions
            part_time: Filter for part-time positions
            permanent: Filter for permanent roles
            contract: Filter for contract positions
        
        Returns:
            Dictionary with job results and metadata
        """
        # Validate API key first
        error_check = self._check_api_key()
        if error_check:
            return error_check
            
        # Reed API has a hard limit of 100 results per request
        MAX_PER_REQUEST = 100
        
        # Calculate how many requests we need
        # If user asks for 200, we need 2 requests of 100
        total_needed = results_per_page
        
        all_jobs = []
        seen_job_ids = set() # Track IDs to prevent duplicates
        total_found = 0
        
        # Current offset
        # e.g. Page 1, limit 200 -> start at 0
        current_skip = (page - 1) * results_per_page
        
        fetched_count = 0
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                while fetched_count < total_needed:
                    # Determine how many to take in this batch
                    remaining = total_needed - fetched_count
                    take = min(remaining, MAX_PER_REQUEST)
                    
                    params = {
                        "keywords": query,
                        "resultsToTake": take,
                        "resultsToSkip": current_skip + fetched_count
                    }
                    
                    if location:
                        params["locationName"] = location
                        params["distanceFromLocation"] = "0" # Strict location search (must be string for some APIs)
                        
                    # Add Reed API filters
                    if full_time is not None:
                        params["fullTime"] = str(full_time).lower()
                    if part_time is not None:
                        params["partTime"] = str(part_time).lower()
                    if permanent is not None:
                        params["permanent"] = str(permanent).lower()
                    if contract is not None:
                        params["contract"] = str(contract).lower()
                    
                    headers = {
                        "Authorization": f"Basic {self.auth_header}"
                    }
                    
                    response = await client.get(
                        f"{self.BASE_URL}/search",
                        params=params,
                        headers=headers
                    )
                    response.raise_for_status()
                    data = response.json()
                    
                    batch_jobs = data.get("results", [])
                    total_found = data.get("totalResults", 0) # This is the global total
                    
                    if not batch_jobs:
                        break # No more jobs available
                    
                    # Deduplicate and add
                    for job in batch_jobs:
                        job_id = str(job.get("jobId"))
                        
                        # Strict filtering: Reed API can be fuzzy
                        
                        # Strict location filtering: Reed API is fuzzy, so we verify client-side
                        if location:
                            job_location = job.get("locationName", "").lower()
                            search_location = location.lower()
                            # If the job's location does NOT contain the search term, skip it
                            if search_location not in job_location:
                                continue
                            
                        if job_id and job_id not in seen_job_ids:
                            seen_job_ids.add(job_id)
                            all_jobs.append(job)
                        
                    fetched_count += len(batch_jobs)
                    
                    # If we got fewer than we asked for, we've reached the end
                    if len(batch_jobs) < take:
                        break
                        
                logger.info(f"Reed API: Fetched {len(all_jobs)} unique jobs (Total available: {total_found})")
                
                return {
                    "success": True,
                    "count": total_found,
                    "page": page,
                    "results_per_page": results_per_page,
                    "jobs": [self._normalize_job(job) for job in all_jobs]
                }
                
        except httpx.HTTPStatusError as e:
            logger.error(f"Reed API HTTP Error: {e.response.status_code}")
            return {
                "success": False,
                "error": f"Reed API Error: {e.response.status_code}",
                "jobs": []
            }
        except httpx.TimeoutException:
            logger.error("Reed API timeout")
            return {
                "success": False,
                "error": "Request timeout. Please try again.",
                "jobs": []
            }
        except Exception as e:
            logger.error(f"Reed API error: {str(e)}")
            return {
                "success": False,
                "error": f"Error fetching jobs: {str(e)}",
                "jobs": []
            }
    
    async def get_job_details(self, job_id: str) -> Dict[str, Any]:
        """
        Get detailed information about a specific job
        
        Args:
            job_id: Reed job ID
        
        Returns:
            Dictionary with full job details
        """
        # FIX: Check API key
        error_check = self._check_api_key()
        if error_check:
            return error_check
        
        headers = {
            "Authorization": f"Basic {self.auth_header}"
        }
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.BASE_URL}/jobs/{job_id}",
                    headers=headers
                )
                response.raise_for_status()
                job = response.json()
                
                logger.info(f"Reed API: Fetched details for job {job_id}")
                
                return {
                    "success": True,
                    "job": self._normalize_job(job, full_details=True)
                }
        except httpx.HTTPStatusError as e:
            logger.error(f"Reed API error fetching job {job_id}: {e.response.status_code}")
            return {
                "success": False,
                "error": f"Job not found or API error: {e.response.status_code}"
            }
        except Exception as e:
            logger.error(f"Error fetching job details: {str(e)}")
            return {
                "success": False,
                "error": f"Error: {str(e)}"
            }
    
    def _normalize_job(self, job: Dict[str, Any], full_details: bool = False) -> Dict[str, Any]:
        """Normalize Reed job data to our standard format"""
        
        salary_min = job.get("minimumSalary")
        salary_max = job.get("maximumSalary")
        salary_display = self._format_salary(salary_min, salary_max)
        
        raw_date = job.get("date", "")
        formatted_date = self._format_date(raw_date)
        
        contract_time = "Unknown"
        if job.get("fullTime") and job.get("partTime"):
            contract_time = "Full Time / Part Time"
        elif job.get("fullTime"):
            contract_time = "Full Time"
        elif job.get("partTime"):
            contract_time = "Part Time"
            
        normalized = {
            "id": str(job.get("jobId", "")),
            "title": job.get("jobTitle", "Unknown Title"),
            "company": job.get("employerName", "Unknown Company"),
            "location": job.get("locationName", "Unknown Location"),
            "description": job.get("jobDescription", ""),
            "salary_min": salary_min,
            "salary_max": salary_max,
            "salary_display": salary_display,
            "contract_type": job.get("contractType", ""),
            "contract_time": contract_time,
            "category": job.get("jobType", ""),
            "redirect_url": job.get("jobUrl", ""),
            "created": formatted_date,
            "date_display": raw_date,
            "expiration_date": job.get("expirationDate", ""),
            "posted_by": job.get("employerName", ""),
            "source": "Reed.co.uk"
        }
        
        if full_details:
            normalized["applications"] = job.get("applications", 0)
            normalized["employer_profile_url"] = job.get("employerProfileUrl", "")
        
        return normalized
    
    def _format_date(self, date_str: str) -> str:
        """Convert Reed date format (DD/MM/YYYY) to ISO format"""
        if not date_str:
            return ""
        try:
            parsed = datetime.strptime(date_str, "%d/%m/%Y")
            return parsed.isoformat()
        except ValueError:
            try:
                parsed = datetime.strptime(date_str, "%Y-%m-%d")
                return parsed.isoformat()
            except ValueError:
                return date_str
    
    def _format_salary(
        self,
        salary_min: Optional[float],
        salary_max: Optional[float]
    ) -> str:
        """Format salary range for display"""
        if not salary_min and not salary_max:
            return "Salary not specified"
        
        if salary_min and salary_max:
            # Heuristics for salary duration
            if salary_min < 100:
                unit = "per hour"
            elif salary_min < 1000:
                unit = "per day"
            else:
                unit = "per annum"
            
            if salary_min == salary_max:
                return f"£{salary_min:,.2f} {unit}" if unit == "per hour" else f"£{salary_min:,.0f} {unit}"
            return f"£{salary_min:,.2f} - £{salary_max:,.2f} {unit}" if unit == "per hour" else f"£{salary_min:,.0f} - £{salary_max:,.0f} {unit}"
        elif salary_min:
            if salary_min < 100:
                unit = "per hour"
            elif salary_min < 1000:
                unit = "per day"
            else:
                unit = "per annum"
            return f"From £{salary_min:,.0f} {unit}"
        else:
            # If only max is present, we guess based on max
            if salary_max < 100:
                unit = "per hour"
            elif salary_max < 1000:
                unit = "per day"
            else:
                unit = "per annum"
            return f"Up to £{salary_max:,.0f} {unit}"


# Singleton instance
job_service = JobService()
