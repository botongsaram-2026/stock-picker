import { useState } from "react";
import SearchBar from "./components/SearchBar";
import MetricCard from "./components/MetricCard";
import RadarChart from "./components/RadarChart";
import BarComparison from "./components/BarComparison";
import { useFavorites } from "./hooks/useFavorites";
import { fetchStockData, fetchSectorAverage } from "./utils/api";
import { METRIC_KEYS, formatMetric } from "./utils/metrics";

export default function App() {
  const [loading, setLoading] = useState(false);
  const [stockData, setStockData] = useState(null);
  const [sectorData, setSectorData] = useState(null);
  const [sectorLoading, setSectorLoading] = useState(false);
  const [apiError, setApiError] = useState("");
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

      // 섹터 평균은 별도로 백그라운드 로드 (느린 API)
      setSectorLoading(true);
      fetchSectorAverage(ticker)
        .then((s) => setSectorData(s?.averages ? s : null))
        .catch(() => setSectorData(null))
        .finally(() => setSectorLoading(false));
    } catch {
      setApiError("서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인해주세요.");
    } finally {
      setLoading(false);
    }
  }

  const sectorAverages = sectorData?.averages ?? null;

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">

      {/* 헤더 */}
      <header className="border-b border-slate-700/60 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">밸류체크 📊</h1>
            <p className="text-xs text-slate-400 mt-0.5">주식 재무지표 조회 및 AI 투자 판단 보조</p>
          </div>
        </div>
      </header>

      {/* 메인 */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12 flex flex-col gap-10">

        {/* 검색 */}
        <section className="flex flex-col items-center gap-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight mb-2">종목을 검색하세요</h2>
            <p className="text-slate-400 text-sm">미국·한국 주식 모두 지원 · 티커 또는 종목코드 입력</p>
          </div>
          <SearchBar onSearch={handleSearch} loading={loading} />
          {apiError && (
            <div className="w-full max-w-2xl bg-red-900/40 border border-red-700 rounded-xl px-5 py-4 text-sm text-red-300">
              ⚠️ {apiError}
            </div>
          )}
        </section>

        {stockData && (
          <>
            {/* 종목 헤더 */}
            <section className="bg-slate-800/60 rounded-2xl px-6 py-5 border border-slate-700">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-bold">{stockData.name}</h3>
                  <p className="text-slate-400 text-sm mt-1">
                    {stockData.ticker}
                    {stockData.sector && (
                      <> · <span className="text-slate-500">{stockData.sector}</span></>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  {/* 현재가 */}
                  <div className="text-right">
                    <p className="text-xs text-slate-500 mb-0.5">현재가</p>
                    <p className="text-xl font-bold text-white">
                      {stockData.price != null
                        ? `${stockData.price.toLocaleString()} ${stockData.currency ?? ""}`
                        : "-"}
                    </p>
                  </div>
                  {/* 즐겨찾기 */}
                  <button
                    onClick={() =>
                      isFavorite(stockData.ticker)
                        ? removeFavorite(stockData.ticker)
                        : addFavorite(stockData.ticker)
                    }
                    className="text-2xl transition hover:scale-110 cursor-pointer mt-1"
                    title={isFavorite(stockData.ticker) ? "즐겨찾기 해제" : "즐겨찾기 추가"}
                  >
                    {isFavorite(stockData.ticker) ? "★" : "☆"}
                  </button>
                </div>
              </div>

              {/* 섹터 데이터 로딩 인디케이터 */}
              {sectorLoading && (
                <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                  <svg className="animate-spin h-3 w-3 text-slate-500" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  섹터 평균 데이터 불러오는 중…
                </div>
              )}
              {sectorData && (
                <p className="mt-3 text-xs text-slate-500">
                  섹터 평균 비교: {sectorData.sector} ·{" "}
                  {sectorData.peer_count}개 종목 기준
                </p>
              )}
            </section>

            {/* MetricCard 그리드 */}
            <section>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
                재무 지표
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {METRIC_KEYS.map((key) => (
                  <MetricCard
                    key={key}
                    metricKey={key}
                    value={stockData[key]}
                    sectorAvg={sectorAverages?.[key] ?? null}
                  />
                ))}
              </div>
            </section>

            {/* 차트 영역: 섹터 데이터 있을 때만 표시 */}
            {sectorAverages && (
              <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <RadarChart stockData={stockData} sectorAverages={sectorAverages} />
                <BarComparison stockData={stockData} sectorAverages={sectorAverages} />
              </section>
            )}
          </>
        )}

        {/* 즐겨찾기 */}
        {favorites.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
              즐겨찾기
            </h3>
            <div className="flex flex-wrap gap-2">
              {favorites.map((ticker) => (
                <div
                  key={ticker}
                  className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm"
                >
                  <button
                    onClick={() => handleSearch(ticker)}
                    className="text-blue-400 hover:text-blue-300 font-mono font-medium cursor-pointer transition"
                  >
                    {ticker}
                  </button>
                  <button
                    onClick={() => removeFavorite(ticker)}
                    className="text-slate-500 hover:text-red-400 text-xs cursor-pointer transition"
                    title="즐겨찾기 삭제"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* 푸터 */}
      <footer className="border-t border-slate-700/60 py-5">
        <p className="text-center text-xs text-slate-500 px-4">
          본 앱은 투자 참고용이며, 투자 판단의 책임은 본인에게 있습니다.
        </p>
      </footer>

    </div>
  );
}
