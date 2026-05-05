/**
 * 재무지표 메타 정보 및 공통 계산 로직
 * higherIsBetter: false → PER·PBR처럼 낮을수록 좋은 지표
 */
export const METRIC_CONFIGS = {
  per: { label: "PER", fullName: "주가수익비율", higherIsBetter: false, unit: "x" },
  pbr: { label: "PBR", fullName: "주가순자산비율", higherIsBetter: false, unit: "x" },
  roe: { label: "ROE", fullName: "자기자본이익률", higherIsBetter: true,  unit: "%" },
  roa: { label: "ROA", fullName: "총자산이익률",  higherIsBetter: true,  unit: "%" },
  eps: { label: "EPS", fullName: "주당순이익",    higherIsBetter: true,  unit: ""  },
};

export const METRIC_KEYS = Object.keys(METRIC_CONFIGS);

/** 지표 값을 화면에 표시할 문자열로 변환 */
export function formatMetric(key, value) {
  if (value == null) return "-";
  const { unit } = METRIC_CONFIGS[key];
  if (unit === "%") return (value * 100).toFixed(2) + "%";
  if (unit === "x") return value.toFixed(2);
  return value.toFixed(2);
}

/**
 * 0–100 점수 계산: 50 = 섹터 평균
 * - higherIsBetter: 종목/평균 비율 × 50
 * - lowerIsBetter : 평균/종목 비율 × 50
 */
export function calcScore(key, value, sectorAvg) {
  if (value == null || sectorAvg == null || sectorAvg === 0) return null;
  const { higherIsBetter } = METRIC_CONFIGS[key];
  const ratio = value / sectorAvg;
  return Math.min(100, Math.max(0, higherIsBetter ? ratio * 50 : (1 / ratio) * 50));
}

/**
 * 섹터 평균 대비 얼마나 좋은지(%) — 양수 = 섹터 평균보다 유리
 * PER처럼 낮을수록 좋은 지표는 부호를 반전
 */
export function calcDiff(key, value, sectorAvg) {
  if (value == null || sectorAvg == null || sectorAvg === 0) return null;
  const { higherIsBetter } = METRIC_CONFIGS[key];
  const pctDiff = ((value - sectorAvg) / Math.abs(sectorAvg)) * 100;
  return higherIsBetter ? pctDiff : -pctDiff;
}
