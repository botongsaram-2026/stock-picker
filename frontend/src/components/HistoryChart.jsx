import { useState, useEffect, useRef } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { fetchHistory } from "../utils/api";
import {
  METRIC_CONFIGS,
  METRIC_KEYS,
  formatMetric,
  normalizeForChart,
} from "../utils/metrics";

const LINE_COLORS = {
  per: "#3b82f6",
  eps: "#10b981",
  pbr: "#f59e0b",
  roa: "#a78bfa",
  roe: "#f43f5e",
};

const PERIODS = [
  { label: "1년", value: "1y", years: 1 },
  { label: "3년", value: "3y", years: 3 },
  { label: "5년", value: "5y", years: 5 },
];

function formatPeriodLabel(periodStr, granularity) {
  const [year, month] = periodStr.split("-");
  if (granularity === "annual") return year;
  const q = Math.ceil(parseInt(month, 10) / 3);
  return `${year} Q${q}`;
}

function filterByPeriod(data, period) {
  if (!data?.length) return [];
  const yearsBack = PERIODS.find((p) => p.value === period)?.years ?? 5;
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - yearsBack);
  return data.filter((d) => new Date(d.period) >= cutoff);
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#1e293b", border: "1px solid #334155",
      borderRadius: 10, padding: "10px 14px", fontSize: 12,
    }}>
      <p style={{ color: "#f1f5f9", fontWeight: 700, marginBottom: 6 }}>{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color, marginTop: 3 }}>
          {METRIC_CONFIGS[p.dataKey]?.label ?? p.dataKey}:&nbsp;
          <span style={{ color: "#f1f5f9", fontWeight: 600 }}>
            {formatMetric(p.dataKey, p.payload[`${p.dataKey}_raw`])}
          </span>
          <span style={{ color: "#64748b" }}> ({p.value}점)</span>
        </p>
      ))}
    </div>
  );
}

/**
 * HistoryChart — 과거 추이 라인 차트 (탭 없는 독립 컴포넌트)
 * Props:
 *   ticker        - 종목 티커
 *   sectorAverages - { per, eps, pbr, roa, roe } | null
 */
export default function HistoryChart({ ticker, sectorAverages }) {
  const [historyData, setHistoryData]   = useState(null);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");
  const [period, setPeriod]             = useState("5y");
  const [granularity, setGranularity]   = useState("annual");
  const [selectedMetrics, setSelectedMetrics] = useState(["per", "roe"]);
  const [showSectorAvg, setShowSectorAvg]     = useState(true);

  const loadedTickerRef = useRef(null);
  const isKorean = ticker?.endsWith(".KS") || ticker?.endsWith(".KQ");

  // 티커 변경 시 데이터 초기화 + 즉시 페치
  useEffect(() => {
    if (!ticker) return;
    if (loadedTickerRef.current === ticker) return;
    loadedTickerRef.current = ticker;

    let cancelled = false;
    setLoading(true);
    setHistoryData(null);
    setError("");

    fetchHistory(ticker)
      .then((data) => {
        if (cancelled) return;
        if (data?.annual?.length > 0 || data?.quarterly?.length > 0) {
          setHistoryData(data);
        } else {
          setError("no-data");
        }
      })
      .catch(() => { if (!cancelled) setError("fetch-error"); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [ticker]);

  function toggleMetric(key) {
    setSelectedMetrics((prev) =>
      prev.includes(key)
        ? prev.length === 1 ? prev : prev.filter((k) => k !== key)
        : [...prev, key]
    );
  }

  const chartData = (() => {
    if (!historyData) return [];
    const raw = granularity === "quarterly"
      ? historyData.quarterly
      : historyData.annual;
    return filterByPeriod(raw, period).map((d) => {
      const row = { period: formatPeriodLabel(d.period, granularity) };
      METRIC_KEYS.forEach((key) => {
        row[key] = d[key] != null
          ? Math.round(normalizeForChart(key, d[key]) * 10) / 10
          : null;
        row[`${key}_raw`] = d[key];
      });
      return row;
    });
  })();

  const hasData    = !loading && !error;
  const showChart  = hasData && chartData.length > 0;
  const showEmpty  = hasData && chartData.length === 0 && historyData;

  return (
    <div className="bg-slate-800/60 rounded-2xl border border-slate-700 p-6 flex flex-col gap-5">

      <div>
        <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-widest">
          과거 추이
        </h4>
        <p className="text-xs text-slate-500 mt-1">
          지표별 0–100점 환산 · 높을수록 우수
        </p>
      </div>

      {/* 로딩 */}
      {loading && (
        <div className="flex items-center justify-center h-52 gap-3 text-slate-400">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10"
              stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span className="text-sm">과거 데이터 불러오는 중…</span>
        </div>
      )}

      {/* 오류 */}
      {!loading && error && (
        <div className="flex flex-col items-center justify-center h-52 gap-3 text-center px-4">
          <span className="text-4xl">📉</span>
          <p className="text-slate-400 text-sm font-medium">
            해당 종목의 과거 데이터를 가져올 수 없습니다.
          </p>
          {isKorean && (
            <p className="text-slate-600 text-xs">
              한국 주식은 과거 데이터가 제한될 수 있어요.
            </p>
          )}
        </div>
      )}

      {/* 컨트롤 */}
      {hasData && historyData && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            {/* 기간 */}
            <div className="flex items-center gap-1 bg-slate-700/50 p-1 rounded-lg">
              {PERIODS.map(({ label, value }) => (
                <button key={value} onClick={() => setPeriod(value)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer
                    ${period === value ? "bg-slate-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"}`}
                >{label}</button>
              ))}
            </div>

            {/* 연간 / 분기 */}
            <div className="flex items-center gap-1 bg-slate-700/50 p-1 rounded-lg">
              {[["annual", "연간"], ["quarterly", "분기"]].map(([v, l]) => (
                <button key={v} onClick={() => setGranularity(v)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer
                    ${granularity === v ? "bg-slate-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"}`}
                >{l}</button>
              ))}
            </div>

            {/* 업계 평균 오버레이 */}
            {sectorAverages && (
              <label className="flex items-center gap-1.5 cursor-pointer select-none ml-auto">
                <input type="checkbox" checked={showSectorAvg}
                  onChange={(e) => setShowSectorAvg(e.target.checked)}
                  className="accent-blue-500 w-3.5 h-3.5"
                />
                <span className="text-xs text-slate-400">업계 평균</span>
              </label>
            )}
          </div>

          {/* 지표 토글 */}
          <div className="flex flex-wrap gap-2">
            {METRIC_KEYS.map((key) => {
              const selected = selectedMetrics.includes(key);
              const color    = LINE_COLORS[key];
              return (
                <button key={key} onClick={() => toggleMetric(key)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                              text-xs font-semibold border transition-all cursor-pointer
                              ${!selected && "border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300"}`}
                  style={selected ? { backgroundColor: color + "22", borderColor: color, color } : {}}
                >
                  <span className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: color }} />
                  {METRIC_CONFIGS[key].label}
                </button>
              );
            })}
            <span className="text-xs text-slate-700 self-center">복수 선택 가능</span>
          </div>
        </>
      )}

      {/* 기간 내 데이터 없음 */}
      {showEmpty && (
        <div className="flex flex-col items-center justify-center h-48 gap-2 text-center">
          <p className="text-slate-400 text-sm">선택한 기간에 데이터가 없습니다.</p>
          <p className="text-slate-600 text-xs">다른 기간이나 연간/분기를 선택해보세요.</p>
        </div>
      )}

      {/* 라인 차트 */}
      {showChart && (
        <>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}
              margin={{ top: 4, right: 16, bottom: 4, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="period"
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                axisLine={{ stroke: "#334155" }} tickLine={false} />
              <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]}
                tick={{ fill: "#475569", fontSize: 10 }}
                axisLine={false} tickLine={false} width={30} />
              <Tooltip content={<ChartTooltip />} />
              <Legend iconSize={8}
                wrapperStyle={{ fontSize: 12, color: "#94a3b8", paddingTop: 8 }} />

              {/* 업계 평균 기준선 */}
              {showSectorAvg && sectorAverages &&
                selectedMetrics.map((key) => {
                  const avgVal = sectorAverages[key];
                  if (avgVal == null) return null;
                  const score = Math.round(normalizeForChart(key, avgVal) * 10) / 10;
                  return (
                    <ReferenceLine key={`ref-${key}`} y={score}
                      stroke={LINE_COLORS[key]} strokeDasharray="5 3"
                      strokeOpacity={0.45}
                      label={{ value: `${METRIC_CONFIGS[key].label} 업계`,
                        position: "insideTopRight",
                        fill: LINE_COLORS[key], fontSize: 9, opacity: 0.65 }}
                    />
                  );
                })}

              {/* 지표 라인 */}
              {selectedMetrics.map((key) => (
                <Line key={key} type="monotone" dataKey={key}
                  name={METRIC_CONFIGS[key].label}
                  stroke={LINE_COLORS[key]} strokeWidth={2}
                  dot={{ fill: LINE_COLORS[key], r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>

          <p className="text-xs text-slate-600 text-center -mt-2">
            Y축: 지표별 0–100 환산 점수 · 점선 = 현재 업계 평균
          </p>
        </>
      )}
    </div>
  );
}
