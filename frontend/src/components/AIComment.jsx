import { useState } from "react";
import { fetchAIComment } from "../utils/api";

/** 판정 → 뱃지 스타일 */
const VERDICT_STYLE = {
  긍정: {
    bg:    "bg-green-950  border-green-800/60",
    text:  "text-green-400",
    dot:   "bg-green-500",
    icon:  "📈",
  },
  부정: {
    bg:    "bg-red-950    border-red-800/60",
    text:  "text-red-400",
    dot:   "bg-red-500",
    icon:  "📉",
  },
  중립: {
    bg:    "bg-slate-800  border-slate-700",
    text:  "text-slate-300",
    dot:   "bg-slate-500",
    icon:  "📊",
  },
};

/** 태그 type → 칩 색상 */
const TAG_STYLE = {
  positive: "bg-green-950 text-green-400 border border-green-800/50",
  negative: "bg-red-950   text-red-400   border border-red-800/50",
  neutral:  "bg-slate-700 text-slate-400",
};

/**
 * AIComment
 * Props:
 *   ticker        - 종목 티커
 *   stockData     - { per, eps, pbr, roa, roe, ... }
 *   sectorAverages - { per, eps, pbr, roa, roe } | null
 *   newsSnippets  - string[] (HistoryChart 뉴스 스니펫, 선택적)
 */
export default function AIComment({ ticker, stockData, sectorAverages, newsSnippets = [] }) {
  const [result, setResult]   = useState(null);   // { rules, comment }
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  async function handleAnalyze() {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const data = await fetchAIComment({
        ticker,
        metrics: {
          per: stockData?.per,
          eps: stockData?.eps,
          pbr: stockData?.pbr,
          roa: stockData?.roa,
          roe: stockData?.roe,
        },
        sectorAverage: sectorAverages ?? null,
        newsSnippets,
      });
      setResult(data);
    } catch (e) {
      setError(e.message ?? "AI 분석 요청에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  const verdict = result?.rules?.verdict;
  const vstyle  = verdict ? VERDICT_STYLE[verdict] ?? VERDICT_STYLE["중립"] : null;

  return (
    <div className="bg-slate-800/60 rounded-2xl border border-slate-700 p-6 flex flex-col gap-5">

      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-slate-300">🤖 AI 투자 분석</h4>
          <p className="text-xs text-slate-500 mt-0.5">Claude AI 기반 참고용 코멘트</p>
        </div>

        {!result && (
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl
                       bg-blue-600 hover:bg-blue-500 disabled:opacity-50
                       text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10"
                    stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                분석 중…
              </>
            ) : (
              "🤖 AI 투자 분석 보기"
            )}
          </button>
        )}

        {result && (
          <button
            onClick={() => { setResult(null); setError(""); }}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
          >
            다시 분석
          </button>
        )}
      </div>

      {/* 에러 */}
      {error && (
        <div className="bg-red-950/50 border border-red-800/50 rounded-xl px-4 py-3 text-sm text-red-400">
          ⚠️ {error}
        </div>
      )}

      {/* 로딩 플레이스홀더 */}
      {loading && (
        <div className="flex flex-col gap-3 animate-pulse">
          <div className="h-10 bg-slate-700/50 rounded-xl" />
          <div className="h-4  bg-slate-700/40 rounded w-3/4" />
          <div className="h-4  bg-slate-700/40 rounded w-full" />
          <div className="h-4  bg-slate-700/40 rounded w-5/6" />
        </div>
      )}

      {/* 결과 */}
      {result && !loading && (
        <div className="flex flex-col gap-4">

          {/* 종합 판정 뱃지 */}
          {vstyle && (
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${vstyle.bg}`}>
              <span className="text-2xl">{vstyle.icon}</span>
              <div>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-0.5">
                  종합 판정
                </p>
                <p className={`text-lg font-bold ${vstyle.text}`}>{verdict}</p>
              </div>
            </div>
          )}

          {/* 규칙 태그 목록 */}
          {result.rules?.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {result.rules.tags.map((tag, i) => (
                <span
                  key={i}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full ${TAG_STYLE[tag.type] ?? TAG_STYLE.neutral}`}
                >
                  {tag.type === "positive" ? "🟢" : tag.type === "negative" ? "🔴" : "⚪"}{" "}
                  {tag.label}
                </span>
              ))}
            </div>
          )}

          {/* Claude 코멘트 */}
          {result.comment ? (
            <div className="bg-slate-700/30 border border-slate-600/50 rounded-xl px-4 py-4">
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-2">
                AI 코멘트
              </p>
              <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                {result.comment}
              </p>
            </div>
          ) : result.error ? (
            <div className="text-xs text-slate-500 bg-slate-700/20 rounded-xl px-4 py-3">
              ℹ️ {result.error}
            </div>
          ) : null}
        </div>
      )}

      {/* 빈 상태 — 버튼 클릭 전 안내 */}
      {!result && !loading && !error && (
        <p className="text-xs text-slate-600 text-center py-4">
          버튼을 클릭하면 Claude AI가 재무지표를 분석해드립니다.
        </p>
      )}

      {/* 면책 문구 */}
      <p className="text-xs text-slate-600 border-t border-slate-700 pt-4 leading-relaxed">
        ⚠️ AI 분석은 참고용이며 투자 결정의 근거가 될 수 없습니다.
        모든 투자 판단과 책임은 본인에게 있습니다.
      </p>
    </div>
  );
}
