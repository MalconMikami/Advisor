"""
Captura de áudio via microfone usando PyAudio com detecção de atividade de voz (VAD).
"""

import io
import queue
import threading
import wave
from dataclasses import dataclass
from typing import Optional

import webrtcvad

SAMPLE_RATE = 16000
CHANNELS = 1
FRAME_DURATION_MS = 30
FRAME_SIZE = int(SAMPLE_RATE * FRAME_DURATION_MS / 1000)  # 480 samples

# Silêncio contínuo para disparar fim de utterance
MAX_SILENCE_FRAMES = 20   # 600ms
MIN_SPEECH_FRAMES = 10    # 300ms — descarta ruídos curtos
MAX_SPEECH_FRAMES = 300   # 9s — força flush de segmentos longos


@dataclass
class AudioSegment:
    audio_data: bytes  # raw PCM int16
    duration: float    # duração em segundos


class AudioCapture:
    def __init__(
        self,
        device_index: Optional[int] = None,
        vad_aggressiveness: int = 2,
    ):
        self.device_index = device_index
        self.vad = webrtcvad.Vad(vad_aggressiveness)
        self._segment_queue: queue.Queue[AudioSegment] = queue.Queue()
        self._stop_event = threading.Event()
        self._thread: Optional[threading.Thread] = None

    def start(self):
        self._stop_event.clear()
        self._thread = threading.Thread(target=self._capture_loop, daemon=True)
        self._thread.start()

    def stop(self):
        self._stop_event.set()
        if self._thread:
            self._thread.join(timeout=3.0)

    def get_segment(self, timeout: float = 0.2) -> Optional[AudioSegment]:
        try:
            return self._segment_queue.get(timeout=timeout)
        except queue.Empty:
            return None

    def _capture_loop(self):
        import pyaudio

        p = pyaudio.PyAudio()
        stream = p.open(
            format=pyaudio.paInt16,
            channels=CHANNELS,
            rate=SAMPLE_RATE,
            input=True,
            input_device_index=self.device_index,
            frames_per_buffer=FRAME_SIZE,
        )

        speech_frames: list[bytes] = []
        silence_count = 0
        is_speaking = False

        try:
            while not self._stop_event.is_set():
                try:
                    frame = stream.read(FRAME_SIZE, exception_on_overflow=False)
                except OSError:
                    continue

                try:
                    is_speech = self.vad.is_speech(frame, SAMPLE_RATE)
                except Exception:
                    is_speech = False

                if is_speech:
                    speech_frames.append(frame)
                    silence_count = 0
                    is_speaking = True
                elif is_speaking:
                    speech_frames.append(frame)
                    silence_count += 1

                    should_flush = (
                        silence_count >= MAX_SILENCE_FRAMES
                        or len(speech_frames) >= MAX_SPEECH_FRAMES
                    )

                    if should_flush:
                        if len(speech_frames) >= MIN_SPEECH_FRAMES:
                            audio_bytes = b"".join(speech_frames)
                            duration = len(speech_frames) * FRAME_DURATION_MS / 1000
                            self._segment_queue.put(
                                AudioSegment(audio_data=audio_bytes, duration=duration)
                            )
                        speech_frames = []
                        silence_count = 0
                        is_speaking = False
        finally:
            stream.stop_stream()
            stream.close()
            p.terminate()

    @staticmethod
    def pcm_to_wav(pcm_data: bytes) -> bytes:
        """Converte PCM int16 bruto para WAV em memória."""
        buf = io.BytesIO()
        with wave.open(buf, "wb") as wf:
            wf.setnchannels(CHANNELS)
            wf.setsampwidth(2)  # 16-bit
            wf.setframerate(SAMPLE_RATE)
            wf.writeframes(pcm_data)
        return buf.getvalue()

    @staticmethod
    def list_devices() -> list[dict]:
        import pyaudio

        p = pyaudio.PyAudio()
        devices = []
        for i in range(p.get_device_count()):
            info = p.get_device_info_by_index(i)
            if info["maxInputChannels"] > 0:
                devices.append(
                    {
                        "index": i,
                        "name": info["name"],
                        "channels": int(info["maxInputChannels"]),
                        "sample_rate": int(info["defaultSampleRate"]),
                    }
                )
        p.terminate()
        return devices
