# 🛍️ Picksy: Production RAG Shopping Assistant

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat&logo=react)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=flat&logo=python)](https://python.org)
[![Supabase](https://img.shields.io/badge/Supabase-pgvector-3ECF8E?style=flat&logo=supabase)](https://supabase.com)
[![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED?style=flat&logo=docker)](https://docker.com)

**Picksy** is an intelligent e-commerce semantic search engine and conversational shopping assistant. Instead of brittle keyword filters, Picksy executes vector similarity search across a 1,000+ item catalog using local 384-dimensional dense embeddings (`BAAI/bge-small-en-v1.5`) and synthesizes tailored recommendations via LLM reasoning.

---

## 🚀 Live Demo

- **Web Client:** [https://pickksy.vercel.app](https://pickksy.vercel.app)
- **Production API:** [https://picksy.softdrip.in](https://picksy.softdrip.in)
- **API Health:** [https://picksy.softdrip.in/health](https://picksy.softdrip.in/health)
- **Interactive Swagger Docs:** [https://picksy.softdrip.in/docs](https://picksy.softdrip.in/docs)

---

## 🏗️ System Architecture

```
User Query (e.g., "What are the best curtains under $30?")
  │
  ▼
[ Next.js 16 Client (React 19 / TypeScript) ]
  │  POST /ask
  ▼
[ FastAPI Microservice ]
  ├── 1. In-Memory TTLCache (Checks if query was recently processed)
  ├── 2. FastEmbed ONNX Runtime (Encodes query to 384-dim dense vector locally in <15ms)
  ├── 3. Supabase pgvector RPC (Executes cosine distance search <=> with SQL filter pushdown)
  └── 4. Google Gemini 2.5 Flash (Generates structured conversational recommendations)
  │
  ▼
JSON Response (Curated Products + Markdown Answer)
```

---

## 📂 Project Structure

```
picksy/
├── backend/
│   ├── main.py              # FastAPI application, lifespan handlers, /ask & /products CRUD
│   ├── ingest.py            # Batch data ingestion pipeline with MD5 content-hash caching
│   ├── requirements.txt     # Python dependencies (fastapi, fastembed, pydantic, supabase)
│   └── .env.example         # Environment template
│
├── frontend/
│   ├── src/app/
│   │   ├── page.tsx         # Conversational shopping interface with product modal
│   │   ├── admin/page.tsx   # Admin dashboard for catalog CRUD & real-time re-indexing
│   │   ├── layout.tsx       # Root layout & typography
│   │   └── globals.css      # Custom animations & theme tokens
│   ├── package.json         # Next.js 16, React 19, Tailwind CSS v4
│   └── .env.example         # Frontend API URL configuration
│
├── Dockerfile               # Multi-stage Dockerfile with pre-cached FastEmbed model
├── docker-compose.yml       # Production container orchestration
└── README.md
```

---

## ⚡ Core Engineering Features

- **Local CPU Dense Embeddings (FastEmbed + ONNX):** Pre-caches `BAAI/bge-small-en-v1.5` inside the application container to generate 384-dimensional dense vectors locally on CPU with zero per-query API latency or costs.
- **pgvector Cosine Search with SQL Pushdown:** Executes similarity matching directly inside PostgreSQL via a custom PL/pgSQL RPC function (`search_products`) combining HNSW indexing with category, price ceiling, and rating filters.
- **Incremental Sync via MD5 Content Hashing:** The data pipeline calculates MD5 checksums of serialized product chunks. Unmodified products skip vector generation during updates to minimize compute overhead.
- **In-Memory Caching (`TTLCache`):** Employs a 10-minute TTL query cache with automatic invalidation whenever catalog mutations occur via the Admin API.
- **Graceful Degradation:** Automatic error boundaries fall back directly to ranked vector matches if upstream LLM services experience rate limits or network issues.

---

## 📡 Key API Endpoints

| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `POST` | `/ask` | Semantic RAG search (vector matching + Gemini response) | Public |
| `GET` | `/health` | Healthcheck & indexed product count | Public |
| `GET` | `/products` | Filterable catalog pagination & search | Public |
| `GET` | `/products/stats` | Category counts and catalog summary | Public |
| `POST` | `/products` | Create product + generate vector embedding | `X-Admin-Key` |
| `PUT` | `/products/{id}` | Update product + recompute embedding if modified | `X-Admin-Key` |
| `DELETE`| `/products/{id}` | Delete product from database | `X-Admin-Key` |

---

## 💻 Local Quickstart

### 1. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend/.env`:
```env
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_key
ADMIN_API_KEY=picksy_admin_secret
PORT=8000
ALLOWED_ORIGINS=*
```

Start the API:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Start Next.js:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📄 Resume Summary

- **Picksy — Full-Stack RAG AI Shopping Assistant** *(Next.js 16, React 19, FastAPI, pgvector, Docker, Supabase)*
  - Built an end-to-end semantic product search platform using **FastAPI**, **Next.js 16**, and **Supabase (pgvector)** over 1,000+ catalog items with sub-100ms vector retrieval.
  - Implemented local **ONNX-accelerated dense vector embeddings** (`BAAI/bge-small-en-v1.5`, 384 dims) via **FastEmbed**, eliminating external embedding API costs and network round-trips.
  - Architected incremental data synchronization with **MD5 content hashing** and in-memory **TTLCache**, preventing redundant re-embedding computations and reducing LLM inference overhead.
  - Developed admin catalog management with automated vector re-indexing and built-in graceful degradation for LLM query routing.

---

## 📜 License

Distributed under the **MIT License**.

