import { METRIC_CONFIGS, formatMetric, calcDiff } from "../utils/metrics";

/**
 * 단일 재무지표 카드
 * - 지표값 + 섹터 평균 비교 뱃지 표시
 * - diff > 0 (유리) = 초록, diff < 0 (불리) = 빨강
 */
export default function MetricCard({ metricKey, value, sectorAvg }) {
  const cfg = METRIC_CONFIGS[metricKey];
  const diff = calcDiff(metricKey, value, sectorAvg);
  const hasDiff = diff != null && sectorAvg != null;

  const badgeStyle = !hasDiff
    ? ""
    : Math.abs(diff) < 2
    ? "bg-slate-700 text-slate-400"
    : diff > 0
    ? "bg-green-950 text-green-400 border border-green-800/60"
    : "bg-red-950 text-red-400 border border-red-800/60";

  const arrow = !hasDiff ? "" : diff > 1.9 ? "▲" : diff < -1.9 ? "▼" : "—";

  return (
    <div className="bg-slate-800/60 rounded-xl px-4 py-4 border border-slate-700 hover:border-slate-500 transition-colors">
      {/* 상단: 레이블 + 뱃지 */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            {cfg.label}
          </p>
          <p className="text-xs text-slate-600 mt-0.5">{cfg.fullName}</p>
        </div>

        {hasDiff && (
          <span
            className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${badgeStyle}`}
          >
            {arrow} {Math.abs(diff).toFixed(1)}%
          </span>
        )}
      </div>

      {/* 지표값 */}
      <p className="text-2xl font-bold text-white leading-none">
        {formatMetric(metricKey, value)}
      </p>

      {/* 섹터 평균 */}
      {sectorAvg != null ? (
        <p className="text-xs text-slate-500 mt-2">
          섹터 평균{" "}
          <span className="text-slate-400 font-medium">
            {formatMetric(metricKey, sectorAvg)}
          </span>
        </p>
      ) : (
        <p className="text-xs text-slate-600 mt-2">섹터 데이터 로딩 중…</p>
      )}
    </div>
  );
}
