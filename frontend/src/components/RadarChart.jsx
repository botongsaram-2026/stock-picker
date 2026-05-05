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
import {
  METRIC_CONFIGS,
  METRIC_KEYS,
  formatMetric,
  normalizeForChart,
} from "../utils/metrics";

function buildData(stockData, sectorAverages) {
  return METRIC_KEYS.map((key) => ({
    metric:    METRIC_CONFIGS[key].label,
    이_종목:   Math.round(normalizeForChart(key, stockData?.[key]) * 10) / 10,
    업계_평균: Math.round(normalizeForChart(key, sectorAverages?.[key]) * 10) / 10,
    _stockRaw:  formatMetric(key, stockData?.[key]),
    _sectorRaw: formatMetric(key, sectorAverages?.[key]),
  }));
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div style={{
      background: "#1e293b", border: "1px solid #334155",
      borderRadius: 10, padding: "8px 12px", fontSize: 12,
    }}>
      <p style={{ color: "#f1f5f9", fontWeight: 700, marginBottom: 6 }}>{label}</p>
      <p style={{ color: "#60a5fa" }}>
        🔵 이 종목&nbsp;&nbsp;{d?._stockRaw}
        <span style={{ color: "#64748b" }}> (점수 {d?.["이_종목"]})</span>
      </p>
      <p style={{ color: "#fb923c" }}>
        🟠 업계 평균&nbsp;{d?._sectorRaw}
        <span style={{ color: "#64748b" }}> (점수 {d?.["업계_평균"]})</span>
      </p>
    </div>
  );
}

/**
 * RadarChart
 * 이 종목(🔵 파란색) vs 업계 평균(🟠 주황색)
 * 5개 지표를 0–100 정규화 후 표시
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
          각 지표를 0–100점으로 환산 · 높을수록 우수
        </p>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <RechartsRadar cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="#1e3a5f" />
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

          {/* 업계 평균 — 주황색 */}
          <Radar
            name="업계 평균"
            dataKey="업계_평균"
            stroke="#f97316"
            fill="#f97316"
            fillOpacity={0.12}
            strokeDasharray="4 3"
            strokeWidth={1.8}
          />

          {/* 이 종목 — 파란색 */}
          <Radar
            name="이 종목"
            dataKey="이_종목"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.25}
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
