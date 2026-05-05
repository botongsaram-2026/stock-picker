"""
AI 분석 라우터
- POST /api/ai/comment      : 규칙 기반 태깅 + Claude 투자 코멘트
- POST /api/ai/news-summary : 뉴스 5건 한국어 요약 + 감성 태그
"""

import os
import re
import json
from typing import Optional, List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

# ──────────────────────────────────────────
# Anthropic 클라이언트 (키 없으면 None)
# ──────────────────────────────────────────
try:
    import anthropic as _anthropic
    _api_key = os.getenv("ANTHROPIC_API_KEY", "")
    _client  = _anthropic.Anthropic(api_key=_api_key) if _api_key else None
except ImportError:
    _client = None

MODEL = "claude-sonnet-4-20250514"

SYSTEM_COMMENT = (
    "당신은 주식 투자 보조 분석가입니다. "
    "제공된 재무지표와 업계 평균을 비교해서 한국어로 투자 판단에 참고할 수 있는 코멘트를 작성하세요. "
    "확정적 표현 대신 '~가능성', '~신호', '참고하세요' 등 완화된 표현을 사용하세요. "
    "200자 내외로 작성하세요."
)


# ──────────────────────────────────────────
# Pydantic 모델
# ──────────────────────────────────────────
class MetricsIn(BaseModel):
    per: Optional[float] = None
    eps: Optional[float] = None
    pbr: Optional[float] = None
    roa: Optional[float] = None
    roe: Optional[float] = None


class CommentRequest(BaseModel):
    ticker: str
    metrics: MetricsIn
    sectorAverage: Optional[MetricsIn] = None
    newsSnippets: Optional[List[str]] = []


class NewsItemIn(BaseModel):
    title:     Optional[str] = None
    snippet:   Optional[str] = None
    link:      Optional[str] = None
    published: Optional[str] = None
    provider:  Optional[str] = None


class NewsSummaryRequest(BaseModel):
    ticker: str
    newsItems: List[NewsItemIn] = []


# ──────────────────────────────────────────
# 규칙 기반 태깅 헬퍼
# ──────────────────────────────────────────
def _rules_tags(m: MetricsIn, s: Optional[MetricsIn]):
    """PER·PBR·ROE·ROA 기준 긍정/부정/중립 자동 태깅"""
    tags = []

    # PER — 업계 평균 대비 (없으면 절댓값)
    if m.per is not None:
        if s and s.per:
            if m.per < s.per * 0.85:
                tags.append({"label": "PER 저평가", "type": "positive"})
            elif m.per > s.per * 1.25:
                tags.append({"label": "PER 고평가", "type": "negative"})
        else:
            if m.per < 15:
                tags.append({"label": "PER 저평가", "type": "positive"})
            elif m.per > 30:
                tags.append({"label": "PER 고평가", "type": "negative"})

    # PBR — 절댓값
    if m.pbr is not None:
        if m.pbr < 1.0:
            tags.append({"label": "자산 저평가 (PBR<1)", "type": "positive"})
        elif m.pbr > 3.0:
            tags.append({"label": "자산 고평가 (PBR>3)", "type": "negative"})

    # ROE — 절댓값
    if m.roe is not None:
        if m.roe >= 0.15:
            tags.append({"label": "ROE 우수 (≥15%)", "type": "positive"})
        elif m.roe < 0:
            tags.append({"label": "ROE 적자", "type": "negative"})

    # ROA — 절댓값
    if m.roa is not None:
        if m.roa >= 0.05:
            tags.append({"label": "ROA 우수 (≥5%)", "type": "positive"})
        elif m.roa < 0:
            tags.append({"label": "ROA 손실", "type": "negative"})

    pos = sum(1 for t in tags if t["type"] == "positive")
    neg = sum(1 for t in tags if t["type"] == "negative")

    if pos >= 2 and pos > neg:
        verdict = "긍정"
    elif neg >= 2 and neg > pos:
        verdict = "부정"
    else:
        verdict = "중립"

    return verdict, tags


def _fmt(val, pct=False):
    if val is None:
        return "N/A"
    if pct:
        return f"{val * 100:.2f}%"
    return f"{val:.2f}"


def _metric_text(m: MetricsIn, s: Optional[MetricsIn]) -> str:
    rows = [
        f"  PER: {_fmt(m.per)} (업계 평균: {_fmt(s.per if s else None)})",
        f"  EPS: {_fmt(m.eps)}",
        f"  PBR: {_fmt(m.pbr)} (업계 평균: {_fmt(s.pbr if s else None)})",
        f"  ROA: {_fmt(m.roa, pct=True)} (업계 평균: {_fmt(s.roa if s else None, pct=True)})",
        f"  ROE: {_fmt(m.roe, pct=True)} (업계 평균: {_fmt(s.roe if s else None, pct=True)})",
    ]
    return "\n".join(rows)


def _extract_json_array(text: str):
    """Claude 응답에서 JSON 배열 추출 (마크다운 코드블록 포함 대응)"""
    text = text.strip()
    # 코드블록 제거
    text = re.sub(r"```(?:json)?", "", text).strip().rstrip("`").strip()
    # JSON 배열 직접 파싱 시도
    match = re.search(r"\[.*\]", text, re.DOTALL)
    if match:
        return json.loads(match.group())
    return json.loads(text)


# ──────────────────────────────────────────
# POST /api/ai/comment
# ──────────────────────────────────────────
@router.post("/comment")
def post_ai_comment(req: CommentRequest):
    """규칙 기반 태깅 + Claude 투자 코멘트 반환"""
    verdict, tags = _rules_tags(req.metrics, req.sectorAverage)

    if not _client:
        return {
            "rules":   {"verdict": verdict, "tags": tags},
            "comment": None,
            "error":   "ANTHROPIC_API_KEY가 설정되지 않았습니다.",
        }

    # 사용자 메시지 구성
    news_block = ""
    if req.newsSnippets:
        snippets = "\n".join(f"  - {s}" for s in req.newsSnippets[:5])
        news_block = f"\n\n[최근 뉴스 스니펫]\n{snippets}"

    user_msg = (
        f"종목 티커: {req.ticker}\n\n"
        f"[현재 재무지표]\n{_metric_text(req.metrics, req.sectorAverage)}"
        f"{news_block}\n\n"
        "위 정보를 바탕으로 투자 참고 코멘트를 200자 내외로 작성해 주세요."
    )

    try:
        message = _client.messages.create(
            model=MODEL,
            max_tokens=400,
            system=SYSTEM_COMMENT,
            messages=[{"role": "user", "content": user_msg}],
        )
        comment = message.content[0].text
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Claude API 오류: {str(e)}")

    return {
        "rules":   {"verdict": verdict, "tags": tags},
        "comment": comment,
    }


# ──────────────────────────────────────────
# POST /api/ai/news-summary
# ──────────────────────────────────────────
@router.post("/news-summary")
def post_news_summary(req: NewsSummaryRequest):
    """뉴스 5건 한국어 2줄 요약 + 감성 태그 반환"""
    if not req.newsItems:
        return []

    if not _client:
        raise HTTPException(
            status_code=503,
            detail="ANTHROPIC_API_KEY가 설정되지 않았습니다.",
        )

    items = req.newsItems[:5]

    # 뉴스 텍스트 구성
    news_lines = []
    for i, item in enumerate(items, 1):
        title   = item.title or "(제목 없음)"
        snippet = item.snippet or "(내용 없음)"
        news_lines.append(f"{i}. 제목: {title}\n   내용: {snippet}")
    news_block = "\n\n".join(news_lines)

    user_msg = (
        "다음 뉴스 항목들을 분석하여 각각 한국어 2줄 요약과 감성 태그를 제공해주세요.\n\n"
        "반드시 아래 JSON 배열 형식으로만 응답하세요. 다른 텍스트 없이 JSON만 출력하세요:\n"
        '[{"index": 0, "summary": "요약 텍스트", "sentiment": "긍정"}, ...]\n\n'
        "sentiment는 반드시 \"긍정\", \"부정\", \"중립\" 중 하나여야 합니다.\n\n"
        f"뉴스 목록:\n{news_block}"
    )

    try:
        message = _client.messages.create(
            model=MODEL,
            max_tokens=800,
            messages=[{"role": "user", "content": user_msg}],
        )
        raw = message.content[0].text
        parsed = _extract_json_array(raw)
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="Claude 응답 파싱 실패")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Claude API 오류: {str(e)}")

    # 원본 link·published·provider 병합
    result = []
    for entry in parsed:
        idx = entry.get("index", 0)
        if 0 <= idx < len(items):
            orig = items[idx]
        else:
            orig = items[min(len(result), len(items) - 1)]
        result.append({
            "title":     orig.title,
            "summary":   entry.get("summary", ""),
            "sentiment": entry.get("sentiment", "중립"),
            "link":      orig.link,
            "published": orig.published,
            "provider":  orig.provider,
        })

    return result
