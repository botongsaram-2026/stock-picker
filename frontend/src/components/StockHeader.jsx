/**
 * StockHeader
 * 종목명, 티커, 섹터, 현재가 + 즐겨찾기 토글 표시
 * Props:
 *   stockData      - API 응답 { name, ticker, sector, price, currency }
 *   isFav          - boolean
 *   onToggleFav    - () => void
 *   sectorInfo     - { sector, peer_count } | null
 *   sectorLoading  - boolean
 */
export default function StockHeader({
  stockData,
  isFav,
  onToggleFav,
  sectorInfo,
  sectorLoading,
}) {
  return (
    <div className="bg-slate-800/60 rounded-2xl px-6 py-5 border border-slate-700">
      <div className="flex items-start justify-between gap-4">
        {/* 좌측: 종목 정보 */}
        <div className="min-w-0">
          <h3 className="text-xl font-bold text-white truncate">{stockData.name}</h3>
          <div className="flex flex-wrap items-center gap-x-2 mt-1 text-sm text-slate-400">
            <span className="font-mono font-semibold text-slate-300">
              {stockData.ticker}
            </span>
            {stockData.sector && (
              <>
                <span className="text-slate-600">·</span>
                <span className="text-slate-500">{stockData.sector}</span>
              </>
            )}
          </div>

          {/* 섹터 평균 상태 */}
          <div className="mt-2 h-4">
            {sectorLoading ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10"
                    stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                업계 평균 계산 중…
              </span>
            ) : sectorInfo ? (
              <span className="text-xs text-slate-600">
                업계 평균 비교 기준: {sectorInfo.peer_count}개 종목
              </span>
            ) : null}
          </div>
        </div>

        {/* 우측: 현재가 + 즐겨찾기 */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <p className="text-xs text-slate-500 mb-0.5">현재가</p>
            <p className="text-2xl font-bold text-white leading-none">
              {stockData.price != null
                ? stockData.price.toLocaleString()
                : "-"}
            </p>
            {stockData.currency && (
              <p className="text-xs text-slate-500 mt-0.5">{stockData.currency}</p>
            )}
          </div>

          <button
            onClick={onToggleFav}
            className="text-2xl leading-none transition-transform hover:scale-125 active:scale-95 cursor-pointer"
            title={isFav ? "즐겨찾기 해제" : "즐겨찾기 추가"}
            aria-label={isFav ? "즐겨찾기 해제" : "즐겨찾기 추가"}
          >
            {isFav ? "⭐" : "☆"}
          </button>
        </div>
      </div>
    </div>
  );
}
