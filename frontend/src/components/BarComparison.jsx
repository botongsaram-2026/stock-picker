import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { METRIC_CONFIGS, METRIC_KEYS, calcScore, formatMetric } from "../utils/metrics";

function buildData(stockData, sectorAverages) {
  return METRIC_KEYS.map((key) => {
    const stockVal = stockData?.[key];
    const sectorVal = sectorAverages?.[key];
    const score = calcScore(key, stockVal, sectorVal);
    return {
      name: METRIC_CONFIGS[key].label,
      점수: score != null ? Math.round(score * 10) / 10 : null,
      _stockRaw: formatMetric(key, stockVal),
      _sectorRaw: formatMetric(key, sectorVal),
      _better: score != null ? score >= 50 : null,
    };
  });
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  const score = d?.["점수"];
  const diff = score != null ? score - 50 : null;

  return (
    <div
      style={{
        backgroundColor: "#1e293b",
        border: "1px solid #334155",
        borderRadius: 8,
        padding: "8px 12px",
        fontSize: 12,
        minWidth: 160,
      }}
    >
      <p style={{ color: "#f1f5f9", fontWeight: 700, marginBottom: 6 }}>{label}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <p style={{ color: "#60a5fa" }}>
          종목 &nbsp;&nbsp;{d?._stockRaw}
        </p>
        <p style={{ color: "#94a3b8" }}>
          섹터 평균 &nbsp;{d?._sectorRaw}
        </p>
        {diff != null && (
          <p
            style={{
              color: diff >= 0 ? "#4ade80" : "#f87171",
              marginTop: 2,
              fontWeight: 600,
            }}
          >
            {diff >= 0 ? "▲" : "▼"} 섹터 평균 대비{" "}
            {Math.abs(diff).toFixed(1)}점
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * 섹터 평균 비교 막대 차트
 * - Y축: 0–100 상대 점수 (50 = 섹터 평균 기준선)
 * - 50점 이상 = 파란색(유리), 미만 = 빨간색(불리)
 */
export default function BarComparison({ stockData, sectorAverages }) {
  const data = buildData(stockData, sectorAverages);
  const hasData = data.some((d) => d["점수"] != null);

  if (!hasData) {
    return (
      <div className="bg-slate-800/60 rounded-2xl border border-slate-700 p-6 flex items-center justify-center h-48">
        <p className="text-sm text-slate-500">섹터 비교 데이터를 불러오는 중…</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/60 rounded-2xl border border-slate-700 p-6">
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-widest">
          섹터 평균 비교
        </h4>
        <p className="text-xs text-slate-500 mt-1">
          섹터 평균 기준 점수 · 50점 이상 = 유리&nbsp;
          <span className="inline-block w-2 h-2 rounded-full bg-blue-500 align-middle" />
          &nbsp;/ 미만 = 불리&nbsp;
          <span className="inline-block w-2 h-2 rounded-full bg-red-500 align-middle" />
        </p>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} barCategoryGap="35%">
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
          {/* 섹터 평균 = 50점 기준선 */}
          <ReferenceLine
            y={50}
            stroke="#64748b"
            strokeDasharray="5 3"
            strokeWidth={1.5}
            label={{
              value: "섹터 평균",
              position: "insideTopRight",
              fill: "#64748b",
              fontSize: 10,
              dy: -4,
            }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(51,65,85,0.3)" }} />
          <Legend
            iconSize={8}
            wrapperStyle={{ fontSize: 12, color: "#94a3b8", paddingTop: 4 }}
            formatter={() => "종목 점수"}
          />
          <Bar dataKey="점수" radius={[5, 5, 0, 0]} maxBarSize={56}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={
                  entry["점수"] == null
                    ? "#334155"
                    : entry["_better"]
                    ? "#3b82f6"
                    : "#ef4444"
                }
                fillOpacity={0.85}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
