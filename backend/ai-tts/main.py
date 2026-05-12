"""
@trip/ai-tts — Edge TTS FastAPI 컨테이너 (D8)

Phase 1 Day 3 시점: /health + /synthesize stub (501)
Phase 5a Day 15-17: /synthesize 실제 구현 (edge-tts ko-KR-SunHiNeural → mp3 stream)
"""
import time

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="trip-ai-tts", version="0.0.1")


@app.get("/health")
def health() -> dict:
    return {"ok": True, "service": "ai-tts", "ts": int(time.time() * 1000)}


class SynthesizeRequest(BaseModel):
    text: str
    voice: str = "ko-KR-SunHiNeural"


@app.post("/synthesize")
async def synthesize(req: SynthesizeRequest):
    """
    Phase 5a Day 15-17 타겟: edge-tts (ko-KR-SunHiNeural) 텍스트→mp3 StreamingResponse.
    현재는 stub — 501 Not Implemented.
    """
    raise HTTPException(
        status_code=501,
        detail="Not implemented yet (Phase 5a target)",
    )
