"""
Transcrição de áudio via OpenAI Whisper API.
"""

import io
from dataclasses import dataclass
from typing import Optional

from openai import AsyncOpenAI


@dataclass
class TranscriptionResult:
    text: str
    language: str


class WhisperTranscriber:
    def __init__(self, api_key: str, language: str = "pt"):
        self.client = AsyncOpenAI(api_key=api_key)
        self.language = language

    async def transcribe(self, wav_bytes: bytes) -> Optional[TranscriptionResult]:
        """Transcreve bytes WAV usando a API Whisper da OpenAI."""
        if len(wav_bytes) < 2000:
            return None

        audio_file = io.BytesIO(wav_bytes)
        audio_file.name = "audio.wav"

        try:
            response = await self.client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                language=self.language,
                response_format="json",
            )
        except Exception as exc:
            raise RuntimeError(f"Erro na API Whisper: {exc}") from exc

        text = response.text.strip()
        if not text:
            return None

        return TranscriptionResult(text=text, language=self.language)
