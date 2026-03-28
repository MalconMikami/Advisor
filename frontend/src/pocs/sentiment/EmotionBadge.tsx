import {
  AlertTriangle,
  Frown,
  Laugh,
  Minus,
  ThumbsDown,
  Zap,
  HelpCircle,
} from "lucide-react";

export interface EmotionData {
  emotion: string;
  valence: number;
  arousal: number;
  confidence: number;
  keywords: string[];
}

const EMOTION_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string; Icon: React.ElementType }
> = {
  joy:      { label: "Alegria",  color: "#d97706", bg: "#fef3c7", border: "#fcd34d", Icon: Laugh },
  sadness:  { label: "Tristeza", color: "#2563eb", bg: "#dbeafe", border: "#93c5fd", Icon: Frown },
  anger:    { label: "Raiva",    color: "#dc2626", bg: "#fee2e2", border: "#fca5a5", Icon: Zap },
  fear:     { label: "Medo",     color: "#7c3aed", bg: "#ede9fe", border: "#c4b5fd", Icon: AlertTriangle },
  surprise: { label: "Surpresa", color: "#ea580c", bg: "#ffedd5", border: "#fdba74", Icon: HelpCircle },
  disgust:  { label: "Aversão",  color: "#65a30d", bg: "#ecfccb", border: "#bef264", Icon: ThumbsDown },
  neutral:  { label: "Neutro",   color: "#6b7280", bg: "#f3f4f6", border: "#d1d5db", Icon: Minus },
};

const DEFAULT_CONFIG = EMOTION_CONFIG.neutral;

interface Props {
  emotion: EmotionData;
  compact?: boolean;
}

export function EmotionBadge({ emotion, compact = false }: Props) {
  const cfg = EMOTION_CONFIG[emotion.emotion] ?? DEFAULT_CONFIG;
  const { Icon } = cfg;

  if (compact) {
    return (
      <span
        title={`${cfg.label} (${Math.round(emotion.confidence * 100)}%)`}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border"
        style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}
      >
        <Icon className="w-3 h-3" />
        {cfg.label}
      </span>
    );
  }

  return (
    <div
      className="rounded-lg border px-3 py-2 text-sm"
      style={{ background: cfg.bg, borderColor: cfg.border }}
    >
      {/* Linha principal */}
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className="w-4 h-4" style={{ color: cfg.color }} />
        <span className="font-bold" style={{ color: cfg.color }}>
          {cfg.label}
        </span>
        <span className="text-xs text-gray-400 ml-auto">
          {Math.round(emotion.confidence * 100)}% conf.
        </span>
      </div>

      {/* Barra de valência */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs text-gray-500 w-16">Valência</span>
        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${((emotion.valence + 1) / 2) * 100}%`,
              background: emotion.valence >= 0 ? "#22c55e" : "#ef4444",
            }}
          />
        </div>
        <span className="text-xs text-gray-500 w-10 text-right">
          {emotion.valence >= 0 ? "+" : ""}{emotion.valence.toFixed(2)}
        </span>
      </div>

      {/* Barra de arousal */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-gray-500 w-16">Agitação</span>
        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-orange-400"
            style={{ width: `${emotion.arousal * 100}%` }}
          />
        </div>
        <span className="text-xs text-gray-500 w-10 text-right">
          {emotion.arousal.toFixed(2)}
        </span>
      </div>

      {/* Keywords */}
      {emotion.keywords.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {emotion.keywords.map((kw) => (
            <span
              key={kw}
              className="text-xs px-1.5 py-0.5 rounded border"
              style={{ color: cfg.color, borderColor: cfg.border, background: "white" }}
            >
              {kw}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export { EMOTION_CONFIG };
