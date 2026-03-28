import { X } from "lucide-react";

interface Props {
  summary: string;
  onClose: () => void;
}

export function SummaryModal({ summary, onClose }: Props) {
  // Renderiza markdown básico: **negrito** e ## cabeçalhos
  const renderLine = (line: string, i: number) => {
    if (line.startsWith("## ")) {
      return (
        <h3 key={i} className="text-base font-bold text-gray-900 mt-5 mb-1.5">
          {line.replace("## ", "")}
        </h3>
      );
    }
    if (line.startsWith("- ")) {
      return (
        <li key={i} className="text-sm text-gray-700 ml-4 list-disc">
          {line.replace("- ", "")}
        </li>
      );
    }
    if (line.trim() === "") return <div key={i} className="h-1" />;
    return (
      <p key={i} className="text-sm text-gray-700 leading-relaxed">
        {line}
      </p>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Resumo da Reunião</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto px-6 py-5 scrollbar-thin">
          {summary.split("\n").map((line, i) => renderLine(line, i))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-900 hover:bg-gray-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
