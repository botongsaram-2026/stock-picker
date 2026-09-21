"""주택사업 손익 계산 엔진.

docs/data-model.md 의 가정안을 그대로 구현한다.

핵심 원칙:
  - 숫자는 100% 이 엔진이 계산한다. (AI는 결과를 '해석'만)
  - 순수 함수로 결정적(deterministic)이며 표준 라이브러리만 사용한다.

주요 함수:
  calc(meta, inputs)        -> Result          : 변수 -> 손익표 + 현금흐름 + KPI
  sensitivity(meta, inputs) -> list            : 변수 ±10% 민감도 순위
  diff(result_a, result_b)  -> dict            : 두 결과의 손익 항목별 차이
"""

from __future__ import annotations

from dataclasses import dataclass, field, asdict
from typing import Optional


# ──────────────────────────────────────────────────────────
# 입력 스키마 (docs/data-model.md §2, §3)
# ──────────────────────────────────────────────────────────
@dataclass
class Meta:
    """사업 기본정보."""
    name: str
    total_units: int
    start_month: str = "2026-01"   # "YYYY-MM"
    end_month: str = "2028-12"     # "YYYY-MM"
    period_unit: str = "year"      # "year" | "quarter"
    gfa: Optional[float] = None    # 연면적(㎡), 선택


@dataclass
class Revenue:
    """매출 변수."""
    price_per_unit: float          # 세대당 평균 분양가 (원)
    sale_rate: float = 1.0         # 분양률 (0~1)
    collect_schedule: Optional[list] = None  # 수금 시점 비율 (합=1)


@dataclass
class DirectCost:
    """직접비 변수 (금액 + 지급 스케줄)."""
    land_cost: float = 0.0
    construction_cost: float = 0.0
    design_supervision: float = 0.0
    other_direct: float = 0.0
    land_schedule: Optional[list] = None
    construction_schedule: Optional[list] = None
    design_schedule: Optional[list] = None
    other_schedule: Optional[list] = None


@dataclass
class IndirectCost:
    """간접비 변수 (비율)."""
    overhead_rate: float = 0.0      # 판관비율 (총매출 대비)
    contingency_rate: float = 0.0   # 예비비율 (직접비 대비)
    schedule: Optional[list] = None  # 간접비 지급 시점 비율


@dataclass
class Finance:
    """금융 변수."""
    pf_rate: float = 0.0            # PF 연 금리 (0~1)
    fee_rate: float = 0.0           # 취급수수료 등 (총 대출 대비, 선택)


@dataclass
class Inputs:
    """한 시나리오의 변수 묶음."""
    revenue: Revenue
    direct: DirectCost = field(default_factory=DirectCost)
    indirect: IndirectCost = field(default_factory=IndirectCost)
    finance: Finance = field(default_factory=Finance)


# ──────────────────────────────────────────────────────────
# 기간 버킷 (docs/data-model.md §2)
# ──────────────────────────────────────────────────────────
def _parse_ym(ym: str) -> tuple[int, int]:
    year, month = ym.split("-")
    return int(year), int(month)


def period_buckets(meta: Meta) -> list[str]:
    """착공~준공을 period_unit 단위로 쪼갠 기간 라벨 배열을 반환한다."""
    sy, sm = _parse_ym(meta.start_month)
    ey, em = _parse_ym(meta.end_month)
    if (ey, em) < (sy, sm):
        raise ValueError("end_month는 start_month 이후여야 합니다.")

    if meta.period_unit == "year":
        return [str(y) for y in range(sy, ey + 1)]

    if meta.period_unit == "quarter":
        labels = []
        y, m = sy, sm
        while (y, m) <= (ey, em):
            q = (m - 1) // 3 + 1
            label = f"{y}-Q{q}"
            if label not in labels:
                labels.append(label)
            m += 3
            if m > 12:
                m -= 12
                y += 1
        return labels

    raise ValueError(f"지원하지 않는 period_unit: {meta.period_unit}")


def _normalize_schedule(schedule: Optional[list], n: int, tol: float = 1e-6) -> list[float]:
    """스케줄 비율 배열을 검증/보정한다.

    - None  -> 균등 분할 [1/n, ...]
    - 길이 불일치 -> ValueError
    - 합이 0 -> 첫 기간 전액 (예: 발생액이 0인 항목 방어)
    - 그 외 -> 합=1로 정규화
    """
    if schedule is None:
        return [1.0 / n] * n
    if len(schedule) != n:
        raise ValueError(f"스케줄 길이({len(schedule)})가 기간 수({n})와 다릅니다.")
    total = sum(schedule)
    if abs(total) < tol:
        out = [0.0] * n
        out[0] = 1.0
        return out
    return [x / total for x in schedule]


# ──────────────────────────────────────────────────────────
# 계산 엔진 (docs/data-model.md §4)
# ──────────────────────────────────────────────────────────
def calc(meta: Meta, inputs: Inputs) -> dict:
    """변수 -> 손익표 + 현금흐름 + KPI."""
    buckets = period_buckets(meta)
    n = len(buckets)

    r, d, ic, fin = inputs.revenue, inputs.direct, inputs.indirect, inputs.finance

    # ── 손익표 (총액) ──────────────────────────────
    revenue_total = r.price_per_unit * meta.total_units * r.sale_rate
    direct_total = (
        d.land_cost + d.construction_cost + d.design_supervision + d.other_direct
    )
    indirect_total = revenue_total * ic.overhead_rate + direct_total * ic.contingency_rate
    operating_profit = revenue_total - direct_total - indirect_total

    # ── 현금흐름 (기간별) ─────────────────────────
    collect = _normalize_schedule(r.collect_schedule, n)
    land_s = _normalize_schedule(d.land_schedule, n)
    constr_s = _normalize_schedule(d.construction_schedule, n)
    design_s = _normalize_schedule(d.design_schedule, n)
    other_s = _normalize_schedule(d.other_schedule, n)
    indirect_s = _normalize_schedule(ic.schedule, n)

    cashflow = []
    cumulative = 0.0
    finance_total = 0.0
    for t in range(n):
        inflow = revenue_total * collect[t]
        outflow_base = (
            d.land_cost * land_s[t]
            + d.construction_cost * constr_s[t]
            + d.design_supervision * design_s[t]
            + d.other_direct * other_s[t]
            + indirect_total * indirect_s[t]
        )
        # 금융비: 기초 부족자금에 이자 (docs §4-3)
        interest = max(-cumulative, 0.0) * fin.pf_rate
        outflow = outflow_base + interest
        net = inflow - outflow
        cumulative += net
        finance_total += interest
        cashflow.append({
            "period": buckets[t],
            "inflow": round(inflow),
            "outflow": round(outflow),
            "net": round(net),
            "cumulative": round(cumulative),
        })

    # 취급수수료 (선택): 총 대출 규모 근사 = 최대 부족액
    max_shortfall = min((c["cumulative"] for c in cashflow), default=0)
    if fin.fee_rate:
        finance_total += abs(min(max_shortfall, 0)) * fin.fee_rate

    pretax_profit = operating_profit - finance_total
    operating_margin = operating_profit / revenue_total if revenue_total else 0.0

    shortfall_periods = [c["period"] for c in cashflow if c["cumulative"] < 0]

    return {
        "periods": buckets,
        "pnl": {
            "revenue": round(revenue_total),
            "direct_cost": round(direct_total),
            "indirect_cost": round(indirect_total),
            "operating_profit": round(operating_profit),
            "finance_cost": round(finance_total),
            "pretax_profit": round(pretax_profit),
            "operating_margin": round(operating_margin, 4),
        },
        "cashflow": cashflow,
        "kpis": {
            "operating_margin": round(operating_margin, 4),
            "max_shortfall": max_shortfall,
            "shortfall_periods": shortfall_periods,
        },
    }


# ──────────────────────────────────────────────────────────
# 민감도 분석 (docs/data-model.md §5)
# ──────────────────────────────────────────────────────────
# (그룹, 필드, 표시명) — ±10% 흔들 대상 변수
_SENSITIVITY_VARS = [
    ("revenue", "price_per_unit", "분양가"),
    ("revenue", "sale_rate", "분양률"),
    ("direct", "construction_cost", "공사비"),
    ("direct", "land_cost", "토지비"),
    ("direct", "design_supervision", "설계·감리비"),
    ("direct", "other_direct", "기타 직접비"),
    ("indirect", "overhead_rate", "판관비율"),
    ("indirect", "contingency_rate", "예비비율"),
    ("finance", "pf_rate", "PF 금리"),
]


def _clone_inputs(inputs: Inputs) -> Inputs:
    return Inputs(
        revenue=Revenue(**asdict(inputs.revenue)),
        direct=DirectCost(**asdict(inputs.direct)),
        indirect=IndirectCost(**asdict(inputs.indirect)),
        finance=Finance(**asdict(inputs.finance)),
    )


def sensitivity(meta: Meta, inputs: Inputs, pct: float = 0.10) -> list[dict]:
    """각 변수를 pct(기본 ±10%)만큼 올렸을 때 세전이익 변화폭을 계산해 순위화한다."""
    base = calc(meta, inputs)["pnl"]["pretax_profit"]
    rows = []
    for group, field_name, label in _SENSITIVITY_VARS:
        bumped = _clone_inputs(inputs)
        grp = getattr(bumped, group)
        original = getattr(grp, field_name)
        if original == 0:
            continue  # 값이 0인 변수는 영향도 산출 의미 없음
        setattr(grp, field_name, original * (1 + pct))
        new_pretax = calc(meta, bumped)["pnl"]["pretax_profit"]
        delta = new_pretax - base
        rows.append({
            "variable": label,
            "field": f"{group}.{field_name}",
            "delta": round(delta),
            "abs_delta": abs(round(delta)),
        })
    rows.sort(key=lambda x: x["abs_delta"], reverse=True)
    for i, row in enumerate(rows, 1):
        row["rank"] = i
    return rows


# ──────────────────────────────────────────────────────────
# 버전/시나리오 비교 (docs/data-model.md §6)
# ──────────────────────────────────────────────────────────
def diff(result_a: dict, result_b: dict) -> dict:
    """두 계산 결과의 손익 항목별 차이(b - a)를 반환한다."""
    pnl_a, pnl_b = result_a["pnl"], result_b["pnl"]
    out = {}
    for key in pnl_a:
        a_val, b_val = pnl_a[key], pnl_b[key]
        out[key] = {
            "a": a_val,
            "b": b_val,
            "delta": round(b_val - a_val, 4),
        }
    return out


# ──────────────────────────────────────────────────────────
# 데모 (python engine.py 로 실행)
# ──────────────────────────────────────────────────────────
def _demo_inputs() -> tuple[Meta, Inputs]:
    """docs 예시와 유사한 300세대 사업."""
    meta = Meta(
        name="○○동 주택사업",
        total_units=300,
        start_month="2026-01",
        end_month="2029-12",
        period_unit="year",
    )
    inputs = Inputs(
        revenue=Revenue(
            price_per_unit=500_000_000,
            sale_rate=0.95,
            collect_schedule=[0.1, 0.3, 0.3, 0.3],
        ),
        direct=DirectCost(
            land_cost=40_000_000_000,
            construction_cost=90_000_000_000,
            design_supervision=3_000_000_000,
            other_direct=2_000_000_000,
            land_schedule=[1.0, 0.0, 0.0, 0.0],
            construction_schedule=[0.1, 0.4, 0.4, 0.1],
        ),
        indirect=IndirectCost(overhead_rate=0.03, contingency_rate=0.02),
        finance=Finance(pf_rate=0.06),
    )
    return meta, inputs


if __name__ == "__main__":
    import json

    meta, inputs = _demo_inputs()
    result = calc(meta, inputs)
    print("=== 손익표 ===")
    print(json.dumps(result["pnl"], ensure_ascii=False, indent=2))
    print("\n=== 현금흐름 ===")
    for row in result["cashflow"]:
        print(row)
    print("\n=== KPI ===")
    print(json.dumps(result["kpis"], ensure_ascii=False, indent=2))
    print("\n=== 민감도 순위 ===")
    for row in sensitivity(meta, inputs):
        print(f"{row['rank']}. {row['variable']:12s} Δ세전이익 {row['delta']:>16,}")
