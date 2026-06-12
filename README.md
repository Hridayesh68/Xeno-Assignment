# Xeno AI-Native Mini CRM

An AI-native CRM for D2C brands to segment shoppers, send personalised campaigns, and surface performance insights — powered by GPT-4o.

## Architecture

```
frontend/        → Next.js 14 (dashboard, segments, campaigns)
backend/         → FastAPI (CRM API, AI endpoints, receipt handler)
channel-stub/    → FastAPI (simulates WhatsApp/SMS/Email delivery)
```

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL (or use Docker)
- Redis (optional — for production queue)
- OpenAI API key (optional — fallback mode without AI)

### 1. Backend Setup
```bash
cd backend
cp .env.example .env
# Edit .env with your DATABASE_URL and OPENAI_API_KEY
pip install -r requirements.txt
python seed.py                    # Seeds 500 customers + orders
uvicorn main:app --reload --port 8000
```

### 2. Channel Stub Setup
```bash
cd channel-stub
cp .env.example .env
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

### 3. Frontend Setup
```bash
cd frontend
cp .env.local.example .env.local  # Set NEXT_PUBLIC_API_URL
npm install
npm run dev                        # Runs on http://localhost:3000
```

## Key Features

| Feature | Details |
|---|---|
| **AI Segment Builder** | Type in English → GPT-4o converts to SQL filters |
| **AI Message Drafter** | 3 message variants per campaign per channel |
| **AI Campaign Insights** | Post-campaign analysis with highlights + suggestions |
| **AI Segment Suggestions** | Pre-built smart segments for any D2C brand |
| **Async Channel Stub** | Simulates WhatsApp/SMS/Email with realistic probabilities |
| **Callback Loop** | delivered → opened → clicked events with retry logic |
| **Live Stats** | Dashboard auto-refreshes every 15s, campaign page every 3s |

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | /api/dashboard | KPI stats |
| GET/POST | /api/customers | List / create customers |
| GET/POST | /api/segments | List / create segments |
| POST | /api/segments/preview-rules | Preview segment count |
| GET/POST | /api/campaigns | List / create campaigns |
| POST | /api/campaigns/:id/send | Launch campaign |
| GET | /api/campaigns/:id/stats | Delivery stats |
| POST | /api/receipt | Channel callback handler |
| POST | /api/ai/segment | NL → filter rules |
| POST | /api/ai/draft-message | AI message variants |
| POST | /api/ai/campaign-insight | Campaign analysis |
| GET | /api/ai/suggest-segments | Smart segment suggestions |

## Channel Stub Delivery Probabilities

| Channel | Delivery | Open | Click |
|---|---|---|---|
| WhatsApp | 92% | 68% | 22% |
| SMS | 88% | 45% | 12% |
| Email | 96% | 28% | 8% |
| RCS | 85% | 55% | 18% |

## System Design Decisions

- **Async callbacks**: Channel stub uses background tasks + exponential backoff retries
- **Segment execution**: SQL query evaluated at send time (fresh data)
- **Message personalisation**: Template token replacement (scalable vs per-user LLM calls)
- **Stats**: Denormalised on Campaign model for fast dashboard reads
- **AI fallback**: All AI features degrade gracefully if OpenAI key not provided
