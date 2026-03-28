import { useEffect, useState } from "react";
import { ArrowLeft, Download, FileText, MessageSquare, Sparkles, Trash2 } from "lucide-react";
import { Session } from "../types";
import { SummaryModal } from "./SummaryModal";

interface Props {
  onBack: () => void;
  onOpenSession: (session: Session) => void;
}

export function SessionHistory({ onBack, onOpenSession }: Props) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [summaryModal, setSummaryModal] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetch("/api/sessions")
      .then((r) => r.json())
      .then((data: Session[]) => setSessions(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta sessão? Esta ação não pode ser desfeita.")) return;
    setDeletingId(id);
    await fetch(`/api/sessions/${id}`, { method: "DELETE" });
    setDeletingId(null);
    load();
  };

  const handleExport = (id: string, format: "pdf" | "txt") => {
    window.open(`/api/sessions/${id}/export/${format}`, "_blank");
  };

  const handleViewSummary = async (session: Session) => {
    if (session.summary) {
      setSummaryModal(session.summary);
      return;
    }
    const res = await fetch(`/api/sessions/${session.id}/summary`, { method: "POST" });
    const data = await res.json() as { summary: string };
    setSummaryModal(data.summary);
    load();
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold text-gray-900">Histórico de Reuniões</h2>
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-16">Carregando...</div>
      ) : sessions.length === 0 ? (
        <div className="text-center text-gray-400 py-16">Nenhuma reunião registrada.</div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => (
            <div key={s.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => onOpenSession(s)}
                    className="text-left block w-full"
                  >
                    <p className="font-semibold text-gray-900 truncate">
                      {s.advisor_name} <span className="text-gray-400 font-normal">→</span> {s.client_name}
                    </p>
                    {s.description && (
                      <p className="text-sm text-gray-500 mt-0.5 truncate">{s.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs text-gray-400">{formatDate(s.created_at)}</span>
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <MessageSquare className="w-3 h-3" />
                        {s.transcript_count ?? 0} falas
                      </span>
                      {s.has_summary && (
                        <span className="text-xs text-purple-600 font-medium">• Resumo gerado</span>
                      )}
                    </div>
                  </button>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleViewSummary(s)}
                    title="Ver/gerar resumo"
                    className="p-2 rounded-lg hover:bg-purple-50 text-purple-500 transition-colors"
                  >
                    <Sparkles className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleExport(s.id, "pdf")}
                    title="Exportar PDF"
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleExport(s.id, "txt")}
                    title="Exportar TXT"
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    disabled={deletingId === s.id}
                    title="Excluir sessão"
                    className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {summaryModal && (
        <SummaryModal summary={summaryModal} onClose={() => setSummaryModal(null)} />
      )}
    </div>
  );
}
