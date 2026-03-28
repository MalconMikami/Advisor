import { useState } from "react";
import { Clock, Mic, FlaskConical } from "lucide-react";
import { Session, RecordingStatus } from "./types";
import { SessionForm } from "./components/SessionForm";
import { SessionControls } from "./components/SessionControls";
import { SessionHistory } from "./components/SessionHistory";
import { SummaryModal } from "./components/SummaryModal";
import { TranscriptView } from "./components/TranscriptView";
import { useTranscription } from "./hooks/useTranscription";
import { SentimentPocPage } from "./pocs/sentiment/SentimentPocPage";

type View = "form" | "recording" | "history" | "poc-sentiment";

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function App() {
  const [view, setView] = useState<View>("form");
  const [session, setSession] = useState<Session | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [elapsedTimer, setElapsedTimer] = useState<ReturnType<typeof setInterval> | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryText, setSummaryText] = useState<string | null>(null);

  const { transcripts, status, error, startRecording, stopRecording, renameSpeaker, reset } =
    useTranscription(session?.id ?? null);

  const handleStart = async (params: {
    advisor_name: string;
    client_name: string;
    description: string;
    language: string;
    device_index?: number;
  }) => {
    setFormLoading(true);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          advisor_name: params.advisor_name,
          client_name: params.client_name,
          description: params.description,
          language: params.language,
        }),
      });
      const newSession: Session = await res.json();
      setSession(newSession);
      setElapsed(0);
      setView("recording");

      // Pequeno delay para o WebSocket conectar antes de enviar "start"
      setTimeout(() => {
        startRecording({ device_index: params.device_index, language: params.language });
        const timer = setInterval(() => setElapsed((e) => e + 1), 1000);
        setElapsedTimer(timer);
      }, 400);
    } finally {
      setFormLoading(false);
    }
  };

  const handleStop = () => {
    stopRecording();
    if (elapsedTimer) clearInterval(elapsedTimer);
    setElapsedTimer(null);
    setSession((s) => s ? { ...s, has_summary: false } : s);
  };

  const handleSummary = async () => {
    if (!session) return;

    // Se já existe resumo, apenas abre o modal
    if (session.has_summary && summaryText) {
      setSummaryText(summaryText);
      return;
    }

    setSummaryLoading(true);
    try {
      const res = await fetch(`/api/sessions/${session.id}/summary`, { method: "POST" });
      const data = await res.json() as { summary: string };
      setSummaryText(data.summary);
      setSession((s) => s ? { ...s, has_summary: true, summary: data.summary } : s);
    } catch {
      alert("Erro ao gerar resumo. Verifique a OPENAI_API_KEY.");
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleExport = (format: "pdf" | "txt") => {
    if (!session) return;
    window.open(`/api/sessions/${session.id}/export/${format}`, "_blank");
  };

  const handleNewSession = () => {
    reset();
    setSession(null);
    setElapsed(0);
    setSummaryText(null);
    setView("form");
  };

  const handleOpenHistorySession = async (s: Session) => {
    const res = await fetch(`/api/sessions/${s.id}`);
    const full: Session = await res.json();
    setSession(full);
    reset();
    // Carrega transcrições existentes no hook (via estado local)
    setView("recording");
  };

  if (view === "history") {
    return (
      <SessionHistory
        onBack={() => setView("form")}
        onOpenSession={handleOpenHistorySession}
      />
    );
  }

  if (view === "poc-sentiment") {
    return <SentimentPocPage onBack={() => setView("form")} />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <Mic className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900">Advisor Transcription</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setView("poc-sentiment")}
            className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors font-medium"
          >
            <FlaskConical className="w-4 h-4" />
            POC Sentimento
          </button>
          <button
            onClick={() => setView("history")}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Clock className="w-4 h-4" />
            Histórico
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        {view === "form" ? (
          <SessionForm onStart={handleStart} loading={formLoading} />
        ) : (
          session && (
            <div className="flex flex-col h-full max-w-3xl mx-auto w-full px-4">
              {/* Session header */}
              <div className="py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-gray-900">
                      {session.advisor_name}
                      <span className="text-gray-400 font-normal mx-2">→</span>
                      {session.client_name}
                    </h2>
                    {status === "recording" && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-50 text-red-600 text-xs font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 recording-dot" />
                        Gravando {formatDuration(elapsed)}
                      </span>
                    )}
                    {status === "stopped" && (
                      <span className="px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold">
                        Encerrado
                      </span>
                    )}
                  </div>
                  {session.description && (
                    <p className="text-sm text-gray-500 mt-0.5">{session.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <SessionControls
                    session={session}
                    status={status}
                    onStop={handleStop}
                    onSummary={handleSummary}
                    onExportPdf={() => handleExport("pdf")}
                    onExportTxt={() => handleExport("txt")}
                    summaryLoading={summaryLoading}
                  />
                  {status === "stopped" && (
                    <button
                      onClick={handleNewSession}
                      className="px-3.5 py-2 text-sm border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors"
                    >
                      Nova Reunião
                    </button>
                  )}
                </div>
              </div>

              {/* Error banner */}
              {error && (
                <div className="mt-3 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Transcript area */}
              <div className="flex-1 overflow-y-auto py-4 scrollbar-thin">
                <TranscriptView
                  transcripts={session.transcripts ?? transcripts}
                  status={status}
                  onRenameSpeaker={renameSpeaker}
                />
              </div>
            </div>
          )
        )}
      </main>

      {summaryText && (
        <SummaryModal summary={summaryText} onClose={() => setSummaryText(null)} />
      )}
    </div>
  );
}
