"""
CV Router - API endpoints for CV upload, parsing, and generation
"""
from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from fastapi.responses import Response
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from services.cv_parser import cv_parser
from services.ai_service import ai_service
from services.pdf_generator import pdf_generator
import hashlib
import time
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# Store CV data in memory with timestamps (in production, use database or session storage)
cv_store = {}
CV_STORE_MAX_AGE = 3600  # 1 hour in seconds

def cleanup_old_cvs():
    """Remove CVs older than CV_STORE_MAX_AGE"""
    current_time = time.time()
    expired_keys = [
        key for key, value in cv_store.items()
        if current_time - value.get("timestamp", 0) > CV_STORE_MAX_AGE
    ]
    for key in expired_keys:
        del cv_store[key]
        logger.info(f"Cleaned up expired CV: {key}")

class CVGenerateRequest(BaseModel):
    cv_id: str
    job_title: str
    job_description: str
    company_name: str
    ats_analysis: Optional[Dict[str, Any]] = None

@router.post("/upload")
async def upload_cv(file: UploadFile = File(...)):
    """
    Upload and parse a CV file (PDF or DOCX)
    
    Returns extracted text, skills, and contact information.
    """
    # Cleanup old CVs periodically
    cleanup_old_cvs()
    
    try:
        # Get filename
        filename = file.filename or "unknown"
        
        # Validate file type
        if not any(filename.lower().endswith(ext) for ext in ['.pdf', '.docx', '.txt']):
            raise HTTPException(
                status_code=400,
                detail="Unsupported file format. Please upload PDF, DOCX, or TXT."
            )
        
        # Read file content
        content = await file.read()
        
        # Check if we got any content
        if not content or len(content) == 0:
            raise HTTPException(
                status_code=400,
                detail="Empty file received. Please upload a valid file."
            )
        
        if len(content) > 10 * 1024 * 1024:  # 10MB limit
            raise HTTPException(
                status_code=400,
                detail="File too large. Maximum size is 10MB."
            )
        
        # Analyze the CV
        result = cv_parser.analyze_cv(content, filename)
        
        if not result["success"]:
            raise HTTPException(
                status_code=422,
                detail=result.get("error", "Failed to parse CV")
            )
        
        # Generate a simple ID for the CV
        cv_id = hashlib.md5(content).hexdigest()[:12]
        
        # Store for later use with timestamp
        result["timestamp"] = time.time()
        cv_store[cv_id] = result
        
        logger.info(f"CV uploaded successfully: {cv_id} ({result['skills_count']} skills detected)")
        
        return {
            "success": True,
            "cv_id": cv_id,
            "filename": result["filename"],
            "format": result["format"],
            "text_length": result["text_length"],
            "skills": result["skills"],
            "skills_count": result["skills_count"],
            "contact": result["contact"],
            "education": result["education"],
            "name": result.get("name"),
            "experience_years": result.get("experience_years"),
            "detected_industry": result.get("detected_industry"),
            "preview": result["text"][:500] + "..." if len(result["text"]) > 500 else result["text"]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing CV upload: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error processing file: {str(e)}"
        )

@router.get("/{cv_id}")
async def get_cv(cv_id: str):
    """Get stored CV data by ID"""
    if cv_id not in cv_store:
        raise HTTPException(status_code=404, detail="CV not found or expired. Please upload again.")
    
    cv_data = cv_store[cv_id]
    return {
        "success": True,
        "cv_id": cv_id,
        "name": cv_data.get("name"),                          # NEW
        "skills": cv_data["skills"],
        "skills_count": cv_data["skills_count"],
        "contact": cv_data["contact"],
        "education": cv_data["education"],
        "experience_years": cv_data.get("experience_years"),  # NEW
        "detected_industry": cv_data.get("detected_industry"), # NEW
        "text_length": cv_data["text_length"],
        "filename": cv_data.get("filename"),                  # NEW
        "format": cv_data.get("format")                       # NEW
    }

@router.post("/generate")
async def generate_tailored_cv(request: CVGenerateRequest):
    """
    Generate a tailored CV for a specific job
    
    Uses AI to rewrite and optimize the CV based on the job description.
    Returns the tailored CV content.
    """
    if request.cv_id not in cv_store:
        raise HTTPException(status_code=404, detail="CV not found or expired. Please upload again.")
    
    cv_data = cv_store[request.cv_id]
    
    logger.info(f"Generating tailored CV for {request.job_title} at {request.company_name}")
    
    # Generate tailored CV (JSON)
    result = ai_service.generate_tailored_cv_json(
        cv_text=cv_data["text"],
        cv_skills=cv_data["skills"],
        job_title=request.job_title,
        job_description=request.job_description,
        company_name=request.company_name,
        ats_analysis_json=request.ats_analysis,
        contact_info=cv_data.get("contact"),
        candidate_name=cv_data.get("name")
    )
    
    if not result["success"]:
        logger.error(f"CV generation failed: {result.get('error')}")
        raise HTTPException(status_code=500, detail=result.get("error", "Generation failed"))
    
    # usage of gap analysis for preview text
    preview_text = result["data"].get("gap_analysis", "")
    if not preview_text:
        preview_text = "CV Optimized Successfully. Ready for PDF download."
        
    # Also include the JSON structure as text if user wants? 
    # Let's just return gap analysis which is cleaner.
    
    return {
        "success": True,
        "tailored_cv": preview_text,
        "job_title": request.job_title,
        "company": request.company_name
    }

@router.post("/generate/pdf")
async def generate_cv_pdf(request: CVGenerateRequest):
    """
    Generate a tailored CV as a downloadable PDF using direct JSON->PDF generation
    This is faster and more reliable than LaTeX compilation.
    """
    if request.cv_id not in cv_store:
        raise HTTPException(status_code=404, detail="CV not found or expired. Please upload again.")
    
    cv_data = cv_store[request.cv_id]
    
    logger.info(f"Generating PDF CV (JSON method) for {request.job_title} at {request.company_name}")
    
    # Generate tailored CV content as JSON
    result = ai_service.generate_tailored_cv_json(
        cv_text=cv_data["text"],
        cv_skills=cv_data["skills"],
        job_title=request.job_title,
        job_description=request.job_description,
        company_name=request.company_name,
        ats_analysis_json=request.ats_analysis,
        contact_info=cv_data.get("contact"),
        candidate_name=cv_data.get("name")
    )
    
    if not result["success"]:
        logger.error(f"CV generation failed: {result.get('error')}")
        raise HTTPException(status_code=500, detail=result.get("error", "Generation failed"))
    
    # Generate PDF directly from JSON (ReportLab)
    pdf_bytes = pdf_generator.generate_cv_from_json(result["data"])
    
    # Sanitize filename
    safe_company = "".join(c if c.isalnum() or c in " -_" else "_" for c in request.company_name)
    safe_title = "".join(c if c.isalnum() or c in " -_" else "_" for c in request.job_title)
    
    filename = f"CV_{safe_company}_{safe_title}.pdf".replace(" ", "_")
    logger.info(f"PDF generated successfully: {filename}")
    
    # Extract improvement metrics
    imp_report = result["data"].get("improvement_report", {})
    new_score = imp_report.get("new_score", "")
    skills_added = ",".join(imp_report.get("skills_added", []))
    
    headers = {
        "Content-Disposition": f"attachment; filename={filename}",
        "Access-Control-Expose-Headers": "X-New-Score, X-Skills-Added",  # Critical for CORS
        "X-New-Score": str(new_score),
        "X-Skills-Added": skills_added
    }
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers=headers
    )

@router.post("/analyze")
async def analyze_cv_fit(request: CVGenerateRequest):
    """
    Analyze CV fit for a specific job
    
    Returns detailed gap analysis including:
    - Match score (0-100)
    - Missing skills
    - Matching skills
    - Advice on how to fit
    """
    if request.cv_id not in cv_store:
        raise HTTPException(status_code=404, detail="CV not found or expired. Please upload again.")
    
    cv_data = cv_store[request.cv_id]
    
    logger.info(f"Analyzing CV fit for {request.job_title} at {request.company_name}")
    
    # Perform deep analysis
    result = ai_service.analyze_fit(
        cv_text=cv_data["text"],
        cv_skills=cv_data["skills"],
        job_title=request.job_title,
        job_description=request.job_description
    )
    
    if not result["success"]:
        logger.error(f"CV analysis failed: {result.get('error')}")
        raise HTTPException(status_code=500, detail=result.get("error", "Analysis failed"))
    
    return {
        "success": True,
        "analysis": result["data"],
        "detected_industry": cv_data.get("detected_industry", "General")
    }
