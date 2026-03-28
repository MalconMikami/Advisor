/**
 * Gauge semicircular (velocímetro) mostrando a valência emocional do cliente.
 * Zonas: Vermelho (negativo) → Amarelo (neutro) → Verde (positivo)
 */

const CX = 100;
const CY = 108;
const R = 82;

function polarToXY(angleDeg: number, radius = R) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: CX + radius * Math.cos(rad),
    y: CY - radius * Math.sin(rad),
  };
}

// valence [-1, +1] → ângulo [180°, 0°]
function valenceToAngle(valence: number): number {
  const clamped = Math.max(-1, Math.min(1, valence));
  return ((1 - clamped) / 2) * 180;
}

function getLabel(valence: number): string {
  if (valence < -0.6) return "Cliente muito preocupado";
  if (valence < -0.3) return "Cliente apreensivo";
  if (valence < -0.05) return "Cliente levemente negativo";
  if (valence < 0.05) return "Cliente neutro";
  if (valence < 0.3) return "Cliente levemente positivo";
  if (valence < 0.6) return "Cliente satisfeito";
  return "Cliente muito positivo";
}

// Pontos das 3 zonas na borda do arco
const Z_LEFT = polarToXY(180);       // valence = -1
const Z_NEG = polarToXY(117);        // valence ≈ -0.3
const Z_POS = polarToXY(63);         // valence ≈ +0.3
const Z_RIGHT = polarToXY(0);        // valence = +1

interface Props {
  valence: number | null;
  emotion: string | null;
}

export function TemperatureGauge({ valence, emotion }: Props) {
  const v = valence ?? 0;
  const angle = valenceToAngle(v);
  const needle = polarToXY(angle, R - 8);
  const needleShort = polarToXY(angle, -18); // ponta oposta (para a linha ficar centrada)

  const gaugeColor =
    v < -0.3 ? "#ef4444" : v < 0.3 ? "#eab308" : "#22c55e";

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 120" className="w-full max-w-xs">
        {/* Arco vermelho: zona negativa */}
        <path
          d={`M ${Z_LEFT.x},${Z_LEFT.y} A ${R},${R} 0 0,0 ${Z_NEG.x},${Z_NEG.y}`}
          stroke="#ef4444"
          strokeWidth="10"
          fill="none"
          strokeLinecap="round"
        />
        {/* Arco amarelo: zona neutra */}
        <path
          d={`M ${Z_NEG.x},${Z_NEG.y} A ${R},${R} 0 0,0 ${Z_POS.x},${Z_POS.y}`}
          stroke="#eab308"
          strokeWidth="10"
          fill="none"
        />
        {/* Arco verde: zona positiva */}
        <path
          d={`M ${Z_POS.x},${Z_POS.y} A ${R},${R} 0 0,0 ${Z_RIGHT.x},${Z_RIGHT.y}`}
          stroke="#22c55e"
          strokeWidth="10"
          fill="none"
          strokeLinecap="round"
        />

        {/* Ponteiro */}
        {valence !== null && (
          <>
            <line
              x1={needleShort.x}
              y1={needleShort.y}
              x2={needle.x}
              y2={needle.y}
              stroke="#1f2937"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* Pino central */}
            <circle cx={CX} cy={CY} r="5" fill="#1f2937" />
            <circle cx={CX} cy={CY} r="3" fill="white" />
          </>
        )}

        {/* Placeholder se sem dados */}
        {valence === null && (
          <text x={CX} y={CY + 10} textAnchor="middle" fontSize="10" fill="#9ca3af">
            Aguardando...
          </text>
        )}

        {/* Labels das extremidades */}
        <text x="12" y={CY + 18} fontSize="8" fill="#ef4444" fontWeight="bold">−</text>
        <text x="186" y={CY + 18} fontSize="8" fill="#22c55e" fontWeight="bold">+</text>
      </svg>

      {/* Valor numérico + label */}
      {valence !== null && (
        <div className="text-center mt-1 space-y-0.5">
          <p
            className="text-2xl font-bold tabular-nums"
            style={{ color: gaugeColor }}
          >
            {v >= 0 ? "+" : ""}
            {v.toFixed(2)}
          </p>
          <p className="text-sm text-gray-600">{getLabel(v)}</p>
          {emotion && (
            <p className="text-xs text-gray-400 capitalize">{emotion}</p>
          )}
        </div>
      )}
    </div>
  );
}
