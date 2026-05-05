import { useState } from "react";
import SearchBar from "./components/SearchBar";
import { useFavorites } from "./hooks/useFavorites";
import { fetchStockData } from "./utils/api";

export default function App() {
  const [loading, setLoading] = useState(false);
  const [stockData, setStockData] = useState(null);
  const [apiError, setApiError] = useState("");
  const { favorites, addFavorite, removeFavorite, isFavorite } = useFavorites();

  async function handleSearch(ticker) {
    setLoading(true);
    setApiError("");
    setStockData(null);
    try {
      const data = await fetchStockData(ticker);
      if (data.error) {
        setApiError(data.error);
      } else {
        setStockData(data);
      }
    } catch {
      setApiError("서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인해주세요.");
    } finally {
      setLoading(false);
    }
  }

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

        {/* 검색 섹션 */}
        <section className="flex flex-col items-center gap-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight mb-2">종목을 검색하세요</h2>
            <p className="text-slate-400 text-sm">미국·한국 주식 모두 지원 · 티커 또는 종목코드 입력</p>
          </div>
          <SearchBar onSearch={handleSearch} loading={loading} />

          {/* API 에러 */}
          {apiError && (
            <div className="w-full max-w-2xl bg-red-900/40 border border-red-700 rounded-xl px-5 py-4 text-sm text-red-300">
              ⚠️ {apiError}
            </div>
          )}
        </section>

        {/* 검색 결과 미리보기 (이후 단계에서 카드 컴포넌트로 교체) */}
        {stockData && (
          <section className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold">{stockData.name}</h3>
                <p className="text-slate-400 text-sm mt-0.5">
                  {stockData.ticker} · {stockData.sector || "섹터 정보 없음"}
                </p>
              </div>
              <button
                onClick={() =>
                  isFavorite(stockData.ticker)
                    ? removeFavorite(stockData.ticker)
                    : addFavorite(stockData.ticker)
                }
                className="text-xl transition hover:scale-110 cursor-pointer"
                title={isFavorite(stockData.ticker) ? "즐겨찾기 해제" : "즐겨찾기 추가"}
              >
                {isFavorite(stockData.ticker) ? "★" : "☆"}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { label: "현재가", value: stockData.price != null ? `${stockData.price.toLocaleString()} ${stockData.currency ?? ""}` : "-" },
                { label: "PER",    value: stockData.per  != null ? stockData.per.toFixed(2)  : "-" },
                { label: "EPS",    value: stockData.eps  != null ? stockData.eps.toFixed(2)  : "-" },
                { label: "PBR",    value: stockData.pbr  != null ? stockData.pbr.toFixed(2)  : "-" },
                { label: "ROA",    value: stockData.roa  != null ? (stockData.roa * 100).toFixed(2) + "%" : "-" },
                { label: "ROE",    value: stockData.roe  != null ? (stockData.roe * 100).toFixed(2) + "%" : "-" },
              ].map(({ label, value }) => (
                <div key={label} className="bg-slate-700/50 rounded-xl px-4 py-3">
                  <p className="text-xs text-slate-400 mb-1">{label}</p>
                  <p className="text-lg font-semibold">{value}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 즐겨찾기 */}
        {favorites.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-3">
              즐겨찾기
            </h3>
            <div className="flex flex-wrap gap-2">
              {favorites.map((ticker) => (
                <div key={ticker}
                  className="flex items-center gap-2 bg-slate-800 border border-slate-700
                             rounded-lg px-3 py-1.5 text-sm">
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

      {/* 푸터 면책 문구 */}
      <footer className="border-t border-slate-700/60 py-5">
        <p className="text-center text-xs text-slate-500 px-4">
          본 앱은 투자 참고용이며, 투자 판단의 책임은 본인에게 있습니다.
        </p>
      </footer>

    </div>
  );
}
