# 밸류체크 📊

주식 재무지표 조회 및 AI 투자 판단 보조 웹앱

## 기술 스택

| 영역 | 기술 |
|------|------|
| 백엔드 | FastAPI (Python) |
| 프론트엔드 | React + Tailwind CSS |
| 차트 | Recharts |
| AI | Claude API (Anthropic) |

## 로컬 실행 방법

### 백엔드

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### 프론트엔드

```bash
cd frontend
npm install
npm run dev
```

## 환경변수 설정

`backend/.env.example`을 복사해 `backend/.env`를 생성하고 값을 입력합니다.

```bash
cp backend/.env.example backend/.env
```

`.env` 파일 예시:

```
ANTHROPIC_API_KEY=your_api_key_here
```

## 배포 구조

- **프론트엔드** → Cloudflare Pages
- **백엔드** → 로컬 실행 (또는 향후 서버 배포)
