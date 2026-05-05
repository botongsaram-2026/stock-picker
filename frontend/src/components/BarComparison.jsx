import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
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
    name:      METRIC_CONFIGS[key].label,
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
      borderRadius: 10, padding: "8px 12px", fontSize: 12, minWidth: 170,
    }}>
      <p style={{ color: "#f1f5f9", fontWeight: 700, marginBottom: 6 }}>{label}</p>
      <p style={{ color: "#60a5fa" }}>
        🔵 이 종목&nbsp;&nbsp;&nbsp;{d?._stockRaw}
        <span style={{ color: "#64748b" }}> ({d?.["이_종목"]}점)</span>
      </p>
      <p style={{ color: "#fb923c", marginTop: 2 }}>
        🟠 업계 평균&nbsp;{d?._sectorRaw}
        <span style={{ color: "#64748b" }}> ({d?.["업계_평균"]}점)</span>
      </p>
    </div>
  );
}

/**
 * BarComparison
 * 지표별로 이 종목(🔵 파란색) vs 업계 평균(🟠 주황색) 나란히 비교
 * Y축: 0–100 정규화 점수
 */
export default function BarComparison({ stockData, sectorAverages }) {
  const data = buildData(stockData, sectorAverages);

  return (
    <div className="bg-slate-800/60 rounded-2xl border border-slate-700 p-6">
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-widest">
          업계 평균 비교
        </h4>
        <p className="text-xs text-slate-500 mt-1">
          0–100점 환산 · 높을수록 우수
        </p>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} barCategoryGap="30%" barGap={3}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#1e293b"
            vertical={false}
          />
          <XAxis
            dataKey="name"
            tick={{ fill: "#94a3b8", fontSize: 12, fontWeight: 600 }}
            axisLine={{ stroke: "#334155" }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tick={{ fill: "#475569", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(51,65,85,0.25)" }} />
          <Legend
            iconSize={8}
            wrapperStyle={{ fontSize: 12, color: "#94a3b8", paddingTop: 4 }}
          />

          {/* 이 종목 — 파란색 */}
          <Bar
            name="이 종목"
            dataKey="이_종목"
            fill="#3b82f6"
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          />

          {/* 업계 평균 — 주황색 */}
          <Bar
            name="업계 평균"
            dataKey="업계_평균"
            fill="#f97316"
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
            fillOpacity={0.75}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
