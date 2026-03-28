"""
Orquestra captura de áudio, transcrição e identificação de speakers por sessão.
"""

from __future__ import annotations

import asyncio
import time
import uuid
from datetime import datetime
from typing import Callable, Coroutine, Optional

from audio_capture import AudioCapture, AudioSegment
from database import SessionLocal, Session, Transcript
from diarization import SpeakerIdentifier
from transcription import WhisperTranscriber

Callback = Callable[[dict], Coroutine]


class RecordingSession:
    def __init__(
        self,
        session_id: str,
        whisper: WhisperTranscriber,
        device_index: Optional[int] = None,
    ):
        self.session_id = session_id
        self.whisper = whisper
        self.audio = AudioCapture(device_index=device_index)
        self.diarizer = SpeakerIdentifier()
        self.start_time: float = 0.0
        self.is_recording = False
        self._callbacks: list[Callback] = []
        self._task: Optional[asyncio.Task] = None

    def add_callback(self, cb: Callback):
        self._callbacks.append(cb)

    async def start(self):
        self.start_time = time.time()
        self.is_recording = True
        self.audio.start()
        self._task = asyncio.create_task(self._process_loop())

    async def stop(self):
        self.is_recording = False
        self.audio.stop()
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass

        db = SessionLocal()
        try:
            session = db.query(Session).filter(Session.id == self.session_id).first()
            if session:
                session.ended_at = datetime.utcnow()
                db.commit()
        finally:
            db.close()

    def rename_speaker(self, speaker_id: int, name: str):
        self.diarizer.rename(speaker_id, name)
        db = SessionLocal()
        try:
            rows = (
                db.query(Transcript)
                .filter(
                    Transcript.session_id == self.session_id,
                    Transcript.speaker_id == speaker_id,
                )
                .all()
            )
            for row in rows:
                row.speaker_name = name
            db.commit()
        finally:
            db.close()

    async def _broadcast(self, msg: dict):
        for cb in self._callbacks:
            try:
                await cb(msg)
            except Exception:
                pass

    async def _process_loop(self):
        loop = asyncio.get_event_loop()
        while self.is_recording:
            segment: Optional[AudioSegment] = await loop.run_in_executor(
                None, lambda: self.audio.get_segment(timeout=0.3)
            )
            if segment is None:
                continue
            try:
                await self._handle_segment(segment, loop)
            except Exception as exc:
                await self._broadcast({"type": "error", "data": {"message": str(exc)}})

    async def _handle_segment(self, segment: AudioSegment, loop: asyncio.AbstractEventLoop):
        timestamp = time.time() - self.start_time

        # Speaker ID (CPU-bound → thread pool)
        speaker_id, speaker_name = await loop.run_in_executor(
            None, lambda: self.diarizer.identify(segment.audio_data)
        )

        wav_bytes = AudioCapture.pcm_to_wav(segment.audio_data)

        result = await self.whisper.transcribe(wav_bytes)
        if result is None:
            return

        entry_id = str(uuid.uuid4())

        db = SessionLocal()
        try:
            db.add(
                Transcript(
                    id=entry_id,
                    session_id=self.session_id,
                    speaker_id=speaker_id,
                    speaker_name=speaker_name,
                    text=result.text,
                    timestamp=timestamp,
                )
            )
            db.commit()
        finally:
            db.close()

        await self._broadcast(
            {
                "type": "transcript",
                "data": {
                    "id": entry_id,
                    "speaker_id": speaker_id,
                    "speaker_name": speaker_name,
                    "text": result.text,
                    "timestamp": timestamp,
                },
            }
        )
