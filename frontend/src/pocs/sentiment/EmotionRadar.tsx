import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { EMOTION_CONFIG } from "./EmotionBadge";

const ALL_EMOTIONS = ["joy", "sadness", "anger", "fear", "surprise", "disgust", "neutral"];

interface Props {
  recentEmotions: Record<string, number>;
}

export function EmotionRadar({ recentEmotions }: Props) {
  const total = Object.values(recentEmotions).reduce((a, b) => a + b, 0) || 1;

  const data = ALL_EMOTIONS.map((em) => ({
    emotion: EMOTION_CONFIG[em]?.label ?? em,
    value: Math.round(((recentEmotions[em] ?? 0) / total) * 100),
    key: em,
  }));

  const isEmpty = total <= 1 && !Object.keys(recentEmotions).length;

  if (isEmpty) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
        Aguardando emoções...
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <RadarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
        <PolarGrid stroke="#e5e7eb" />
        <PolarAngleAxis
          dataKey="emotion"
          tick={{ fontSize: 10, fill: "#6b7280" }}
        />
        <Tooltip
          formatter={(value: number) => [`${value}%`, "Frequência"]}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
        <Radar
          dataKey="value"
          stroke="#6366f1"
          fill="#6366f1"
          fillOpacity={0.25}
          strokeWidth={2}
          dot={{ fill: "#6366f1", r: 3 }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
