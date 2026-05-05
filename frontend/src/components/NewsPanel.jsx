import { useState } from "react";
import { fetchNews, fetchNewsSummary } from "../utils/api";

/** 감성 → 아이콘·스타일 */
const SENTIMENT = {
  긍정: { icon: "🟢", text: "text-green-400", bg: "bg-green-950/60 border-green-800/50" },
  부정: { icon: "🔴", text: "text-red-400",   bg: "bg-red-950/60   border-red-800/50"   },
  중립: { icon: "🟡", text: "text-amber-400", bg: "bg-amber-950/40 border-amber-800/30" },
};

/** "2024-01-15T09:30:00Z" → "2024.01.15" */
function fmtDate(raw) {
  if (!raw) return "";
  try {
    const d = new Date(raw);
    if (isNaN(d)) return "";
    return d.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
  } catch {
    return "";
  }
}

function NewsCard({ item }) {
  const s = SENTIMENT[item.sentiment] ?? SENTIMENT["중립"];
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 hover:border-slate-600 transition-colors p-4 flex flex-col gap-2.5">

      {/* 감성 뱃지 + 제공사 */}
      <div className="flex items-center justify-between gap-2">
        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${s.bg} ${s.text}`}>
          {s.icon} {item.sentiment}
        </span>
        <span className="text-xs text-slate-600 truncate">{item.provider}</span>
      </div>

      {/* 제목 */}
      {item.title && (
        <p className="text-sm font-semibold text-slate-200 leading-snug line-clamp-2">
          {item.title}
        </p>
      )}

      {/* AI 요약 */}
      {item.summary && (
        <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
          {item.summary}
        </p>
      )}

      {/* 하단: 날짜 + 원문 링크 */}
      <div className="flex items-center justify-between mt-auto pt-1">
        <span className="text-xs text-slate-600">{fmtDate(item.published)}</span>
        {item.link ? (
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            원문 보기 →
          </a>
        ) : (
          <span className="text-xs text-slate-700">링크 없음</span>
        )}
      </div>
    </div>
  );
}

/**
 * NewsPanel
 * Props: ticker
 * 흐름: 버튼 클릭 → GET news → POST news-summary → 카드 렌더
 */
export default function NewsPanel({ ticker }) {
  const [news, setNews]       = useState(null);   // NewsCard[] | null
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  async function handleLoad() {
    setLoading(true);
    setError("");
    setNews(null);

    try {
      // 1. 원본 뉴스 가져오기
      const newsData = await fetchNews(ticker);
      const items = newsData?.news ?? [];

      if (items.length === 0) {
        setError("이 종목의 뉴스를 찾을 수 없습니다.");
        return;
      }

      // 2. AI 요약 요청
      const summaries = await fetchNewsSummary({ ticker, newsItems: items });
      setNews(summaries);
    } catch (e) {
      setError(e.message ?? "뉴스를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-slate-800/60 rounded-2xl border border-slate-700 p-6 flex flex-col gap-5">

      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-slate-300">📰 뉴스 요약</h4>
          <p className="text-xs text-slate-500 mt-0.5">최신 뉴스 5건 · AI 한국어 요약</p>
        </div>

        {!news && (
          <button
            onClick={handleLoad}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl
                       bg-slate-700 hover:bg-slate-600 disabled:opacity-50
                       text-white text-sm font-semibold border border-slate-600
                       transition-colors cursor-pointer"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10"
                    stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                불러오는 중…
              </>
            ) : "📰 뉴스 요약 불러오기"}
          </button>
        )}

        {news && (
          <button
            onClick={() => { setNews(null); setError(""); }}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
          >
            새로고침
          </button>
        )}
      </div>

      {/* 에러 */}
      {error && (
        <div className="bg-red-950/50 border border-red-800/50 rounded-xl px-4 py-3 text-sm text-red-400">
          ⚠️ {error}
        </div>
      )}

      {/* 로딩 스켈레톤 */}
      {loading && (
        <div className="flex flex-col gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-slate-800 rounded-xl border border-slate-700 p-4 animate-pulse flex flex-col gap-2">
              <div className="h-3 bg-slate-700 rounded w-16" />
              <div className="h-4 bg-slate-700 rounded w-4/5" />
              <div className="h-3 bg-slate-700 rounded w-full" />
              <div className="h-3 bg-slate-700 rounded w-2/3" />
            </div>
          ))}
        </div>
      )}

      {/* 뉴스 카드 */}
      {news && !loading && (
        <div className="flex flex-col gap-3">
          {news.map((item, i) => (
            <NewsCard key={i} item={item} />
          ))}
        </div>
      )}

      {/* 빈 상태 */}
      {!news && !loading && !error && (
        <p className="text-xs text-slate-600 text-center py-4">
          버튼을 클릭하면 최신 뉴스를 AI가 한국어로 요약해드립니다.
        </p>
      )}
    </div>
  );
}
