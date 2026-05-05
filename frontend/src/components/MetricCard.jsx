import {
  METRIC_CONFIGS,
  METRIC_DESCRIPTIONS,
  formatMetric,
  getMetricBadge,
} from "../utils/metrics";

/** 색상 클래스 맵 */
const BADGE_CLASSES = {
  green:   "bg-green-950 text-green-400 border border-green-800/50",
  red:     "bg-red-950   text-red-400   border border-red-800/50",
  neutral: "bg-slate-700 text-slate-400",
};

const BADGE_DOT = {
  green:   "🟢",
  red:     "🔴",
  neutral: "⚪",
};

/**
 * MetricCard
 * Props: metricKey, value, sectorAvg
 */
export default function MetricCard({ metricKey, value, sectorAvg }) {
  const cfg   = METRIC_CONFIGS[metricKey];
  const badge = getMetricBadge(metricKey, value, sectorAvg);
  const desc  = METRIC_DESCRIPTIONS[metricKey];

  return (
    <div className="bg-slate-800/60 rounded-xl px-4 py-4 border border-slate-700 hover:border-slate-500 transition-colors flex flex-col gap-3">

      {/* 상단: 레이블 + ⓘ 툴팁 */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            {cfg.label}
          </p>
          <p className="text-xs text-slate-600 mt-0.5">{cfg.fullName}</p>
        </div>

        {/* ⓘ 아이콘 — Tailwind group-hover 순수 CSS 툴팁 */}
        <div className="relative group">
          <button
            type="button"
            className="w-5 h-5 flex items-center justify-center rounded-full
                       text-slate-500 hover:text-slate-300 hover:bg-slate-700
                       text-xs font-bold transition-colors cursor-default"
            aria-label={`${cfg.label} 설명`}
          >
            ⓘ
          </button>
          {/* 툴팁 박스 */}
          <div
            className="absolute right-0 top-7 z-20 w-56 px-3 py-2.5
                       bg-slate-700 border border-slate-600 rounded-xl shadow-xl
                       text-xs text-slate-200 leading-relaxed
                       opacity-0 pointer-events-none
                       group-hover:opacity-100 group-hover:pointer-events-auto
                       transition-opacity duration-150"
          >
            {/* 말풍선 꼭지 */}
            <span
              className="absolute -top-1.5 right-3 w-3 h-3 bg-slate-700 border-l border-t border-slate-600 rotate-45"
            />
            {desc}
          </div>
        </div>
      </div>

      {/* 수치 */}
      <p className="text-2xl font-bold text-white leading-none">
        {formatMetric(metricKey, value)}
      </p>

      {/* 뱃지 */}
      {badge && (
        <span
          className={`self-start text-xs font-semibold px-2 py-0.5 rounded-full ${BADGE_CLASSES[badge.color]}`}
        >
          {BADGE_DOT[badge.color]} {badge.label}
        </span>
      )}

      {/* 업계 평균 */}
      {sectorAvg != null ? (
        <p className="text-xs text-slate-500 -mt-1">
          업계 평균{" "}
          <span className="text-slate-400 font-medium">
            {formatMetric(metricKey, sectorAvg)}
          </span>
        </p>
      ) : (
        <p className="text-xs text-slate-700 -mt-1">업계 평균 로딩 중…</p>
      )}
    </div>
  );
}
