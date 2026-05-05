import { useState } from "react";
import StockHeader   from "../components/StockHeader";
import MetricCard    from "../components/MetricCard";
import GlossaryPanel from "../components/GlossaryPanel";
import RadarChart    from "../components/RadarChart";
import BarComparison from "../components/BarComparison";
import AIComment     from "../components/AIComment";
import NewsPanel     from "../components/NewsPanel";
import HistoryChart  from "../components/HistoryChart";
import { METRIC_KEYS } from "../utils/metrics";

// ─────────────────────────────────────────
// Shimmer 스켈레톤 프리미티브
// ─────────────────────────────────────────
function Sh({ className }) {
  return <div className={`animate-shimmer rounded-xl ${className}`} />;
}

function MetricsSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="rounded-xl border border-slate-700/50 p-4 flex flex-col gap-3">
          <Sh className="h-3 w-10" />
          <Sh className="h-7 w-16" />
          <Sh className="h-3 w-14" />
          <Sh className="h-5 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}

function ChartsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Sh className="h-72 rounded-2xl border border-slate-700/30" />
      <Sh className="h-72 rounded-2xl border border-slate-700/30" />
    </div>
  );
}

function AINSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {[...Array(2)].map((_, i) => (
        <div key={i} className="rounded-2xl border border-slate-700/50 p-6 flex flex-col gap-4">
          <div className="flex justify-between">
            <Sh className="h-4 w-28" />
            <Sh className="h-8 w-32 rounded-xl" />
          </div>
          <Sh className="h-3 w-full" />
          <Sh className="h-3 w-4/5" />
          <Sh className="h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────
// 섹션 헤더 유틸
// ─────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
      {children}
    </p>
  );
}

// ─────────────────────────────────────────
// 현재 스냅샷 탭
// ─────────────────────────────────────────
function SnapshotTab({ stockData, sectorAverages, sectorLoading }) {
  return (
    <div className="flex flex-col gap-10">

      {/* MetricCard 5개 + GlossaryPanel */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <SectionLabel>재무 지표</SectionLabel>
          <GlossaryPanel />
        </div>
        {sectorLoading && !sectorAverages ? (
          <MetricsSkeleton />
        ) : (
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
        )}
      </section>

      {/* RadarChart + BarComparison */}
      <section>
        <SectionLabel>업계 비교 차트</SectionLabel>
        {sectorLoading && !sectorAverages ? (
          <ChartsSkeleton />
        ) : sectorAverages ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <RadarChart stockData={stockData} sectorAverages={sectorAverages} />
            <BarComparison stockData={stockData} sectorAverages={sectorAverages} />
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-700/40 py-10 text-center">
            <p className="text-sm text-slate-600">업계 비교 데이터를 사용할 수 없습니다.</p>
          </div>
        )}
      </section>

      {/* AIComment + NewsPanel */}
      <section>
        <SectionLabel>AI 분석 · 뉴스</SectionLabel>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <AIComment
            ticker={stockData.ticker}
            stockData={stockData}
            sectorAverages={sectorAverages}
          />
          <NewsPanel ticker={stockData.ticker} />
        </div>
      </section>
    </div>
  );
}

// ─────────────────────────────────────────
// StockPage 메인
// ─────────────────────────────────────────
const TABS = [
  { id: "snapshot", label: "현재 스냅샷" },
  { id: "history",  label: "과거 추이"  },
];

/**
 * StockPage
 * Props:
 *   stockData      - 종목 데이터
 *   sectorData     - { sector, peer_count, averages } | null
 *   sectorAverages - { per, eps, pbr, roa, roe } | null
 *   sectorLoading  - boolean
 *   isFav          - boolean
 *   onToggleFav    - () => void
 */
export default function StockPage({
  stockData,
  sectorData,
  sectorAverages,
  sectorLoading,
  isFav,
  onToggleFav,
}) {
  const [activeTab, setActiveTab] = useState("snapshot");

  return (
    <div className="flex flex-col gap-6">

      {/* ① StockHeader */}
      <StockHeader
        stockData={stockData}
        isFav={isFav}
        onToggleFav={onToggleFav}
        sectorInfo={sectorData}
        sectorLoading={sectorLoading}
      />

      {/* ② 탭 바 */}
      <div className="border-b border-slate-700">
        <nav className="flex -mb-px">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`relative px-5 py-3 text-sm font-semibold transition-colors cursor-pointer select-none
                ${activeTab === id
                  ? "text-white after:absolute after:bottom-[-1px] after:left-0 after:w-full after:h-[2px] after:bg-blue-500"
                  : "text-slate-400 hover:text-slate-200"}`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* ③ 탭 콘텐츠 — 두 탭 모두 항상 마운트 (숨김 처리) */}
      {/* 현재 스냅샷 */}
      <div className={activeTab === "snapshot" ? "block" : "hidden"}>
        <SnapshotTab
          stockData={stockData}
          sectorAverages={sectorAverages}
          sectorLoading={sectorLoading}
        />
      </div>

      {/* 과거 추이 — 항상 마운트하여 백그라운드 페치 */}
      <div className={activeTab === "history" ? "block" : "hidden"}>
        <HistoryChart
          ticker={stockData.ticker}
          sectorAverages={sectorAverages}
        />
      </div>

      {/* ④ 하단 면책 문구 */}
      <p className="text-xs text-slate-600 text-center pb-2 leading-relaxed">
        본 정보는 투자 참고용이며, 투자 판단 및 결과에 대한 책임은 투자자 본인에게 있습니다.
      </p>
    </div>
  );
}
