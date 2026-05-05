/**
 * 재무지표 메타 정보 및 공통 계산 로직
 */

export const METRIC_CONFIGS = {
  per: { label: "PER", fullName: "주가수익비율", higherIsBetter: false, unit: "x" },
  eps: { label: "EPS", fullName: "주당순이익",    higherIsBetter: true,  unit: ""  },
  pbr: { label: "PBR", fullName: "주가순자산비율", higherIsBetter: false, unit: "x" },
  roa: { label: "ROA", fullName: "총자산이익률",  higherIsBetter: true,  unit: "%" },
  roe: { label: "ROE", fullName: "자기자본이익률", higherIsBetter: true,  unit: "%" },
};

export const METRIC_KEYS = ["per", "eps", "pbr", "roa", "roe"];

/** ⓘ 호버 툴팁에 표시되는 초보자용 지표 설명 */
export const METRIC_DESCRIPTIONS = {
  per: "주가가 1주당 순이익의 몇 배인지 나타내요. 낮을수록 상대적으로 저렴할 수 있어요. 단, 업종마다 기준이 달라요.",
  eps: "1주당 순이익이에요. 높고 꾸준히 성장할수록 실적이 좋은 기업이에요.",
  pbr: "주가가 회사 순자산의 몇 배인지 나타내요. 1 미만이면 자산보다 싸게 거래되는 중이에요.",
  roa: "회사가 가진 자산으로 얼마나 이익을 냈는지예요. 높을수록 자원을 효율적으로 쓰는 기업이에요.",
  roe: "주주가 투자한 돈으로 얼마나 벌었는지예요. 15% 이상이면 우수한 편이에요.",
};

/** GlossaryPanel에 쓰는 이모지 */
export const METRIC_EMOJIS = {
  per: "📊", eps: "💵", pbr: "🏢", roa: "⚙️", roe: "📈",
};

/** 지표 값을 화면에 표시할 문자열로 변환 */
export function formatMetric(key, value) {
  if (value == null) return "-";
  const { unit } = METRIC_CONFIGS[key];
  if (unit === "%") return (value * 100).toFixed(2) + "%";
  if (unit === "x") return value.toFixed(2);
  return value.toFixed(2);
}

/**
 * 지표별 뱃지 반환
 * { label, color: "green" | "red" | "neutral" }
 * PER: 업계 평균 대비, 나머지: 절댓값 기준
 */
export function getMetricBadge(key, value, sectorAvg) {
  if (value == null) return null;

  switch (key) {
    case "per": {
      if (sectorAvg == null) return null;
      return value < sectorAvg
        ? { label: "저평가 신호", color: "green" }
        : { label: "고평가 주의", color: "red" };
    }
    case "eps":
      return value > 0
        ? { label: "수익 중",  color: "green" }
        : { label: "적자",     color: "red"   };
    case "pbr":
      if (value < 1)  return { label: "자산 대비 저평가", color: "green"   };
      if (value > 3)  return { label: "고평가 주의",      color: "red"     };
      return              { label: "보통",               color: "neutral" };
    case "roa":
      if (value >= 0.05) return { label: "우수",  color: "green"   };
      if (value < 0)     return { label: "주의",  color: "red"     };
      return                   { label: "보통",  color: "neutral" };
    case "roe":
      if (value >= 0.15) return { label: "우수",  color: "green"   };
      if (value < 0)     return { label: "주의",  color: "red"     };
      return                   { label: "보통",  color: "neutral" };
    default:
      return null;
  }
}

/**
 * 차트용 0–100 정규화
 * 절댓값 기준 범위(bad → good)로 선형 변환 — 100점이 좋은 값
 */
const NORMALIZE_BOUNDS = {
  per: { bad: 60,    good: 5,    higherIsBetter: false },
  eps: { bad: -5,    good: 30,   higherIsBetter: true  },
  pbr: { bad: 8,     good: 0.5,  higherIsBetter: false },
  roa: { bad: -0.10, good: 0.20, higherIsBetter: true  },
  roe: { bad: -0.20, good: 0.30, higherIsBetter: true  },
};

export function normalizeForChart(key, value) {
  if (value == null) return 0;
  const { bad, good, higherIsBetter } = NORMALIZE_BOUNDS[key];
  const range = Math.abs(good - bad);
  if (higherIsBetter) {
    return Math.min(100, Math.max(0, ((value - bad) / range) * 100));
  } else {
    return Math.min(100, Math.max(0, ((bad - value) / range) * 100));
  }
}

/** 섹터 평균 대비 유불리(%) — 양수 = 유리 */
export function calcDiff(key, value, sectorAvg) {
  if (value == null || sectorAvg == null || sectorAvg === 0) return null;
  const { higherIsBetter } = METRIC_CONFIGS[key];
  const pctDiff = ((value - sectorAvg) / Math.abs(sectorAvg)) * 100;
  return higherIsBetter ? pctDiff : -pctDiff;
}
