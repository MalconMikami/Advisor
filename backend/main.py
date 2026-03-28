"""
API principal: FastAPI + WebSockets para transcrição em tempo real.
"""

import os
import uuid
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Optional

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.orm import Session as DBSession

from audio_capture import AudioCapture
from database import Session, SessionLocal, Transcript, get_db, init_db
from export import export_pdf, export_txt
from sentiment import SentimentAnalyzer
from sentiment_router import router as sentiment_router
from session_manager import RecordingSession
from summary import SummaryGenerator
from transcription import WhisperTranscriber

load_dotenv()

# ── estado global ─────────────────────────────────────────────────────────────
active_sessions: dict[str, RecordingSession] = {}
ws_connections: dict[str, list[WebSocket]] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield
    for rec in active_sessions.values():
        await rec.stop()


app = FastAPI(title="Advisor Transcription API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sentiment_router)


# ── schemas ───────────────────────────────────────────────────────────────────
class SessionCreate(BaseModel):
    advisor_name: str
    client_name: str
    description: Optional[str] = None
    language: str = "pt"


# ── helpers ───────────────────────────────────────────────────────────────────
def _session_row(s: Session) -> dict:
    return {
        "id": s.id,
        "advisor_name": s.advisor_name,
        "client_name": s.client_name,
        "description": s.description,
        "language": s.language,
        "created_at": s.created_at.isoformat(),
        "ended_at": s.ended_at.isoformat() if s.ended_at else None,
        "has_summary": bool(s.summary),
        "transcript_count": len(s.transcripts),
    }


def _transcript_row(t: Transcript) -> dict:
    return {
        "id": t.id,
        "speaker_id": t.speaker_id,
        "speaker_name": t.speaker_name,
        "text": t.text,
        "timestamp": t.timestamp,
    }


def _require_openai_key() -> str:
    key = os.getenv("OPENAI_API_KEY")
    if not key:
        raise HTTPException(500, "OPENAI_API_KEY não configurada")
    return key


# ── REST endpoints ────────────────────────────────────────────────────────────
@app.get("/api/devices")
def list_devices():
    return AudioCapture.list_devices()


@app.post("/api/sessions", status_code=201)
def create_session(data: SessionCreate, db: DBSession = Depends(get_db)):
    session = Session(
        id=str(uuid.uuid4()),
        advisor_name=data.advisor_name,
        client_name=data.client_name,
        description=data.description,
        language=data.language,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return _session_row(session)


@app.get("/api/sessions")
def list_sessions(db: DBSession = Depends(get_db)):
    sessions = db.query(Session).order_by(Session.created_at.desc()).all()
    return [_session_row(s) for s in sessions]


@app.get("/api/sessions/{session_id}")
def get_session(session_id: str, db: DBSession = Depends(get_db)):
    s = db.query(Session).filter(Session.id == session_id).first()
    if not s:
        raise HTTPException(404, "Sessão não encontrada")
    result = _session_row(s)
    result["summary"] = s.summary
    result["transcripts"] = [_transcript_row(t) for t in s.transcripts]
    return result


@app.delete("/api/sessions/{session_id}", status_code=204)
def delete_session(session_id: str, db: DBSession = Depends(get_db)):
    s = db.query(Session).filter(Session.id == session_id).first()
    if not s:
        raise HTTPException(404, "Sessão não encontrada")
    db.query(Transcript).filter(Transcript.session_id == session_id).delete()
    db.delete(s)
    db.commit()


@app.post("/api/sessions/{session_id}/summary")
async def generate_summary(session_id: str, db: DBSession = Depends(get_db)):
    s = db.query(Session).filter(Session.id == session_id).first()
    if not s:
        raise HTTPException(404, "Sessão não encontrada")
    if not s.transcripts:
        raise HTTPException(400, "Nenhuma transcrição para resumir")

    key = _require_openai_key()
    gen = SummaryGenerator(api_key=key)
    summary = await gen.generate(
        {"advisor_name": s.advisor_name, "client_name": s.client_name},
        [_transcript_row(t) for t in s.transcripts],
    )

    s.summary = summary
    db.commit()
    return {"summary": summary}


@app.get("/api/sessions/{session_id}/export/pdf")
def export_session_pdf(session_id: str, db: DBSession = Depends(get_db)):
    s = db.query(Session).filter(Session.id == session_id).first()
    if not s:
        raise HTTPException(404, "Sessão não encontrada")

    session_data = {
        "advisor_name": s.advisor_name,
        "client_name": s.client_name,
        "created_at": s.created_at.isoformat(),
        "summary": s.summary,
    }
    transcripts = [_transcript_row(t) for t in s.transcripts]
    pdf = export_pdf(session_data, transcripts)
    filename = f"transcricao_{s.client_name}_{s.created_at.strftime('%Y%m%d')}.pdf"
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.get("/api/sessions/{session_id}/export/txt")
def export_session_txt(session_id: str, db: DBSession = Depends(get_db)):
    s = db.query(Session).filter(Session.id == session_id).first()
    if not s:
        raise HTTPException(404, "Sessão não encontrada")

    session_data = {
        "advisor_name": s.advisor_name,
        "client_name": s.client_name,
        "created_at": s.created_at.isoformat(),
        "summary": s.summary,
    }
    transcripts = [_transcript_row(t) for t in s.transcripts]
    txt = export_txt(session_data, transcripts)
    filename = f"transcricao_{s.client_name}_{s.created_at.strftime('%Y%m%d')}.txt"
    return Response(
        content=txt,
        media_type="text/plain; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ── WebSocket ─────────────────────────────────────────────────────────────────
@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await websocket.accept()

    ws_connections.setdefault(session_id, []).append(websocket)

    async def broadcast(msg: dict):
        for conn in ws_connections.get(session_id, [])[:]:
            try:
                await conn.send_json(msg)
            except Exception:
                pass

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "start":
                if session_id in active_sessions:
                    await broadcast({"type": "error", "data": {"message": "Sessão já está gravando"}})
                    continue

                key = os.getenv("OPENAI_API_KEY")
                if not key:
                    await broadcast({"type": "error", "data": {"message": "OPENAI_API_KEY não configurada"}})
                    continue

                # Busca o idioma da sessão no banco
                db = SessionLocal()
                try:
                    db_session = db.query(Session).filter(Session.id == session_id).first()
                    language = db_session.language if db_session else "pt"
                finally:
                    db.close()

                whisper = WhisperTranscriber(api_key=key, language=language)
                sentiment = SentimentAnalyzer(api_key=key)
                rec = RecordingSession(
                    session_id=session_id,
                    whisper=whisper,
                    device_index=data.get("device_index"),
                    sentiment=sentiment,
                )
                rec.add_callback(broadcast)
                active_sessions[session_id] = rec
                await rec.start()
                await broadcast({"type": "status", "data": {"recording": True}})

            elif msg_type == "stop":
                if session_id in active_sessions:
                    await active_sessions.pop(session_id).stop()
                    await broadcast({"type": "status", "data": {"recording": False}})

            elif msg_type == "rename_speaker":
                if session_id in active_sessions:
                    active_sessions[session_id].rename_speaker(
                        data["speaker_id"], data["name"]
                    )
                    await broadcast(
                        {
                            "type": "speaker_renamed",
                            "data": {"speaker_id": data["speaker_id"], "name": data["name"]},
                        }
                    )

    except WebSocketDisconnect:
        pass
    finally:
        conns = ws_connections.get(session_id, [])
        if websocket in conns:
            conns.remove(websocket)
