"""
Identificação de speakers usando embeddings de voz (resemblyzer).
O primeiro speaker detectado recebe o nome "Assessor", o segundo "Cliente".
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

import numpy as np

SIMILARITY_THRESHOLD = 0.75
MAX_EMBEDDINGS_PER_SPEAKER = 10


@dataclass
class Speaker:
    id: int
    name: str
    embeddings: list = field(default_factory=list)


class SpeakerIdentifier:
    def __init__(self):
        self.speakers: list[Speaker] = []
        self._encoder = None

    def reset(self):
        self.speakers = []

    def rename(self, speaker_id: int, name: str):
        for s in self.speakers:
            if s.id == speaker_id:
                s.name = name
                return

    def identify(self, pcm_data: bytes, sample_rate: int = 16000) -> tuple[int, str]:
        """Retorna (speaker_id, speaker_name) para o segmento de áudio."""
        try:
            embedding = self._extract_embedding(pcm_data, sample_rate)
        except Exception:
            # Fallback: atribui ao primeiro speaker sem embedding
            if not self.speakers:
                return self._add_speaker(np.zeros(256))
            return self.speakers[0].id, self.speakers[0].name

        if not self.speakers:
            return self._add_speaker(embedding)

        best_id = 0
        best_sim = -1.0
        for speaker in self.speakers:
            if not speaker.embeddings:
                continue
            avg = np.mean(speaker.embeddings, axis=0)
            sim = float(np.dot(embedding, avg) / (np.linalg.norm(embedding) * np.linalg.norm(avg) + 1e-9))
            if sim > best_sim:
                best_sim = sim
                best_id = speaker.id

        if best_sim >= SIMILARITY_THRESHOLD:
            speaker = self.speakers[best_id]
            speaker.embeddings.append(embedding)
            if len(speaker.embeddings) > MAX_EMBEDDINGS_PER_SPEAKER:
                speaker.embeddings.pop(0)
            return speaker.id, speaker.name

        return self._add_speaker(embedding)

    def _add_speaker(self, embedding: np.ndarray) -> tuple[int, str]:
        sid = len(self.speakers)
        name = self._default_name(sid)
        self.speakers.append(Speaker(id=sid, name=name, embeddings=[embedding]))
        return sid, name

    @staticmethod
    def _default_name(sid: int) -> str:
        if sid == 0:
            return "Assessor"
        if sid == 1:
            return "Cliente"
        return f"Participante {sid + 1}"

    def _extract_embedding(self, pcm_data: bytes, sample_rate: int) -> np.ndarray:
        from resemblyzer import VoiceEncoder, preprocess_wav

        if self._encoder is None:
            self._encoder = VoiceEncoder()

        audio_int16 = np.frombuffer(pcm_data, dtype=np.int16)
        audio_float32 = audio_int16.astype(np.float32) / 32768.0
        wav = preprocess_wav(audio_float32, source_sr=sample_rate)
        return self._encoder.embed_utterance(wav)
