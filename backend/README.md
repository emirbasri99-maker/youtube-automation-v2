# Shorts Factory Backend

YouTube Shorts AI Production Engine using Fal.ai

## Setup

1. Install Python 3.10+
2. Create virtual environment:
```bash
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Configure `.env` file:
```
FAL_KEY=your_fal_key_here
GEMINI_API_KEY=your_gemini_key_here
PORT=8000
```

## Running the Server

```bash
python shorts_server.py
```

API will be available at: http://localhost:8000
API Docs: http://localhost:8000/docs

## API Endpoints

### POST /api/shorts/generate
Start a new shorts generation job

Request:
```json
{
  "mode": "idea",
  "content": "A lone astronaut discovers an alien flower on Mars",
  "target_duration": 60,
  "scene_duration_min": 8,
  "scene_duration_max": 15
}
```

Response:
```json
{
  "job_id": "uuid",
  "status": "queued",
  "message": "Job started"
}
```

### GET /api/shorts/status/{job_id}
Get job status and results

Response:
```json
{
  "job_id": "uuid",
  "status": "completed",
  "progress": 100,
  "current_scene": 5,
  "total_scenes": 5,
  "videos": [
    {
      "scene_id": 1,
      "voiceover": "...",
      "image_url": "https://...",
      "video_url": "https://...",
      "duration": 10
    }
  ]
}
```

## Testing

Test the module directly:
```bash
python shorts_factory.py
```
