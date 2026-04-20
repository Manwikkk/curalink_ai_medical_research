# Curalink — AI Medical Research Assistant

Full-stack MERN application with RAG, multi-source research retrieval, and LLM-powered synthesis.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│  FRONTEND  React + Vite + TypeScript                                 │
│  ┌──────────┐  ┌────────────┐  ┌────────────┐  ┌─────────────────┐ │
│  │ Sign In  │  │ Chat Window│  │ Conv.Sidebar│  │ Context Sidebar │ │
│  └──────────┘  └────────────┘  └────────────┘  └─────────────────┘ │
│         │             │               │                 │            │
│         └─────────────┴───────────────┴─────────────────┘           │
│                              src/lib/api.ts                          │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │ HTTP / REST
┌──────────────────────────────────▼──────────────────────────────────┐
│  BACKEND  Node.js + Express                                          │
│                                                                      │
│  /api/auth     → Register / Login / Google OAuth / JWT               │
│  /api/chat     → Main research pipeline                              │
│  /api/upload-report → PDF upload + processing                        │
│  /api/history  → Conversation history                                │
│  /api/settings → User profile + preferences                          │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  RESEARCH PIPELINE  (chatController.js)                      │    │
│  │                                                              │    │
│  │  1. expandQuery()     → smart query expansion               │    │
│  │  2. searchPubMed()    → 80 publications                     │    │
│  │     searchOpenAlex()  → 80 publications    (parallel)        │    │
│  │     searchClinicalTrials() → 60 trials                      │    │
│  │  3. rankPublications() → top 6 by relevance+recency+creds   │    │
│  │     rankTrials()       → top 4 by status+relevance+phase    │    │
│  │  4. retrieveRelevantChunks() → RAG from uploaded report     │    │
│  │  5. generateAnswer()  → Groq LLM → structured JSON          │    │
│  │  6. Save to MongoDB + return to frontend                     │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐   │
│  │  Groq (LLM)  │  │ Ollama       │  │ MongoDB (Mongoose)        │   │
│  │  Primary     │  │ Fallback     │  │ Users, Conversations,     │   │
│  │  llama-3.3   │  │ llama3.2     │  │ Reports                  │   │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼               ▼
              PubMed API     OpenAlex API   ClinicalTrials.gov
              (esearch +     (works +       API v2
               efetch XML)    abstract)     (studies JSON)
```

---

## Quick Start

### Prerequisites

- Node.js 20+
- MongoDB (local or Atlas)
- A **Groq API key** (free at https://console.groq.com) — OR — Ollama running locally

---

### 1. Backend Setup

```bash
cd backend
npm install

# Copy and fill environment variables
cp .env.example .env
nano .env   # add your GROQ_API_KEY and MONGODB_URI at minimum

# Start development server
npm run dev
# → Server running on http://localhost:5000
```

**Minimum required `.env` values:**
```
MONGODB_URI=mongodb://127.0.0.1:27017/curalink
JWT_SECRET=any-long-random-string-min-32-chars
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx
```

---

### 2. Frontend Setup

```bash
cd curalink-insight-forge-main
npm install   # or bun install

# Copy and fill environment variables
cp .env.example .env.local
# VITE_API_URL=http://localhost:5000/api   ← already set by default

npm run dev
# → Frontend running on http://localhost:5173
```

---

### 3. Google OAuth (Optional)

1. Go to https://console.cloud.google.com
2. Create a project → APIs & Services → Credentials → OAuth 2.0 Client ID
3. Set Authorized redirect URI: `http://localhost:5000/api/auth/google/callback`
4. Copy Client ID and Secret into backend `.env`:
   ```
   GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-xxx
   GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
   ```

---

### 4. Ollama Fallback (Optional, for offline LLM)

```bash
# Install Ollama from https://ollama.com
ollama pull llama3.2

# Set in backend .env:
# OLLAMA_BASE_URL=http://localhost:11434
# OLLAMA_MODEL=llama3.2
# (leave GROQ_API_KEY empty to force Ollama)
```

---

## API Reference

All endpoints are prefixed with `/api`. Protected routes require:
```
Authorization: Bearer <jwt_token>
```

### Auth

| Method | Path | Body | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | `{name, email, password}` | Create account |
| POST | `/auth/login` | `{email, password}` | Sign in, returns JWT |
| GET | `/auth/google` | — | Redirect to Google OAuth |
| GET | `/auth/google/callback` | — | Google OAuth callback |
| GET | `/auth/me` | — 🔒 | Get current user |

### Chat

| Method | Path | Body | Description |
|--------|------|------|-------------|
| POST | `/chat` | `{query, condition?, intent?, location?, conversationId?}` 🔒 | Run full research pipeline |
| GET | `/chat/:id` | — 🔒 | Load conversation with all messages |
| DELETE | `/chat/:id` | — 🔒 | Delete conversation |

**Example chat request:**
```json
{
  "query": "Latest treatment for NSCLC with high PD-L1",
  "condition": "Non-small cell lung cancer",
  "intent": "treatment options",
  "location": "United States"
}
```

**Example chat response:**
```json
{
  "conversationId": "674abc...",
  "message": {
    "id": "uuid",
    "role": "assistant",
    "content": "Research synthesis...",
    "timestamp": 1700000000000,
    "answer": {
      "conditionOverview": "...",
      "personalizedInsights": "...",
      "researchInsights": "...",
      "publications": [...],
      "trials": [...],
      "sources": [...]
    }
  },
  "stats": {
    "pubmedFetched": 78,
    "openAlexFetched": 80,
    "trialsFetched": 45,
    "publicationsRanked": 6,
    "trialsRanked": 4
  }
}
```

### Reports

| Method | Path | Description |
|--------|------|-------------|
| POST | `/upload-report` | Upload PDF (multipart/form-data, field: `report`) 🔒 |
| GET | `/upload-report` | List all user reports 🔒 |
| GET | `/upload-report/:id` | Poll processing status 🔒 |
| DELETE | `/upload-report/:id` | Delete report 🔒 |

### History

| Method | Path | Description |
|--------|------|-------------|
| GET | `/history` | All conversations (metadata only) 🔒 |
| DELETE | `/history` | Clear all history 🔒 |

### Settings

| Method | Path | Body | Description |
|--------|------|------|-------------|
| GET | `/settings` | — 🔒 | Get profile + preferences |
| PATCH | `/settings` | `{medicalProfile?, preferences?}` 🔒 | Update settings |
| PATCH | `/settings/profile` | `{name?, avatar?}` 🔒 | Update display name |

---

## Folder Structure

```
backend/
├── server.js                    # Entry point, Express app, MongoDB connect
├── package.json
├── .env.example
├── controllers/
│   ├── authController.js        # Register, login, Google OAuth
│   ├── chatController.js        # Main research pipeline
│   ├── reportController.js      # PDF upload + RAG processing
│   ├── historyController.js     # Conversation history CRUD
│   └── settingsController.js    # User profile + preferences
├── routes/
│   ├── auth.js
│   ├── chat.js
│   ├── report.js
│   ├── history.js
│   └── settings.js
├── models/
│   ├── User.js                  # User schema (auth + profile + prefs)
│   ├── Conversation.js          # Messages, answer sections, context
│   └── Report.js                # Uploaded reports, chunks, insights
├── middleware/
│   └── auth.js                  # JWT requireAuth + signToken
├── services/
│   ├── pubmedService.js         # PubMed esearch + efetch pipeline
│   ├── openAlexService.js       # OpenAlex works API
│   ├── clinicalTrialsService.js # ClinicalTrials.gov v2 API
│   ├── queryExpansionService.js # Smart query expansion + synonyms
│   ├── rankingService.js        # Publication + trial scoring engine
│   ├── llmService.js            # Groq (primary) + Ollama (fallback)
│   └── ragService.js            # PDF extraction, chunking, retrieval
└── uploads/                     # PDF files (auto-created)

frontend/src/
├── contexts/
│   └── AuthContext.tsx           # React auth state + JWT management
├── lib/
│   ├── api.ts                   # Typed API client (all endpoints)
│   └── types.ts                 # Shared TypeScript types (unchanged)
└── components/app/
    ├── ChatWindow.tsx            # Connected to real /api/chat
    ├── ConversationsSidebar.tsx  # Connected to real /api/history
    ├── ReportUploadCard.tsx      # Connected to real /api/upload-report
    └── ContextSidebar.tsx        # Shows live session metadata
```

---

## Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 5000) |
| `MONGODB_URI` | **Yes** | MongoDB connection string |
| `JWT_SECRET` | **Yes** | Secret for signing JWTs (min 32 chars) |
| `JWT_EXPIRES_IN` | No | Token expiry (default: 7d) |
| `GROQ_API_KEY` | **Yes*** | Groq API key (*or use Ollama) |
| `GROQ_MODEL` | No | Model name (default: llama-3.3-70b-versatile) |
| `OLLAMA_BASE_URL` | No | Ollama URL (default: http://localhost:11434) |
| `OLLAMA_MODEL` | No | Ollama model (default: llama3.2) |
| `GOOGLE_CLIENT_ID` | No | For Google OAuth |
| `GOOGLE_CLIENT_SECRET` | No | For Google OAuth |
| `GOOGLE_CALLBACK_URL` | No | OAuth redirect URL |
| `PUBMED_API_KEY` | No | Higher PubMed rate limits |
| `OPENALEX_EMAIL` | No | Polite pool access for OpenAlex |
| `FRONTEND_URL` | No | CORS origin (default: http://localhost:5173) |

### Frontend (`frontend/.env.local`)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:5000/api` | Backend base URL |

---

## Research Pipeline — How It Works

### 1. Query Expansion
The user's query + condition + intent are expanded into three optimized queries:
- **PubMed**: `"non-small cell lung cancer AND pembrolizumab AND first-line treatment"`
- **OpenAlex**: `"non-small cell lung cancer pembrolizumab immunotherapy treatment"`
- **ClinicalTrials**: `"Non-small cell lung cancer"` (condition only, status-filtered)

Disease synonyms are automatically added (e.g., "NSCLC → non-small cell lung cancer, adenocarcinoma").

### 2. Parallel Retrieval (50–300 results)
All three APIs are called simultaneously:
- PubMed: up to 80 IDs → batched efetch → full XML parsing
- OpenAlex: up to 80 results → abstract reconstruction from inverted index
- ClinicalTrials: up to 60 studies → status-filtered for recruiting/active

### 3. Ranking Engine
Each result is scored [0–1] across multiple factors:

**Publications:**
| Factor | Weight |
|--------|--------|
| Keyword relevance (title + abstract) | 40% |
| Recency (exponential decay, 3yr half-life) | 30% |
| Source credibility (PubMed > OpenAlex) | 15% |
| Citation count (log-scaled) | 10% |
| Title keyword density | 5% |

**Clinical Trials:**
| Factor | Weight |
|--------|--------|
| Recruiting status | 35% |
| Keyword relevance | 40% |
| Phase (3/4 > 2 > 1) | 15% |
| Recency | 10% |

### 4. RAG (Retrieval-Augmented Generation)
When a user has uploaded a medical report:
- PDF is extracted, chunked into 400-token windows with 50-token overlap
- Keywords are indexed per chunk (TF-IDF style)
- Top 4 chunks most relevant to the current query are retrieved and injected into the LLM prompt

### 5. LLM Synthesis
The ranked publications + trial briefs + RAG context are sent to Groq (or Ollama fallback):
- System prompt enforces structured JSON output
- Low temperature (0.3) for factual, reproducible responses
- Last 8 messages included for multi-turn context awareness
- Response is parsed into `{conditionOverview, personalizedInsights, researchInsights}`

---

## Deployment

### MongoDB Atlas (Production)
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/curalink
```

### Environment for Production

**Backend (e.g. Railway, Render, Fly.io):**
```
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://your-frontend.vercel.app
MONGODB_URI=mongodb+srv://...
JWT_SECRET=very-long-random-production-secret
GROQ_API_KEY=gsk_...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=https://your-backend.railway.app/api/auth/google/callback
```

**Frontend (e.g. Vercel):**
```
VITE_API_URL=https://your-backend.railway.app/api
```

### Docker (Optional)
```dockerfile
# backend/Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["node", "server.js"]
```

---

## Troubleshooting

**"LLM unavailable" error**
- Set `GROQ_API_KEY` in `.env` (free key at https://console.groq.com)
- Or start Ollama: `ollama serve` and `ollama pull llama3.2`

**MongoDB connection failed**
- Ensure MongoDB is running: `mongod --dbpath /data/db`
- Or use MongoDB Atlas and update `MONGODB_URI`

**PubMed returns empty results**
- PubMed rate-limits unauthenticated requests to 3/sec
- Add `PUBMED_API_KEY` for 10/sec (free at https://www.ncbi.nlm.nih.gov/account/)

**CORS errors**
- Set `FRONTEND_URL` in backend `.env` to match your frontend origin exactly

**PDF processing stuck at "processing"**
- Check backend logs for `[processReport]` errors
- Ensure `pdf-parse` is installed: `npm install pdf-parse`

**Google OAuth redirect mismatch**
- The `GOOGLE_CALLBACK_URL` in `.env` must exactly match what's set in Google Cloud Console
