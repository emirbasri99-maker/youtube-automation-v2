"""
FastAPI Server for Shorts Factory
Provides REST API endpoints for frontend integration
"""

import asyncio
import uuid
from typing import Dict, Optional, Literal
from datetime import datetime
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

from shorts_factory import ShortsFactory, VideoScene

# Initialize FastAPI
app = FastAPI(title="Shorts Factory API", version="1.0.0")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory job storage (use Redis/DB in production)
jobs: Dict[str, Dict] = {}


# Request/Response Models
class ShortsRequest(BaseModel):
    mode: Literal["idea", "manual"] = "idea"
    content: str
    target_duration: int = 60
    scene_duration_min: int = 8
    scene_duration_max: int = 15


class JobResponse(BaseModel):
    job_id: str
    status: Literal["queued", "processing", "completed", "failed"]
    message: str


class JobStatus(BaseModel):
    job_id: str
    status: Literal["queued", "processing", "completed", "failed"]
    progress: int  # 0-100
    current_scene: int
    total_scenes: int
    message: str
    videos: list = []
    error: Optional[str] = None
    created_at: str
    completed_at: Optional[str] = None


# Background task to process shorts
def process_shorts_job(job_id: str, request: ShortsRequest):
    """Background task to process shorts generation"""
    
    try:
        jobs[job_id]['status'] = 'processing'
        jobs[job_id]['message'] = 'Initializing...'
        
        factory = ShortsFactory()
        
        def progress_callback(data):
            """Update job progress"""
            jobs[job_id]['progress'] = int((data['current'] / data['total']) * 100)
            jobs[job_id]['current_scene'] = data['current']
            jobs[job_id]['total_scenes'] = data['total']
            jobs[job_id]['message'] = data['message']
        
        # Process shorts
        results = factory.process_shorts(
            user_input=request.content,
            mode=request.mode,
            target_duration=request.target_duration,
            scene_duration_range=(request.scene_duration_min, request.scene_duration_max),
            progress_callback=progress_callback
        )
        
        # Convert results to dict
        videos = [
            {
                'scene_id': scene.scene_id,
                'voiceover': scene.voiceover,
                'image_url': scene.image_url,
                'video_url': scene.video_url,
                'duration': scene.duration
            }
            for scene in results
        ]
        
        jobs[job_id]['videos'] = videos
        jobs[job_id]['status'] = 'completed'
        jobs[job_id]['progress'] = 100
        jobs[job_id]['message'] = f'Completed {len(videos)} scenes!'
        jobs[job_id]['completed_at'] = datetime.now().isoformat()
        
    except Exception as e:
        jobs[job_id]['status'] = 'failed'
        jobs[job_id]['error'] = str(e)
        jobs[job_id]['message'] = f'Error: {str(e)}'
        jobs[job_id]['completed_at'] = datetime.now().isoformat()
        print(f"❌ Job {job_id} failed: {e}")


@app.post("/api/shorts/generate", response_model=JobResponse)
async def generate_shorts(request: ShortsRequest, background_tasks: BackgroundTasks):
    """
    Start a new shorts generation job
    """
    
    # Create job ID
    job_id = str(uuid.uuid4())
    
    # Initialize job
    jobs[job_id] = {
        'job_id': job_id,
        'status': 'queued',
        'progress': 0,
        'current_scene': 0,
        'total_scenes': 0,
        'message': 'Job queued',
        'videos': [],
        'error': None,
        'created_at': datetime.now().isoformat(),
        'completed_at': None
    }
    
    # Add to background tasks
    background_tasks.add_task(process_shorts_job, job_id, request)
    
    return JobResponse(
        job_id=job_id,
        status="queued",
        message="Shorts generation job started"
    )


@app.get("/api/shorts/status/{job_id}", response_model=JobStatus)
async def get_job_status(job_id: str):
    """
    Get status of a shorts generation job
    """
    
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return JobStatus(**jobs[job_id])


@app.delete("/api/shorts/{job_id}")
async def cancel_job(job_id: str):
    """
    Cancel or delete a job
    """
    
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    del jobs[job_id]
    return {"message": "Job deleted"}


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Shorts Factory API",
        "active_jobs": len([j for j in jobs.values() if j['status'] in ['queued', 'processing']])
    }


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Shorts Factory API",
        "version": "1.0.0",
        "docs": "/docs"
    }


if __name__ == "__main__":
    import os
    port = int(os.getenv("PORT", 8000))
    
    print(f"""
    {'='*60}
    🚀 Shorts Factory API Server
    {'='*60}
    
    📡 Server running on: http://localhost:{port}
    📚 API Docs: http://localhost:{port}/docs
    🏥 Health Check: http://localhost:{port}/api/health
    
    {'='*60}
    """)
    
    uvicorn.run(
        "shorts_server:app",
        host="0.0.0.0",
        port=port,
        reload=True
    )
