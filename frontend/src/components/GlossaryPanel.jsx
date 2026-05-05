import { useState } from "react";
import { METRIC_CONFIGS, METRIC_KEYS, METRIC_DESCRIPTIONS, METRIC_EMOJIS } from "../utils/metrics";

/** 초보자용 지표 설명 카드 데이터 */
const GLOSSARY_EXTRA = {
  per: {
    good: "낮을수록 상대적으로 저렴",
    example: "PER 10 = 주가가 연간 순이익의 10배",
    tip: "같은 업종 평균과 비교해야 의미 있어요.",
  },
  eps: {
    good: "양수이고 꾸준히 성장할수록 좋음",
    example: "EPS $5 = 주당 5달러 순이익",
    tip: "적자(음수)라면 사업성을 꼭 확인하세요.",
  },
  pbr: {
    good: "1 미만이면 자산 대비 저평가",
    example: "PBR 0.8 = 순자산보다 20% 싸게 거래 중",
    tip: "금융주는 PBR 기준이 다를 수 있어요.",
  },
  roa: {
    good: "5% 이상이면 우수",
    example: "ROA 10% = 자산 100원으로 10원 이익",
    tip: "자산이 많은 제조·금융업은 ROA가 낮은 편이에요.",
  },
  roe: {
    good: "15% 이상이면 우수",
    example: "ROE 20% = 자본 100원으로 20원 이익",
    tip: "부채를 늘리면 ROE가 높아 보일 수 있어요.",
  },
};

function GlossaryCard({ metricKey }) {
  const cfg   = METRIC_CONFIGS[metricKey];
  const desc  = METRIC_DESCRIPTIONS[metricKey];
  const emoji = METRIC_EMOJIS[metricKey];
  const extra = GLOSSARY_EXTRA[metricKey];

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 flex flex-col gap-2">
      {/* 헤더 */}
      <div className="flex items-center gap-2">
        <span className="text-xl">{emoji}</span>
        <div>
          <span className="font-bold text-white text-sm">{cfg.label}</span>
          <span className="text-slate-500 text-xs ml-2">{cfg.fullName}</span>
        </div>
      </div>

      {/* 설명 */}
      <p className="text-sm text-slate-300 leading-relaxed">{desc}</p>

      {/* 추가 정보 */}
      <div className="flex flex-col gap-1 mt-1">
        <div className="flex items-start gap-1.5 text-xs text-slate-400">
          <span className="text-green-500 shrink-0">✓</span>
          <span>{extra.good}</span>
        </div>
        <div className="flex items-start gap-1.5 text-xs text-slate-500">
          <span className="shrink-0">예)</span>
          <span className="italic">{extra.example}</span>
        </div>
        <div className="flex items-start gap-1.5 text-xs text-amber-600/80">
          <span className="shrink-0">💡</span>
          <span>{extra.tip}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * GlossaryPanel
 * "📖 지표 설명 보기" 버튼 → 오른쪽에서 슬라이드 패널 열림
 */
export default function GlossaryPanel() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* 트리거 버튼 */}
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl
                   bg-slate-800 border border-slate-700 hover:border-slate-500
                   text-sm text-slate-400 hover:text-slate-200
                   transition-colors cursor-pointer"
      >
        📖 지표 설명 보기
      </button>

      {/* 오버레이 */}
      <div
        className={`fixed inset-0 bg-black/60 z-40 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* 슬라이드 패널 */}
      <div
        className={`fixed right-0 top-0 h-full w-80 sm:w-96 z-50
                    bg-slate-900 border-l border-slate-700
                    flex flex-col
                    transition-transform duration-300 ease-in-out
                    ${open ? "translate-x-0" : "translate-x-full"}`}
        role="dialog"
        aria-label="지표 설명"
      >
        {/* 패널 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700 shrink-0">
          <div>
            <h2 className="font-bold text-white">📖 지표 설명</h2>
            <p className="text-xs text-slate-500 mt-0.5">초보자도 쉽게 이해하는 재무지표 가이드</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg
                       text-slate-400 hover:text-white hover:bg-slate-700
                       transition-colors cursor-pointer text-lg leading-none"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        {/* 카드 목록 (스크롤) */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
          {METRIC_KEYS.map((key) => (
            <GlossaryCard key={key} metricKey={key} />
          ))}

          {/* 면책 문구 */}
          <p className="text-xs text-slate-600 text-center pt-2 pb-4 leading-relaxed">
            위 기준은 일반적인 참고 수치이며,<br />
            업종·시장 상황에 따라 다를 수 있습니다.
          </p>
        </div>
      </div>
    </>
  );
}
