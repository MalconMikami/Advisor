import { useCallback, useEffect, useRef, useState } from "react";
import { TranscriptEntry } from "../../types";

const WS_BASE = "ws://localhost:8000/ws";

export interface TimelinePoint {
  timestamp: number;
  valence: number;
  arousal: number;
  emotion: string;
  text: string;
}

export interface SentimentSessionState {
  transcripts: TranscriptEntry[];
  clientPoints: TimelinePoint[];   // dados do cliente para o timeline
  currentValence: number | null;   // última valência do cliente
  currentEmotion: string | null;   // última emoção do cliente
  recentEmotions: Record<string, number>; // freq. das 10 últimas emoções
  isLive: boolean;
}

export function useSentimentSession(sessionId: string | null): SentimentSessionState {
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [clientPoints, setClientPoints] = useState<TimelinePoint[]>([]);
  const [currentValence, setCurrentValence] = useState<number | null>(null);
  const [currentEmotion, setCurrentEmotion] = useState<string | null>(null);
  const [recentEmotions, setRecentEmotions] = useState<Record<string, number>>({});
  const [isLive, setIsLive] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const processEntry = useCallback((entry: TranscriptEntry) => {
    setTranscripts((prev) => {
      if (prev.some((t) => t.id === entry.id)) return prev;
      return [...prev, entry];
    });

    if (entry.emotion) {
      const pt: TimelinePoint = {
        timestamp: entry.timestamp,
        valence: entry.emotion.valence,
        arousal: entry.emotion.arousal,
        emotion: entry.emotion.emotion,
        text: entry.text,
      };
      setClientPoints((prev) => [...prev, pt]);
      setCurrentValence(entry.emotion.valence);
      setCurrentEmotion(entry.emotion.emotion);
      setRecentEmotions((prev) => {
        const next = { ...prev };
        next[entry.emotion!.emotion] = (next[entry.emotion!.emotion] ?? 0) + 1;
        return next;
      });
    }
  }, []);

  // Carrega transcrições existentes via REST
  useEffect(() => {
    if (!sessionId) return;
    setTranscripts([]);
    setClientPoints([]);
    setCurrentValence(null);
    setCurrentEmotion(null);
    setRecentEmotions({});

    fetch(`/api/sessions/${sessionId}`)
      .then((r) => r.json())
      .then((data) => {
        const entries: TranscriptEntry[] = data.transcripts ?? [];
        entries.forEach(processEntry);
      })
      .catch(() => {});
  }, [sessionId, processEntry]);

  // WebSocket para updates ao vivo
  useEffect(() => {
    if (!sessionId) return;

    const ws = new WebSocket(`${WS_BASE}/${sessionId}`);
    wsRef.current = ws;

    ws.onopen = () => setIsLive(true);
    ws.onclose = () => setIsLive(false);
    ws.onerror = () => setIsLive(false);

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data as string);
      if (msg.type === "transcript") {
        processEntry(msg.data as TranscriptEntry);
      }
    };

    return () => {
      ws.close();
      setIsLive(false);
    };
  }, [sessionId, processEntry]);

  return { transcripts, clientPoints, currentValence, currentEmotion, recentEmotions, isLive };
}
