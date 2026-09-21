# 데이터 모델 & 계산 구조 (구체화)

작성일: 2026-09-21
목적: "변수 → 손익 → Cash Flow"가 실제로 어떻게 계산되는지 코드로 옮길 수 있는 수준까지 구체화.

---

## 0. 큰 그림 한 장

```
사용자가 입력하는 것          엔진이 계산하는 것              AI가 해석하는 것
─────────────────         ─────────────────           ─────────────────
Inputs (변수)      ──▶     Result (손익표+CashFlow)  ──▶   코멘트/원인/경고
  분양가, 세대수                총매출/총원가/이익             "이익 왜 줄었나"
  공사비, 금리 ...              연도별 현금흐름                "Cash 언제 부족"
```

**핵심 원칙**: 숫자는 100% 엔진이 계산한다. AI는 그 숫자를 말로 설명만 한다. (환각 방지)

---

## 1. 계층 구조

```
Project (하나의 사업)
 ├─ meta: 사업 기본정보 (세대수, 사업기간 등)
 └─ Version[]  ("입찰시"=baseline / "현재"=current / "전망"=forecast)
     └─ Scenario[]  (best / normal / worst)
         ├─ inputs : 변수 묶음   ← 사용자가 채우는 곳
         └─ result : 계산 결과   ← 엔진이 채우는 곳 (저장 시 스냅샷)
```

- **Version** = 시점 축. "입찰 때 이랬는데 지금은 이렇다"를 비교하는 단위.
- **Scenario** = 가정 축. 같은 시점에서 "잘되면/보통/안되면"을 비교하는 단위.
- 즉 한 사업은 최대 `3 버전 × 3 시나리오 = 9개` 손익표를 갖는다.

---

## 2. Project.meta (사업 기본정보)

| 필드 | 타입 | 예시 | 설명 |
|------|------|------|------|
| `name` | str | "○○동 주택사업" | 사업명 |
| `total_units` | int | 300 | 총 분양 세대수 |
| `gfa` | float | 45000 | 연면적(㎡), 선택 |
| `start_month` | str | "2026-03" | 착공(사업 시작) |
| `end_month` | str | "2029-02" | 준공 |
| `period_unit` | str | "year" | 현금흐름 집계 단위 (year/quarter) |

`start_month`~`end_month`를 `period_unit`으로 쪼갠 **기간 버킷 배열**이 Cash Flow의 시간축이 된다.
예: 2026-03 ~ 2029-02, year → `["2026","2027","2028","2029"]` (4개 버킷)

---

## 3. inputs (변수) — 사용자가 채우는 핵심

4개 그룹으로 나눈다. **각 금액 항목에는 "언제 발생하는지" 스케줄(비율 배열)이 붙는다** — 이게 Cash Flow의 핵심.

### 3-1. 매출 (revenue)
| 필드 | 예시 | 설명 |
|------|------|------|
| `price_per_unit` | 500,000,000 | 세대당 평균 분양가 (원) |
| `sale_rate` | 0.95 | 분양률 (95%) |
| `collect_schedule` | 계약금10 / 중도금60 / 잔금30 | 수금 비율 + 시점 (아래 스케줄 규칙) |

→ **총매출 = price_per_unit × total_units × sale_rate**

### 3-2. 직접비 (direct_cost)
| 필드 | 예시 | 설명 |
|------|------|------|
| `land_cost` | 40,000,000,000 | 토지비 |
| `construction_cost` | 90,000,000,000 | 총 공사비(도급액) |
| `design_supervision` | 3,000,000,000 | 설계·감리비 |
| `other_direct` | 2,000,000,000 | 기타 직접비 |
| 각 항목별 `*_schedule` | | 지급 시점 비율 (기성 스케줄 등) |

### 3-3. 간접비 (indirect_cost)
| 필드 | 예시 | 설명 |
|------|------|------|
| `overhead_rate` | 0.03 | 판관비율 (총매출 대비 %) |
| `contingency_rate` | 0.02 | 예비비율 (직접비 대비 %) |

### 3-4. 금융 (finance)
| 필드 | 예시 | 설명 |
|------|------|------|
| `pf_rate` | 0.06 | PF 연 금리 (6%) |
| `fee_rate` | 0.01 | 취급수수료 등 (선택) |

→ 금융비는 **매 기간 부족 자금(음수 누적현금)에 이자를 물리는 방식**으로 계산 (아래 4-3).

### 스케줄(schedule) 표현 규칙
기간 버킷이 4개일 때, 한 항목의 발생 시점을 **길이 4의 비율 배열**로 표현한다. 합=1.
```json
"construction_schedule": [0.1, 0.4, 0.4, 0.1]   // 공사비를 4년에 걸쳐 이렇게 지급
"collect_schedule":      [0.1, 0.3, 0.3, 0.3]   // 분양대금을 이렇게 수금
"land_schedule":         [1.0, 0.0, 0.0, 0.0]   // 토지비는 첫 해 전액
```

---

## 4. 계산 엔진: `calc(meta, inputs) -> result`

### 4-1. 손익표 (P&L) — 총액 계산
```
총매출        = price_per_unit × units × sale_rate
직접비합계    = land + construction + design + other
간접비합계    = 총매출 × overhead_rate + 직접비합계 × contingency_rate
영업이익      = 총매출 − 직접비합계 − 간접비합계
세전이익      = 영업이익 − 금융비(4-3에서 산출)
영업이익률    = 영업이익 / 총매출
```

### 4-2. 현금흐름 (Cash Flow) — 기간별 계산
각 기간 버킷 t 마다:
```
유입_t   = 총매출 × collect_schedule[t]
유출_t   = Σ(각 원가항목 × 해당_schedule[t])  +  간접비 배분_t
순현금_t = 유입_t − 유출_t
누적_t   = 누적_{t-1} + 순현금_t
```

### 4-3. 금융비 (누적현금 연동)
```
누적_t 가 음수면 → 그 해 자금이 부족 → 이자 발생
이자_t   = |min(누적_t, 0)| × pf_rate
금융비합계 = Σ 이자_t
(이자도 다시 유출에 더해 누적 갱신 — MVP는 1-pass 근사로 단순화 가능)
```

### 4-4. 결과(result) 구조
```json
{
  "pnl": {
    "revenue": 142500000000,
    "direct_cost": 135000000000,
    "indirect_cost": 7275000000,
    "operating_profit": 225000000,
    "finance_cost": 1800000000,
    "pretax_profit": -1575000000,
    "operating_margin": 0.0016
  },
  "cashflow": [
    {"period":"2026","inflow":14250000000,"outflow":44000000000,"net":-29750000000,"cumulative":-29750000000},
    {"period":"2027","inflow":42750000000,"outflow":38000000000,"net":4750000000,"cumulative":-25000000000},
    {"period":"2028","inflow":42750000000,"outflow":38000000000,"net":4750000000,"cumulative":-20250000000},
    {"period":"2029","inflow":42750000000,"outflow":18000000000,"net":24750000000,"cumulative":4500000000}
  ],
  "kpis": {
    "operating_margin": 0.0016,
    "max_shortfall": -29750000000,      // 최대 자금부족액
    "shortfall_periods": ["2026","2027","2028"]  // 부족 발생 구간
  }
}
```

---

## 5. 민감도 분석 (AI가 "영향 큰 변수" 말하기 위한 재료)

엔진이 각 주요 변수를 ±10% 흔들어 이익 변화폭을 구한다.
```
for 변수 in [분양가, 공사비, 분양률, PF금리, ...]:
    base = calc(inputs)
    up   = calc(inputs with 변수×1.1)
    영향도[변수] = up.pretax_profit − base.pretax_profit
→ 영향도 절대값 큰 순으로 정렬 = "우선순위 변수"
```
이 순위표를 AI에게 넘기면 "이익에 가장 민감한 변수는 공사비" 같은 코멘트를 낸다.

---

## 6. 버전 비교 (diff)

두 result를 받아 항목별 차이만 계산:
```json
{
  "operating_profit": {"a": 500000000, "b": 225000000, "delta": -275000000},
  "finance_cost":     {"a": 1200000000, "b": 1800000000, "delta": 600000000}
}
```
이 diff + 두 inputs 차이를 AI에게 주면 → "이익 2.75억 감소, 주원인: 공사비↑ + 금융비↑".

---

## 7. 저장 포맷 (MVP: JSON 파일 / SQLite)

MVP는 파일 하나로 시작해도 충분:
```json
{
  "project": { "id": "p1", "meta": {...} },
  "versions": [
    {
      "type": "baseline",
      "scenarios": [
        { "type": "normal", "inputs": {...}, "result": {...} }
      ]
    }
  ]
}
```
확장 시 → 테이블 3개(projects / versions / scenarios)로 정규화.

---

## 8. 이 모델로 가능한 것 (기획 기능과 매핑)

| 기획서 기능 | 이 모델에서 구현되는 방식 |
|-------------|--------------------------|
| 변수 수정만으로 즉시 반영 | `inputs` 바꾸고 `calc()` 재실행 |
| Best/Normal/Worst 비교 | `scenarios` 3개 나란히 계산 |
| Baseline/Current/Forecast | `versions` 3개로 저장 |
| Cash 부족 구간 경고 | `kpis.shortfall_periods` |
| 영향도 변수 우선순위 | §5 민감도 분석 |
| 손익 악화 원인 자동분석 | §6 diff → AI |

---

## 다음 단계

1. **실제 엑셀 손익표 1건**으로 §3 변수 목록 / §4 공식을 실제와 맞추기 (가장 중요).
2. 확정되면 `backend`에 `engine.py` (calc, sensitivity, diff) 부터 구현 + 단위테스트.
