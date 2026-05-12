"""
@trip/ai-tts — Edge TTS FastAPI 컨테이너 (D8)

Phase 1 Day 1b 시점: /health 만 동작
Phase 5a Day 15-17: /synthesize 채움 (ko-KR-SunHiNeural)
"""
import time

from fastapi import FastAPI

app = FastAPI(title="trip-ai-tts", version="0.0.1")


@app.get("/health")
def health() -> dict:
    return {"ok": True, "service": "ai-tts", "ts": int(time.time() * 1000)}


# Phase 5a 에서 채울 endpoint:
#
# @app.post("/synthesize")
# async def synthesize(req: SynthesizeRequest) -> StreamingResponse:
#     """edge-tts (ko-KR-SunHiNeural) 텍스트→mp3 stream"""
#     ...
