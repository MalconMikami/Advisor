"""
Rotas POC para análise de sentimento — /api/poc/sentiment/...
"""
from __future__ import annotations

import os

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session as DBSession

from database import Transcript, get_db
from sentiment import EmotionResult, SentimentAnalyzer

router = APIRouter(prefix="/api/poc/sentiment", tags=["poc-sentiment"])


class AnalyzeRequest(BaseModel):
    text: str


@router.post("/analyze", response_model=EmotionResult)
async def analyze_text(body: AnalyzeRequest):
    """Analisa um texto avulso — útil para testes manuais via Swagger UI."""
    key = os.getenv("OPENAI_API_KEY")
    if not key:
        raise HTTPException(500, "OPENAI_API_KEY não configurada")
    if not body.text.strip():
        raise HTTPException(400, "Texto vazio")

    analyzer = SentimentAnalyzer(api_key=key)
    result = await analyzer.analyze(body.text)
    return result


@router.get("/session/{session_id}")
def get_session_emotions(session_id: str, db: DBSession = Depends(get_db)):
    """Retorna histórico de emoções de uma sessão salva (somente transcrições com emoção)."""
    rows = (
        db.query(Transcript)
        .filter(
            Transcript.session_id == session_id,
            Transcript.emotion.isnot(None),
        )
        .order_by(Transcript.timestamp)
        .all()
    )

    return [
        {
            "id": t.id,
            "speaker_id": t.speaker_id,
            "speaker_name": t.speaker_name,
            "text": t.text,
            "timestamp": t.timestamp,
            "emotion": {
                "emotion": t.emotion,
                "valence": t.valence,
                "arousal": t.arousal,
                "confidence": t.emotion_confidence,
                "keywords": t.emotion_keywords.split(",") if t.emotion_keywords else [],
            },
        }
        for t in rows
    ]
