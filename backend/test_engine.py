"""engine.py 단위 테스트 (표준 unittest, 의존성 없음).

실행: python -m unittest test_engine
"""

import unittest

from engine import (
    Meta, Inputs, Revenue, DirectCost, IndirectCost, Finance,
    calc, sensitivity, diff, period_buckets, _normalize_schedule, _demo_inputs,
)


class TestBuckets(unittest.TestCase):
    def test_year_buckets(self):
        meta = Meta("t", 10, "2026-01", "2029-12", "year")
        self.assertEqual(period_buckets(meta), ["2026", "2027", "2028", "2029"])

    def test_quarter_buckets(self):
        meta = Meta("t", 10, "2026-01", "2026-12", "quarter")
        self.assertEqual(period_buckets(meta), ["2026-Q1", "2026-Q2", "2026-Q3", "2026-Q4"])

    def test_end_before_start_raises(self):
        meta = Meta("t", 10, "2029-01", "2026-01", "year")
        with self.assertRaises(ValueError):
            period_buckets(meta)


class TestSchedule(unittest.TestCase):
    def test_default_even(self):
        self.assertEqual(_normalize_schedule(None, 4), [0.25, 0.25, 0.25, 0.25])

    def test_normalized_to_one(self):
        out = _normalize_schedule([1, 1, 2], 3)
        self.assertAlmostEqual(sum(out), 1.0)

    def test_length_mismatch_raises(self):
        with self.assertRaises(ValueError):
            _normalize_schedule([0.5, 0.5], 3)


class TestCalc(unittest.TestCase):
    def setUp(self):
        self.meta, self.inputs = _demo_inputs()
        self.result = calc(self.meta, self.inputs)

    def test_revenue(self):
        # 5억 * 300세대 * 0.95 = 1425억
        self.assertEqual(self.result["pnl"]["revenue"], 142_500_000_000)

    def test_direct_cost(self):
        self.assertEqual(self.result["pnl"]["direct_cost"], 135_000_000_000)

    def test_operating_profit_identity(self):
        p = self.result["pnl"]
        self.assertEqual(
            p["operating_profit"],
            p["revenue"] - p["direct_cost"] - p["indirect_cost"],
        )

    def test_pretax_is_operating_minus_finance(self):
        p = self.result["pnl"]
        self.assertEqual(p["pretax_profit"], p["operating_profit"] - p["finance_cost"])

    def test_cashflow_length_matches_periods(self):
        self.assertEqual(len(self.result["cashflow"]), len(self.result["periods"]))

    def test_cumulative_is_running_sum(self):
        acc = 0
        for row in self.result["cashflow"]:
            acc += row["net"]
            self.assertEqual(row["cumulative"], acc)

    def test_no_finance_when_no_shortfall(self):
        # 수금을 첫 해에 몰아 부족이 없으면 금융비 0
        meta = Meta("t", 1, "2026-01", "2027-12", "year")
        inputs = Inputs(
            revenue=Revenue(price_per_unit=1_000_000_000, sale_rate=1.0,
                            collect_schedule=[1.0, 0.0]),
            direct=DirectCost(construction_cost=100_000_000,
                              construction_schedule=[0.5, 0.5]),
            finance=Finance(pf_rate=0.06),
        )
        self.assertEqual(calc(meta, inputs)["pnl"]["finance_cost"], 0)


class TestSensitivity(unittest.TestCase):
    def test_ranked_and_sorted(self):
        meta, inputs = _demo_inputs()
        rows = sensitivity(meta, inputs)
        self.assertTrue(rows)
        # abs_delta 내림차순
        self.assertEqual(rows, sorted(rows, key=lambda r: r["abs_delta"], reverse=True))
        self.assertEqual(rows[0]["rank"], 1)

    def test_zero_valued_var_skipped(self):
        meta, inputs = _demo_inputs()
        inputs.direct.other_direct = 0
        fields = [r["field"] for r in sensitivity(meta, inputs)]
        self.assertNotIn("direct.other_direct", fields)


class TestDiff(unittest.TestCase):
    def test_delta(self):
        meta, inputs = _demo_inputs()
        a = calc(meta, inputs)
        inputs.direct.construction_cost *= 1.1  # 공사비 +10%
        b = calc(meta, inputs)
        d = diff(a, b)
        self.assertEqual(
            d["operating_profit"]["delta"],
            b["pnl"]["operating_profit"] - a["pnl"]["operating_profit"],
        )
        self.assertLess(d["operating_profit"]["delta"], 0)  # 원가 늘면 이익 감소


if __name__ == "__main__":
    unittest.main()
