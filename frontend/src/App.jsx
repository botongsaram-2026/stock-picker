import { useState } from "react";
import SearchBar  from "./components/SearchBar";
import StockPage  from "./pages/StockPage";
import { useFavorites } from "./hooks/useFavorites";
import { fetchStockData, fetchSectorAverage } from "./utils/api";

// ─────────────────────────────────────────
// 검색 결과 로딩 중 스켈레톤
// ─────────────────────────────────────────
function Sh({ className }) {
  return <div className={`animate-shimmer rounded-xl ${className}`} />;
}

function PageSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {/* StockHeader */}
      <Sh className="h-28 border border-slate-700/40" />

      {/* 탭 바 */}
      <div className="flex gap-6 border-b border-slate-700 pb-3">
        <Sh className="h-4 w-20 rounded" />
        <Sh className="h-4 w-20 rounded" />
      </div>

      {/* 섹션 레이블 */}
      <Sh className="h-3 w-14 rounded" />

      {/* MetricCard 그리드 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-700/40 p-4 flex flex-col gap-3">
            <Sh className="h-3 w-10 rounded" />
            <Sh className="h-7 w-14 rounded" />
            <Sh className="h-3 w-16 rounded" />
            <Sh className="h-5 w-20 rounded-full" />
          </div>
        ))}
      </div>

      {/* 섹션 레이블 */}
      <Sh className="h-3 w-24 rounded" />

      {/* 차트 2개 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Sh className="h-72 rounded-2xl border border-slate-700/30" />
        <Sh className="h-72 rounded-2xl border border-slate-700/30" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// App
// ─────────────────────────────────────────
export default function App() {
  const [loading, setLoading]             = useState(false);
  const [stockData, setStockData]         = useState(null);
  const [sectorData, setSectorData]       = useState(null);
  const [sectorLoading, setSectorLoading] = useState(false);
  const [apiError, setApiError]           = useState("");

  const { favorites, addFavorite, removeFavorite, isFavorite } = useFavorites();

  async function handleSearch(ticker) {
    setLoading(true);
    setApiError("");
    setStockData(null);
    setSectorData(null);

    try {
      const data = await fetchStockData(ticker);
      if (data.error) {
        setApiError(data.error);
        return;
      }
      setStockData(data);

      // 업계 평균은 백그라운드 로드 (느린 API)
      setSectorLoading(true);
      fetchSectorAverage(ticker)
        .then((s) => setSectorData(s?.averages ? s : null))
        .catch(()  => setSectorData(null))
        .finally(() => setSectorLoading(false));
    } catch {
      setApiError("서버에 연결할 수 없습니다. 백엔드가 실행 중인지 확인해주세요.");
    } finally {
      setLoading(false);
    }
  }

  const sectorAverages = sectorData?.averages ?? null;

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">

      {/* ── 헤더 ── */}
      <header className="border-b border-slate-700/60 bg-slate-900/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="shrink-0">
            <h1 className="text-lg font-extrabold tracking-tight text-white">
              밸류체크 <span className="text-blue-400">📊</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">
              주식 재무지표 조회 및 AI 투자 판단 보조
            </p>
          </div>

          {/* 즐겨찾기 칩 (헤더 우측) */}
          {favorites.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none max-w-xs sm:max-w-md">
              {favorites.map((ticker) => (
                <div key={ticker}
                  className="flex items-center gap-1.5 bg-slate-800 border border-slate-700
                             rounded-lg px-2.5 py-1 text-xs shrink-0">
                  <button
                    onClick={() => handleSearch(ticker)}
                    className="text-blue-400 hover:text-blue-300 font-mono font-semibold
                               cursor-pointer transition-colors"
                  >
                    {ticker}
                  </button>
                  <button
                    onClick={() => removeFavorite(ticker)}
                    className="text-slate-600 hover:text-red-400 cursor-pointer transition-colors"
                    title="즐겨찾기 삭제"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* ── 메인 ── */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 flex flex-col gap-10 py-10">

        {/* 검색 섹션 */}
        <section className="flex flex-col items-center gap-5">
          {!stockData && !loading && (
            <div className="text-center">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2">
                종목을 검색하세요
              </h2>
              <p className="text-slate-400 text-sm">
                미국·한국 주식 모두 지원 · 티커 또는 종목코드 입력
              </p>
            </div>
          )}

          <SearchBar onSearch={handleSearch} loading={loading} />

          {apiError && (
            <div className="w-full max-w-2xl bg-red-950/50 border border-red-800/60 rounded-xl px-5 py-4 text-sm text-red-300">
              ⚠️ {apiError}
            </div>
          )}
        </section>

        {/* 로딩 스켈레톤 */}
        {loading && <PageSkeleton />}

        {/* 검색 결과 페이지 */}
        {stockData && !loading && (
          <StockPage
            stockData={stockData}
            sectorData={sectorData}
            sectorAverages={sectorAverages}
            sectorLoading={sectorLoading}
            isFav={isFavorite(stockData.ticker)}
            onToggleFav={() =>
              isFavorite(stockData.ticker)
                ? removeFavorite(stockData.ticker)
                : addFavorite(stockData.ticker)
            }
          />
        )}
      </main>

      {/* ── 푸터 ── */}
      <footer className="border-t border-slate-700/40 py-5">
        <p className="text-center text-xs text-slate-600 px-4">
          © 2025 밸류체크 · 투자 참고용 서비스입니다. 투자 판단의 책임은 본인에게 있습니다.
        </p>
      </footer>
    </div>
  );
}
