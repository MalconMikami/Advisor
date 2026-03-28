import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TimelinePoint } from "./useSentimentSession";
import { EMOTION_CONFIG } from "./EmotionBadge";

interface Props {
  points: TimelinePoint[];
}

function fmtTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: unknown[] }) {
  if (!active || !payload?.length) return null;
  const d = (payload as { payload: TimelinePoint }[])[0].payload;
  const cfg = EMOTION_CONFIG[d.emotion] ?? EMOTION_CONFIG.neutral;
  return (
    <div
      className="bg-white border rounded-lg shadow-lg p-3 max-w-xs text-xs"
      style={{ borderColor: cfg.border }}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <span
          className="font-bold"
          style={{ color: cfg.color }}
        >
          {cfg.label}
        </span>
        <span className="text-gray-400">{fmtTime(d.timestamp)}</span>
      </div>
      <p className="text-gray-700 leading-relaxed">{d.text}</p>
      <div className="mt-1.5 flex gap-3 text-gray-500">
        <span>Valência: {d.valence >= 0 ? "+" : ""}{d.valence.toFixed(2)}</span>
        <span>Agitação: {d.arousal.toFixed(2)}</span>
      </div>
    </div>
  );
}

function getDotColor(valence: number): string {
  if (valence < -0.3) return "#ef4444";
  if (valence < 0.3) return "#eab308";
  return "#22c55e";
}

export function EmotionTimeline({ points }: Props) {
  if (points.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
        Nenhum dado do cliente ainda.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={points} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="valGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="timestamp"
          tickFormatter={fmtTime}
          tick={{ fontSize: 10, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          domain={[-1, 1]}
          ticks={[-1, -0.5, 0, 0.5, 1]}
          tick={{ fontSize: 10, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={false}
        />
        {/* Zona neutra destacada */}
        <ReferenceLine y={0} stroke="#d1d5db" strokeDasharray="4 2" />
        <ReferenceLine y={0.3} stroke="#22c55e" strokeDasharray="2 4" strokeOpacity={0.4} />
        <ReferenceLine y={-0.3} stroke="#ef4444" strokeDasharray="2 4" strokeOpacity={0.4} />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="valence"
          stroke="#6366f1"
          strokeWidth={2}
          fill="url(#valGradient)"
          dot={(props: { cx: number; cy: number; payload: TimelinePoint }) => (
            <circle
              key={`dot-${props.payload.timestamp}`}
              cx={props.cx}
              cy={props.cy}
              r={4}
              fill={getDotColor(props.payload.valence)}
              stroke="white"
              strokeWidth={1.5}
            />
          )}
          activeDot={{ r: 6, stroke: "#6366f1", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
