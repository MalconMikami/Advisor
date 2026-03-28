import { Download, FileText, Sparkles, Square } from "lucide-react";
import { RecordingStatus, Session } from "../types";

interface Props {
  session: Session;
  status: RecordingStatus;
  onStop: () => void;
  onSummary: () => void;
  onExportPdf: () => void;
  onExportTxt: () => void;
  summaryLoading: boolean;
}

export function SessionControls({
  session,
  status,
  onStop,
  onSummary,
  onExportPdf,
  onExportTxt,
  summaryLoading,
}: Props) {
  const canExport = status === "stopped";
  const isRecording = status === "recording";

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {isRecording && (
        <button
          onClick={onStop}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
        >
          <Square className="w-4 h-4 fill-white" />
          Parar Gravação
        </button>
      )}

      {canExport && (
        <>
          <button
            onClick={onSummary}
            disabled={summaryLoading}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white font-semibold rounded-lg transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            {summaryLoading ? "Gerando..." : session.has_summary ? "Ver Resumo" : "Gerar Resumo"}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onExportPdf}
              className="flex items-center gap-1.5 px-3.5 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              PDF
            </button>
            <button
              onClick={onExportTxt}
              className="flex items-center gap-1.5 px-3.5 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-colors"
            >
              <FileText className="w-4 h-4" />
              TXT
            </button>
          </div>
        </>
      )}
    </div>
  );
}
