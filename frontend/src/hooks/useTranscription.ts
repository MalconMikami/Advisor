import { useCallback, useEffect, useRef, useState } from "react";
import { RecordingStatus, TranscriptEntry, WSMessage } from "../types";

const WS_BASE = "ws://localhost:8000/ws";

export function useTranscription(sessionId: string | null) {
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [status, setStatus] = useState<RecordingStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const ws = new WebSocket(`${WS_BASE}/${sessionId}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const msg: WSMessage = JSON.parse(event.data as string);

      if (msg.type === "transcript") {
        setTranscripts((prev) => [...prev, msg.data]);
      } else if (msg.type === "status") {
        setStatus(msg.data.recording ? "recording" : "stopped");
      } else if (msg.type === "error") {
        setError(msg.data.message);
      } else if (msg.type === "speaker_renamed") {
        setTranscripts((prev) =>
          prev.map((t) =>
            t.speaker_id === msg.data.speaker_id
              ? { ...t, speaker_name: msg.data.name }
              : t
          )
        );
      }
    };

    ws.onerror = () => setError("Erro de conexão com o servidor");
    ws.onclose = () => {
      if (status === "recording") setStatus("stopped");
    };

    return () => ws.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const startRecording = useCallback(
    (opts: { device_index?: number; language?: string } = {}) => {
      setError(null);
      wsRef.current?.send(JSON.stringify({ type: "start", ...opts }));
    },
    []
  );

  const stopRecording = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ type: "stop" }));
  }, []);

  const renameSpeaker = useCallback((speaker_id: number, name: string) => {
    wsRef.current?.send(
      JSON.stringify({ type: "rename_speaker", speaker_id, name })
    );
  }, []);

  const reset = useCallback(() => {
    setTranscripts([]);
    setStatus("idle");
    setError(null);
  }, []);

  return { transcripts, status, error, startRecording, stopRecording, renameSpeaker, reset };
}
