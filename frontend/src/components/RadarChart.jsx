import {
  RadarChart as RechartsRadar,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { METRIC_CONFIGS, METRIC_KEYS, calcScore, formatMetric } from "../utils/metrics";

function buildData(stockData, sectorAverages) {
  return METRIC_KEYS.map((key) => {
    const stockVal = stockData?.[key];
    const sectorVal = sectorAverages?.[key];
    const score = calcScore(key, stockVal, sectorVal) ?? 0;
    return {
      metric: METRIC_CONFIGS[key].label,
      종목: Math.round(score * 10) / 10,
      섹터평균: 50,
      _stockRaw: formatMetric(key, stockVal),
      _sectorRaw: formatMetric(key, sectorVal),
    };
  });
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div
      style={{
        backgroundColor: "#1e293b",
        border: "1px solid #334155",
        borderRadius: 8,
        padding: "8px 12px",
        fontSize: 12,
      }}
    >
      <p style={{ color: "#f1f5f9", fontWeight: 700, marginBottom: 4 }}>{label}</p>
      <p style={{ color: "#60a5fa" }}>
        종목&nbsp;&nbsp;&nbsp;{d?._stockRaw}&nbsp;
        <span style={{ color: "#94a3b8" }}>(점수 {d?.["종목"]})</span>
      </p>
      <p style={{ color: "#94a3b8" }}>
        섹터 평균&nbsp;{d?._sectorRaw}&nbsp;
        <span style={{ color: "#64748b" }}>(점수 50)</span>
      </p>
    </div>
  );
}

/**
 * 지표 레이더 차트
 * - 섹터 평균을 항상 50점으로 고정 → 정오각형 기준선
 * - 종목 점수가 50 초과면 섹터 평균보다 유리
 */
export default function RadarChart({ stockData, sectorAverages }) {
  const data = buildData(stockData, sectorAverages);

  return (
    <div className="bg-slate-800/60 rounded-2xl border border-slate-700 p-6">
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-widest">
          지표 레이더
        </h4>
        <p className="text-xs text-slate-500 mt-1">
          섹터 평균 대비 상대 점수 · 50점 = 섹터 평균
        </p>
      </div>

      <ResponsiveContainer width="100%" height={310}>
        <RechartsRadar cx="50%" cy="50%" outerRadius="72%" data={data}>
          <PolarGrid stroke="#1e3a5f" strokeDasharray="0" />
          <PolarAngleAxis
            dataKey="metric"
            tick={{ fill: "#94a3b8", fontSize: 12, fontWeight: 600 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tickCount={4}
            tick={{ fill: "#475569", fontSize: 10 }}
            axisLine={false}
          />

          {/* 섹터 평균: 항상 50점 → 정오각형 기준선 */}
          <Radar
            name="섹터 평균"
            dataKey="섹터평균"
            stroke="#64748b"
            fill="#64748b"
            fillOpacity={0.08}
            strokeDasharray="4 4"
            strokeWidth={1.5}
          />

          {/* 종목 */}
          <Radar
            name="종목"
            dataKey="종목"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.22}
            strokeWidth={2}
          />

          <Legend
            iconSize={8}
            wrapperStyle={{ fontSize: 12, color: "#94a3b8", paddingTop: 8 }}
          />
          <Tooltip content={<CustomTooltip />} />
        </RechartsRadar>
      </ResponsiveContainer>
    </div>
  );
}
