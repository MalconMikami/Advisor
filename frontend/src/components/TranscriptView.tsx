import { useEffect, useRef, useState } from "react";
import { Pencil } from "lucide-react";
import { RecordingStatus, TranscriptEntry } from "../types";

const SPEAKER_STYLES: Record<number, { badge: string; text: string; border: string }> = {
  0: { badge: "bg-blue-100 text-blue-700", text: "text-blue-700", border: "border-blue-200" },
  1: { badge: "bg-green-100 text-green-700", text: "text-green-700", border: "border-green-200" },
};

const DEFAULT_STYLE = {
  badge: "bg-purple-100 text-purple-700",
  text: "text-purple-700",
  border: "border-purple-200",
};

function fmt(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

interface RenameState {
  speakerId: number;
  current: string;
}

interface Props {
  transcripts: TranscriptEntry[];
  status: RecordingStatus;
  onRenameSpeaker: (speaker_id: number, name: string) => void;
}

export function TranscriptView({ transcripts, status, onRenameSpeaker }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [renaming, setRenaming] = useState<RenameState | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // Auto-scroll ao receber novas transcrições
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcripts.length]);

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renaming || !renameValue.trim()) return;
    onRenameSpeaker(renaming.speakerId, renameValue.trim());
    setRenaming(null);
  };

  if (transcripts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        {status === "recording" ? (
          <>
            <div className="flex gap-1 mb-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-red-500 recording-dot"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
            <p className="text-sm">Aguardando fala...</p>
          </>
        ) : (
          <p className="text-sm">Nenhuma transcrição ainda.</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      {transcripts.map((entry) => {
        const style = SPEAKER_STYLES[entry.speaker_id] ?? DEFAULT_STYLE;
        return (
          <div key={entry.id} className={`flex gap-3 p-4 rounded-xl border ${style.border} bg-white`}>
            {/* Timestamp */}
            <span className="text-xs text-gray-400 mt-0.5 w-12 shrink-0 font-mono">
              {fmt(entry.timestamp)}
            </span>

            <div className="flex-1 min-w-0">
              {/* Speaker label com botão de rename */}
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${style.badge}`}>
                  {entry.speaker_name}
                </span>
                <button
                  onClick={() => {
                    setRenaming({ speakerId: entry.speaker_id, current: entry.speaker_name });
                    setRenameValue(entry.speaker_name);
                  }}
                  title="Renomear speaker"
                  className="text-gray-300 hover:text-gray-500 transition-colors"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              </div>

              {/* Texto */}
              <p className="text-sm text-gray-800 leading-relaxed">{entry.text}</p>
            </div>
          </div>
        );
      })}

      <div ref={bottomRef} />

      {/* Modal de renomear speaker */}
      {renaming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <form
            onSubmit={handleRenameSubmit}
            className="bg-white rounded-xl shadow-xl p-6 w-80 space-y-4"
          >
            <h3 className="font-bold text-gray-900">Renomear Speaker</h3>
            <input
              autoFocus
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setRenaming(null)}
                className="px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg"
              >
                Salvar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
