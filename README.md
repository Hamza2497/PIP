# PIP — Personalised Interactive Pedagogy

PIP is a learning companion for developers building real projects with AI assistance. Describe what you're building, and PIP maps out the concepts behind it as a visual tree, then teaches you through each one — one checkpoint at a time, as you go.

## What it does

- **Generates a concept tree** from your project plan — breaking your build into the underlying concepts you need to understand (not just steps to follow)
- **Teaches through checkpoints** — for each concept, PIP orients you, then checks your understanding through a short conversational exchange before marking it complete
- **Tracks your progress** visually — an interactive canvas tree shows prerequisites, dependencies, and what's been covered
- **Avoids redundant teaching** — concepts are deduplicated across your project using semantic similarity, so you're not re-taught the same thing under a different name
- **Resumes where you left off** — re-enter any concept and PIP picks up the conversation with full context of what you've already built

## Tech stack

**Backend**
- FastAPI (async)
- SQLAlchemy (async) + Alembic migrations
- PostgreSQL with `pgvector` for concept embedding similarity/deduplication
- Google Gemini for roadmap generation, concept generation, and checkpoint evaluation
- Google OAuth for authentication

**Frontend**
- React + Vite
- Canvas-based interactive concept tree (custom 2D rendering)
- Server-Sent Events (SSE) for streaming roadmap generation

**Infrastructure**
- Backend: Dockerized, deployed on Render
- Database: Render PostgreSQL (pgvector enabled)
- Frontend: Vercel

## Architecture

```
┌─────────────┐      ┌──────────────────┐      ┌─────────────────┐
│   Frontend   │◄────►│   FastAPI backend │◄────►│   PostgreSQL     │
│  (Vercel)    │ SSE/ │   (Render,        │      │   + pgvector     │
│  React+Vite  │ REST │    Docker)        │      │   (Render)       │
└─────────────┘      └────────┬──────────┘      └─────────────────┘
                               │
                               ▼
                      ┌──────────────────┐
                      │   Google Gemini   │
                      │  (roadmap, chat,  │
                      │   evaluation)     │
                      └──────────────────┘
```

## Local development

### Prerequisites

- Python 3.12+
- Node.js 18+
- PostgreSQL with the `pgvector` extension enabled
- A Google Gemini API key
- A Google OAuth client (Client ID + Secret)

### Backend setup

```bash
cd backend  # or project root, depending on layout
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Start the API server
uvicorn app.main:app --reload --port 8000
```

### Frontend setup

```bash
cd frontend
npm install
npm run dev
```

The frontend dev server runs on `http://localhost:5173` and proxies API requests to `http://localhost:8000` (configured in `vite.config.js`).

## Environment variables

### Backend (`.env`)

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (use `postgresql+asyncpg://`) |
| `GEMINI_API_KEY` | Google Gemini API key |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `SECRET_KEY` | Secret key for session/token signing |
| `FRONTEND_URL` | URL of the frontend (used for OAuth redirects/CORS) |

### Frontend (`.env`)

| Variable | Description |
|---|---|
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID (same as backend) |

## Deployment

The backend is deployed as a Docker container on Render, alongside a managed PostgreSQL instance with `pgvector` enabled. The frontend is deployed on Vercel, with `vercel.json` rewrites proxying API routes (`/auth`, `/me`, `/projects`, `/project`, `/roadmap`, `/checkpoint`) to the Render backend, plus a catch-all rewrite to support client-side routing.

Both Google OAuth client IDs (frontend and backend) must have the deployed frontend URL registered as an authorized origin, and the backend's `/auth/callback` URL registered as an authorized redirect URI.

## Project status

PIP is an active personal project. Planned next steps include an MCP server mode for use directly from the terminal during AI-assisted development, with a live local concept tree viewer.
```
