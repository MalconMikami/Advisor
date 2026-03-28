import { useEffect, useState } from "react";
import { ArrowLeft, Radio, Wifi } from "lucide-react";
import { Session, TranscriptEntry } from "../../types";
import { EmotionBadge } from "./EmotionBadge";
import { EmotionRadar } from "./EmotionRadar";
import { EmotionTimeline } from "./EmotionTimeline";
import { TemperatureGauge } from "./TemperatureGauge";
import { useSentimentSession } from "./useSentimentSession";

interface Props {
  onBack: () => void;
}

function TranscriptRow({ entry }: { entry: TranscriptEntry }) {
  const isClient = entry.speaker_id !== 0;
  const clientBorder = isClient ? "border-l-4 border-indigo-300" : "";

  return (
    <div className={`flex gap-3 py-3 px-4 rounded-xl bg-white border border-gray-100 ${clientBorder}`}>
      <span className="text-xs text-gray-400 mt-0.5 w-12 shrink-0 font-mono">
        {(() => {
          const m = Math.floor(entry.timestamp / 60);
          const s = Math.floor(entry.timestamp % 60);
          return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
        })()}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              entry.speaker_id === 0
                ? "bg-blue-100 text-blue-700"
                : "bg-indigo-100 text-indigo-700"
            }`}
          >
            {entry.speaker_name}
          </span>
          {entry.emotion && isClient && (
            <EmotionBadge emotion={entry.emotion} compact />
          )}
        </div>
        <p className="text-sm text-gray-800 leading-relaxed">{entry.text}</p>
        {entry.emotion && isClient && (
          <div className="mt-2">
            <EmotionBadge emotion={entry.emotion} />
          </div>
        )}
      </div>
    </div>
  );
}

export function SentimentPocPage({ onBack }: Props) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/sessions")
      .then((r) => r.json())
      .then((data: Session[]) => {
        setSessions(data);
        if (data.length > 0) setSelectedId(data[0].id);
      })
      .catch(() => {});
  }, []);

  const { transcripts, clientPoints, currentValence, currentEmotion, recentEmotions, isLive } =
    useSentimentSession(selectedId);

  const selectedSession = sessions.find((s) => s.id === selectedId);
  const clientTranscripts = transcripts.filter((t) => t.speaker_id !== 0);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-gray-900">POC — Temperatura Emocional</h1>
            {isLive && (
              <span className="flex items-center gap-1.5 text-xs text-green-600 font-semibold">
                <Wifi className="w-3 h-3" />
                Ao vivo
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500">Análise de sentimento do cliente em tempo real</p>
        </div>

        {/* Seletor de sessão */}
        <select
          value={selectedId ?? ""}
          onChange={(e) => setSelectedId(e.target.value || null)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-56 truncate"
        >
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.advisor_name} → {s.client_name} ({s.created_at.slice(0, 10)})
            </option>
          ))}
          {sessions.length === 0 && (
            <option value="">Nenhuma sessão</option>
          )}
        </select>
      </header>

      <main className="flex-1 p-4 max-w-6xl mx-auto w-full space-y-4">
        {/* Linha superior: gauge + radar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Termômetro emocional */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <Radio className="w-4 h-4 text-indigo-500" />
              Temperatura Emocional
              <span className="text-xs font-normal text-gray-400">
                (cliente · tempo real)
              </span>
            </h3>
            <TemperatureGauge valence={currentValence} emotion={currentEmotion} />
          </div>

          {/* Radar */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-1">
              Perfil Emocional
              <span className="text-xs font-normal text-gray-400 ml-1">
                (distribuição acumulada)
              </span>
            </h3>
            <EmotionRadar recentEmotions={recentEmotions} />
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-700 mb-3">
            Arco Emocional
            <span className="text-xs font-normal text-gray-400 ml-1">
              (valência do cliente ao longo da conversa)
            </span>
          </h3>
          <EmotionTimeline points={clientPoints} />
        </div>

        {/* Transcrição com badges */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-700 mb-3">
            Transcrição Anotada
            <span className="text-xs font-normal text-gray-400 ml-1">
              ({transcripts.length} falas · {clientTranscripts.filter((t) => t.emotion).length} com sentimento)
            </span>
          </h3>
          {transcripts.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">
              {selectedId
                ? "Nenhuma transcrição nesta sessão."
                : "Selecione uma sessão acima."}
            </p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin pr-1">
              {transcripts.map((entry) => (
                <TranscriptRow key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
