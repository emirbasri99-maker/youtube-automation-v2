"""
Edge-TTS Server
Free text-to-speech using Microsoft Edge TTS
Replaces ElevenLabs API

Endpoints:
  GET  /api/tts/voices    - List all available voices grouped by language
  POST /api/tts/synthesize - Generate audio from text
  POST /api/tts/preview   - Generate short voice preview
"""

import asyncio
import os
import uuid
import edge_tts
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional

app = FastAPI(title="Edge-TTS Server", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Audio output directory
AUDIO_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "public", "temp", "audio")
os.makedirs(AUDIO_DIR, exist_ok=True)

# Cache voices list
_voices_cache = None


class SynthesizeRequest(BaseModel):
    text: str
    voice: str = "en-US-GuyNeural"
    rate: str = "+0%"


class PreviewRequest(BaseModel):
    voice: str = "en-US-GuyNeural"


async def get_all_voices():
    """Fetch and cache all edge-tts voices"""
    global _voices_cache
    if _voices_cache is not None:
        return _voices_cache

    voices = await edge_tts.list_voices()

    # Group by language
    grouped = {}
    for v in voices:
        locale = v["Locale"]
        lang_name = v.get("LocaleName", locale)

        if locale not in grouped:
            grouped[locale] = {
                "locale": locale,
                "language": lang_name,
                "voices": []
            }

        grouped[locale]["voices"].append({
            "name": v["ShortName"],
            "displayName": v["FriendlyName"].replace("Microsoft Server Speech Text to Speech Voice ", "").replace(f"({v['Locale']}, ", "(").rstrip(")") + ")",
            "gender": v["Gender"],
            "locale": locale,
        })

    # Sort by language name
    result = sorted(grouped.values(), key=lambda x: x["language"])

    # Move English-US to top
    en_us = next((l for l in result if l["locale"] == "en-US"), None)
    if en_us:
        result.remove(en_us)
        result.insert(0, en_us)

    _voices_cache = result
    return result


@app.get("/api/tts/voices")
async def list_voices():
    """Get all available voices grouped by language"""
    try:
        voices = await get_all_voices()
        return {"voices": voices}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/tts/synthesize")
async def synthesize(req: SynthesizeRequest):
    """Generate audio from text"""
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    filename = f"{uuid.uuid4()}.mp3"
    filepath = os.path.join(AUDIO_DIR, filename)

    try:
        communicate = edge_tts.Communicate(
            text=req.text,
            voice=req.voice,
            rate=req.rate,
        )
        await communicate.save(filepath)

        return FileResponse(
            filepath,
            media_type="audio/mpeg",
            filename=filename,
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "X-Audio-Filename": filename,
            }
        )
    except Exception as e:
        if os.path.exists(filepath):
            os.remove(filepath)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/tts/preview")
async def preview(req: PreviewRequest):
    """Generate a short preview of a voice"""
    preview_text = "Hello! This is a preview of my voice. I hope you like how I sound."
    filename = f"preview_{req.voice.replace('-', '_')}_{uuid.uuid4().hex[:8]}.mp3"
    filepath = os.path.join(AUDIO_DIR, filename)

    try:
        communicate = edge_tts.Communicate(
            text=preview_text,
            voice=req.voice,
        )
        await communicate.save(filepath)

        return FileResponse(
            filepath,
            media_type="audio/mpeg",
            filename=filename,
        )
    except Exception as e:
        if os.path.exists(filepath):
            os.remove(filepath)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/tts/health")
async def health():
    return {"status": "ok", "service": "Edge-TTS Server"}


if __name__ == "__main__":
    import uvicorn
    port = 5050
    print(f"""
    {'='*50}
    🎤 Edge-TTS Server
    {'='*50}

    📡 Server: http://localhost:{port}
    📚 Docs:   http://localhost:{port}/docs
    🏥 Health: http://localhost:{port}/api/tts/health

    {'='*50}
    """)
    uvicorn.run("tts_server:app", host="0.0.0.0", port=port, reload=True)
