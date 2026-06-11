# PIP — Personalised Interactive Pedagogy

PIP is a learning companion for developers building real projects with AI assistance. Describe what you're building, and PIP maps out the concepts behind it as a visual tree, then teaches you through each one — one checkpoint at a time, as you go.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-pip--sandy.vercel.app-58a6ff?style=flat&logo=vercel)](https://pip-sandy.vercel.app/)

---

## What it does

- **Generates a concept tree from your project plan** — breaking your build into the underlying concepts you need to understand (not just steps to follow)
- **Teaches through checkpoints** — for each concept, PIP orients you, then checks your understanding through a short conversational exchange before marking it complete
- **Tracks your progress visually** — an interactive canvas tree shows prerequisites, dependencies, and what's been covered
- **Avoids redundant teaching** — concepts are deduplicated across your project using semantic similarity, so you're not re-taught the same thing under a different name
- **Resumes where you left off** — re-enter any concept and PIP picks up the conversation with full context of what you've already built

---

## How it works

PIP works in two steps:

**1. Plan** — describe your project. Gemini generates a concept tree, deduplicated against everything you've already learned (via pgvector embedding similarity), and renders it on an interactive canvas.

**2. Learn** — click into any concept. PIP teaches it, then checks your understanding through a short Q&A. Gemini evaluates your answer, and the concept is marked complete on the tree.

```
 You describe a project
          │
          ▼
 ┌─────────────────────────┐
 │  Gemini: generate concept │
 │  tree + dedupe via         │
 │  pgvector embeddings       │
 └────────────┬────────────┘
              ▼
   Interactive canvas tree
   (prerequisites, progress)
              │
              ▼
   Click a concept ──► PIP teaches it ──► checkpoint Q&A
                                              │
                                              ▼
                                  Gemini evaluates answer
                                              │
                                              ▼
                                  Concept marked complete
```

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Backend | Python · FastAPI (async) · SQLAlchemy (async) · Alembic |
| Database | PostgreSQL + pgvector (concept embedding similarity / dedup) |
| AI | Google Gemini — roadmap generation, concept generation, checkpoint evaluation |
| Auth | Google OAuth |
| Frontend | React · Vite · custom canvas-based concept tree · Server-Sent Events |
| DevOps | Docker (backend, Render) · Render PostgreSQL (pgvector enabled) · Vercel (frontend) |

---

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

---

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

### Environment variables

**Backend (`.env`)**

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (use `postgresql+asyncpg://`) |
| `GEMINI_API_KEY` | Google Gemini API key |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `SECRET_KEY` | Secret key for session/token signing |
| `FRONTEND_URL` | URL of the frontend (used for OAuth redirects/CORS) |

**Frontend (`.env`)**

| Variable | Description |
|----------|-------------|
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID (same as backend) |

---

## Deployment

| Service | Platform | URL |
|---------|----------|-----|
| Frontend | Vercel | [pip-sandy.vercel.app](https://pip-sandy.vercel.app/) |
| Backend API | Render (Docker) | — |
| Database | Render PostgreSQL (pgvector) | — |

`vercel.json` rewrites proxy API routes (`/auth`, `/me`, `/projects`, `/project`, `/roadmap`, `/checkpoint`) to the Render backend, plus a catch-all rewrite for client-side routing.

Both Google OAuth client IDs (frontend and backend) must have the deployed frontend URL registered as an authorized origin, and the backend's `/auth/callback` URL registered as an authorized redirect URI.

---

## Project status

PIP v1 is live. Planned next steps include an MCP server mode for use directly from the terminal during AI-assisted development, with a live local concept tree viewer.

---

## Author

**Hamza Assaf** — [hamza2497.github.io](https://hamza2497.github.io) · [LinkedIn](https://linkedin.com/in/hamzah-assaf)
