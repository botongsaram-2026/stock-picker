from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
import math

app = FastAPI(title="밸류체크 API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ──────────────────────────────────────────
# 섹터별 대표 종목 (미국 / 한국 분리)
# ──────────────────────────────────────────
SECTOR_PEERS = {
    "US": {
        "Technology": ["AAPL", "MSFT", "NVDA", "GOOGL", "META", "AVGO", "ORCL", "AMD", "INTC", "QCOM", "TXN", "CRM"],
        "Healthcare": ["JNJ", "LLY", "UNH", "ABBV", "MRK", "TMO", "ABT", "DHR", "BMY", "AMGN", "PFE", "GILD"],
        "Financial Services": ["BRK-B", "JPM", "V", "MA", "BAC", "WFC", "GS", "MS", "C", "AXP", "BLK", "SCHW"],
        "Consumer Cyclical": ["AMZN", "TSLA", "HD", "MCD", "NKE", "SBUX", "TGT", "LOW", "BKNG", "GM", "F", "EBAY"],
        "Consumer Defensive": ["WMT", "PG", "KO", "PEP", "COST", "PM", "MO", "CL", "GIS", "K", "SYY", "HSY"],
        "Industrials": ["GE", "CAT", "RTX", "HON", "UPS", "BA", "LMT", "DE", "MMM", "EMR", "ETN", "ITW"],
        "Communication Services": ["GOOGL", "META", "NFLX", "DIS", "CMCSA", "T", "VZ", "TMUS", "SNAP", "PINS"],
        "Energy": ["XOM", "CVX", "COP", "EOG", "SLB", "MPC", "PSX", "VLO", "PXD", "OXY", "DVN", "HES"],
        "Basic Materials": ["LIN", "APD", "SHW", "FCX", "NEM", "NUE", "ALB", "MOS", "CF", "ECL", "DD", "PPG"],
        "Real Estate": ["AMT", "PLD", "EQIX", "CCI", "PSA", "O", "WELL", "SPG", "AVB", "EQR", "DLR", "VTR"],
        "Utilities": ["NEE", "DUK", "SO", "D", "SRE", "AEP", "EXC", "XEL", "WEC", "ES", "ETR", "ED"],
    },
    "KR": {
        "Technology": ["005930.KS", "000660.KS", "035420.KS", "035720.KS", "066570.KS", "003550.KS", "009150.KS", "028260.KS", "034730.KS", "058470.KS"],
        "Financial Services": ["105560.KS", "055550.KS", "086790.KS", "316140.KS", "032830.KS", "000810.KS", "071050.KS", "138930.KS", "175330.KS", "006800.KS"],
        "Consumer Cyclical": ["005380.KS", "012330.KS", "000270.KS", "207940.KS", "051900.KS", "097950.KS", "021240.KS", "011170.KS", "088980.KS", "004170.KS"],
        "Consumer Defensive": ["097950.KS", "000080.KS", "003230.KS", "004990.KS", "002790.KS", "280360.KS", "005300.KS", "033600.KS", "008770.KS", "014680.KS"],
        "Industrials": ["005490.KS", "042660.KS", "010140.KS", "047050.KS", "009540.KS", "000140.KS", "011390.KS", "003490.KS", "000720.KS", "006360.KS"],
        "Healthcare": ["068270.KS", "207940.KS", "128940.KS", "000100.KS", "185750.KS", "326030.KS", "009290.KS", "096770.KS", "000020.KS", "002550.KS"],
        "Energy": ["010950.KS", "096770.KS", "267250.KS", "078930.KS", "000880.KS", "009830.KS", "011790.KS", "001740.KS", "006120.KS", "007570.KS"],
        "Basic Materials": ["005490.KS", "010130.KS", "001430.KS", "004020.KS", "002380.KS", "011500.KS", "003670.KS", "006400.KS", "016360.KS", "004000.KS"],
    }
}


def safe(val):
    """NaN / inf 를 None으로 변환"""
    if val is None:
        return None
    try:
        if math.isnan(val) or math.isinf(val):
            return None
    except (TypeError, ValueError):
        pass
    return val


def resolve_ticker(ticker: str) -> tuple[yf.Ticker, str]:
    """
    한국 종목 코드(숫자 6자리)는 .KS → .KQ 순으로 시도.
    미국 종목은 그대로 사용.
    """
    if ticker.isdigit():
        for suffix in [".KS", ".KQ"]:
            t = yf.Ticker(ticker + suffix)
            info = t.info
            if info.get("regularMarketPrice") or info.get("currentPrice") or info.get("previousClose"):
                return t, ticker + suffix
        return yf.Ticker(ticker + ".KS"), ticker + ".KS"
    t = yf.Ticker(ticker.upper())
    return t, ticker.upper()


def is_korean(resolved: str) -> bool:
    return resolved.endswith(".KS") or resolved.endswith(".KQ")


def extract_metrics(info: dict) -> dict:
    """info 딕셔너리에서 재무지표 추출"""
    price = safe(info.get("currentPrice") or info.get("regularMarketPrice") or info.get("previousClose"))
    return {
        "name":    info.get("longName") or info.get("shortName"),
        "sector":  info.get("sector"),
        "price":   price,
        "currency": info.get("currency"),
        "per":     safe(info.get("trailingPE")),
        "eps":     safe(info.get("trailingEps")),
        "pbr":     safe(info.get("priceToBook")),
        "roa":     safe(info.get("returnOnAssets")),
        "roe":     safe(info.get("returnOnEquity")),
    }


# ──────────────────────────────────────────
# 1. 기본 재무지표
# ──────────────────────────────────────────
@app.get("/api/stock/{ticker}")
def get_stock(ticker: str):
    """종목의 기본 재무지표 반환 (PER, EPS, PBR, ROA, ROE 등)"""
    try:
        stock, resolved = resolve_ticker(ticker)
        info = stock.info
        data = extract_metrics(info)
        data["ticker"] = resolved
        return data
    except Exception:
        return {"ticker": ticker, "error": "데이터를 불러올 수 없습니다."}


# ──────────────────────────────────────────
# 2. 섹터 평균
# ──────────────────────────────────────────
@app.get("/api/stock/{ticker}/sector-average")
def get_sector_average(ticker: str):
    """동일 섹터 대표 종목들의 재무지표 평균 반환"""
    try:
        stock, resolved = resolve_ticker(ticker)
        info = stock.info
        sector = info.get("sector")

        if not sector:
            return {"sector": None, "averages": None}

        market = "KR" if is_korean(resolved) else "US"
        peers = SECTOR_PEERS.get(market, {}).get(sector, [])

        # 해당 종목 자신은 제외
        peers = [p for p in peers if p.upper() != resolved.upper()]

        metrics = {"per": [], "eps": [], "pbr": [], "roa": [], "roe": []}

        for peer in peers:
            try:
                p_info = yf.Ticker(peer).info
                for key in metrics:
                    field_map = {
                        "per": "trailingPE", "eps": "trailingEps",
                        "pbr": "priceToBook", "roa": "returnOnAssets", "roe": "returnOnEquity"
                    }
                    val = safe(p_info.get(field_map[key]))
                    if val is not None:
                        metrics[key].append(val)
            except Exception:
                continue

        averages = {
            k: round(sum(v) / len(v), 4) if v else None
            for k, v in metrics.items()
        }

        return {"sector": sector, "market": market, "peer_count": len(peers), "averages": averages}

    except Exception:
        return {"sector": None, "averages": None}


# ──────────────────────────────────────────
# 3. 과거 추이 (연간 5년 + 분기 8분기)
# ──────────────────────────────────────────
@app.get("/api/stock/{ticker}/history")
def get_history(ticker: str):
    """연간 5년 / 분기 8분기 재무지표 추이 반환"""
    try:
        stock, resolved = resolve_ticker(ticker)

        def calc_metrics(financials, balance, prices):
            """재무제표 + 주가로 PER/EPS/PBR/ROA/ROE 역산"""
            results = []
            for col in financials.columns:
                try:
                    period_str = str(col.date()) if hasattr(col, 'date') else str(col)[:10]

                    net_income = financials.loc["Net Income", col] if "Net Income" in financials.index else None
                    total_assets = balance.loc["Total Assets", col] if "Total Assets" in balance.index else None
                    equity_keys = ["Stockholders Equity", "Total Stockholder Equity", "Common Stock Equity"]
                    equity = None
                    for ek in equity_keys:
                        if ek in balance.index:
                            equity = balance.loc[ek, col]
                            break
                    shares = financials.loc["Diluted Average Shares", col] if "Diluted Average Shares" in financials.index else None

                    eps = safe(net_income / shares) if (net_income and shares and shares != 0) else None
                    roa = safe(net_income / total_assets) if (net_income and total_assets and total_assets != 0) else None
                    roe = safe(net_income / equity) if (net_income and equity and equity != 0) else None

                    # 해당 기간 평균 주가
                    period_dt = pd.Timestamp(col)
                    start_dt = period_dt - pd.DateOffset(months=3)
                    mask = (prices.index >= start_dt) & (prices.index <= period_dt)
                    avg_price = safe(float(prices[mask].mean())) if mask.any() else None

                    per = safe(avg_price / eps) if (avg_price and eps and eps > 0) else None

                    # BPS = equity / shares
                    bps = safe(equity / shares) if (equity and shares and shares != 0) else None
                    pbr = safe(avg_price / bps) if (avg_price and bps and bps > 0) else None

                    results.append({
                        "period": period_str,
                        "per": round(per, 2) if per else None,
                        "eps": round(eps, 4) if eps else None,
                        "pbr": round(pbr, 2) if pbr else None,
                        "roa": round(roa, 4) if roa else None,
                        "roe": round(roe, 4) if roe else None,
                    })
                except Exception:
                    continue
            return results

        # 5년 주가 데이터
        prices = stock.history(period="5y")["Close"]

        # 연간
        annual_fin = stock.financials      # columns = 연도별
        annual_bal = stock.balance_sheet
        annual = []
        if not annual_fin.empty and not annual_bal.empty:
            annual = calc_metrics(annual_fin, annual_bal, prices)

        # 분기
        qtr_fin = stock.quarterly_financials
        qtr_bal = stock.quarterly_balance_sheet
        quarterly = []
        if not qtr_fin.empty and not qtr_bal.empty:
            quarterly = calc_metrics(qtr_fin, qtr_bal, prices)[:8]

        return {
            "ticker": resolved,
            "annual":   sorted(annual,   key=lambda x: x["period"]),
            "quarterly": sorted(quarterly, key=lambda x: x["period"]),
        }

    except Exception as e:
        return {"ticker": ticker, "annual": [], "quarterly": [], "error": str(e)}


# ──────────────────────────────────────────
# 4. 뉴스
# ──────────────────────────────────────────
@app.get("/api/stock/{ticker}/news")
def get_news(ticker: str):
    """해당 종목 최신 뉴스 5건 반환"""
    try:
        stock, resolved = resolve_ticker(ticker)
        raw_news = stock.news or []

        news = []
        for item in raw_news[:5]:
            content = item.get("content", {})
            pub_raw = content.get("pubDate") or content.get("displayTime")
            news.append({
                "title":     content.get("title") or item.get("title"),
                "link":      (content.get("canonicalUrl") or {}).get("url") or item.get("link"),
                "published": pub_raw,
                "snippet":   content.get("summary") or content.get("description") or "",
                "provider":  (content.get("provider") or {}).get("displayName") or "",
            })

        return {"ticker": resolved, "news": news}

    except Exception as e:
        return {"ticker": ticker, "news": [], "error": str(e)}
