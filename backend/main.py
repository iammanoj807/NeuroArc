"""
NeuroArc - FastAPI Backend
AI-powered job application assistant
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Import routers
from routers import jobs, cv, reviews

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler"""
    logger.info("🚀 NeuroArc Backend starting...")
    yield
    logger.info("👋 NeuroArc Backend shutting down...")

app = FastAPI(
    title="NeuroArc",
    description="AI-powered job application assistant - Find jobs, generate tailored CVs",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration - Allow common development and production origins
allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# Add custom origins from environment if provided
custom_origins = os.getenv("CORS_ORIGINS", "").split(",")
allowed_origins.extend([origin.strip() for origin in custom_origins if origin.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Trust X-Forwarded headers from proxies (Hugging Face Spaces)
# This ensures the app knows it's being served over HTTPS
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts=["*"])

# Include routers
app.include_router(jobs.router, prefix="/api/jobs", tags=["Jobs"])
app.include_router(cv.router, prefix="/api/cv", tags=["CV"])
app.include_router(reviews.router, prefix="/api/reviews", tags=["Reviews"])

# Static Files & Frontend Serving
# Check if frontend build exists (Production/Docker mode)
frontend_dist = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "dist")

if os.path.exists(frontend_dist):
    # Serve assets (JS, CSS, Images)
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")
    
    # Catch-all for React Router - serves index.html for non-API routes
    @app.middleware("http")
    async def spa_middleware(request: Request, call_next):
        # Allow API calls to pass through
        if request.url.path.startswith("/api") or request.url.path.startswith("/docs") or request.url.path.startswith("/openapi.json"):
            return await call_next(request)
            
        # Try to serve static file if it exists directly (e.g., favicon.svg)
        full_path = os.path.join(frontend_dist, request.url.path.lstrip("/"))
        if os.path.exists(full_path) and os.path.isfile(full_path):
            return FileResponse(full_path)
            
        # Otherwise serve index.html (SPA routing)
        return FileResponse(os.path.join(frontend_dist, "index.html"))

else:
    # Dev mode / API only
    @app.get("/")
    async def root():
        return {
            "name": "NeuroArc",
            "version": "1.0.0",
            "status": "running",
            "mode": "api_only",
            "message": "Frontend build not found. Run 'npm run build' in frontend/ directory to serve UI.",
            "endpoints": {
                "jobs": "/api/jobs",
                "cv": "/api/cv",
                "docs": "/docs"
            }
        }

@app.get("/health")
async def health_check():
    """Health check endpoint with dependency status"""
    github_token = bool(os.getenv("GITHUB_TOKEN", ""))
    reed_api_key = bool(os.getenv("REED_API_KEY", ""))
    
    return {
        "status": "healthy",
        "dependencies": {
            "ai_service": "available" if github_token else "unavailable (no GITHUB_TOKEN)",
            "job_search": "available" if reed_api_key else "mock mode (no REED_API_KEY)"
        }
    }

