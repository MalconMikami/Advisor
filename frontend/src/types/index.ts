export interface Session {
  id: string;
  advisor_name: string;
  client_name: string;
  description?: string;
  language: string;
  created_at: string;
  ended_at?: string;
  has_summary?: boolean;
  summary?: string;
  transcript_count?: number;
  transcripts?: TranscriptEntry[];
}

export interface EmotionData {
  emotion: string;
  valence: number;
  arousal: number;
  confidence: number;
  keywords: string[];
}

export interface TranscriptEntry {
  id: string;
  speaker_id: number;
  speaker_name: string;
  text: string;
  timestamp: number;
  emotion?: EmotionData;  // presente somente em utterances do cliente
}

export interface AudioDevice {
  index: number;
  name: string;
  channels: number;
  sample_rate: number;
}

export type RecordingStatus = "idle" | "recording" | "stopped";

export type WSMessage =
  | { type: "transcript"; data: TranscriptEntry }
  | { type: "status"; data: { recording: boolean } }
  | { type: "error"; data: { message: string } }
  | { type: "speaker_renamed"; data: { speaker_id: number; name: string } };
