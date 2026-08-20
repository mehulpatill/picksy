# 🛍️ Picksy: Enterprise RAG Shopping Assistant

An enterprise-grade, highly optimized AI shopping assistant that uses **Retrieval-Augmented Generation (RAG)** to provide conversational, semantic search for products. Instead of keyword matching, users can ask complex questions like *"What are the best curtains under $30?"* and receive intelligent, AI-curated responses.

## 🚀 Live Demo
- **Frontend (Vercel):** [https://pickksy.vercel.app](https://pickksy.vercel.app)
- **Backend (Hugging Face):** [https://huggingface.co/spaces/mehulpatill/shoppingAgent](https://huggingface.co/spaces/mehulpatill/shoppingAgent)

---

## 🏗️ Architecture & Tech Stack

```
Internet
   │
   ▼
Nginx (:80 / :443 HTTPS SSL termination)
   │
   ▼
Docker Container (FastAPI on 127.0.0.1:8000)
   ├── FastEmbed (BAAI/bge-small-en-v1.5, 384 dims) ──> Local CPU Embeddings
   ├── TTLCache (In-Memory Query Cache)
   ├── Google Gemini API (gemini-3.5-flash) ─────────> Natural Language Answer
   └── Supabase (PostgreSQL + pgvector) ───────────────> Semantic Vector Search
```

1. **Frontend (Next.js 16 / React 19 / Tailwind CSS v4)**
   - Deployed on **Vercel** for edge-optimized delivery.
   - Glassmorphic UI with animated loading states, responsive star ratings, and connection detection.
   - Built-in Admin Dashboard (`/admin`) for catalog inventory management.

2. **Backend (Python / FastAPI / Docker)**
   - Deployed on **AWS EC2 (Ubuntu x86_64, t3.small)** or **Hugging Face Spaces**.
   - **FastEmbed (`BAAI/bge-small-en-v1.5`)**: Embedded directly within Python container to generate 384-dimensional vector embeddings locally (zero API embedding cost).
   - **Google Gemini API (`gemini-3.5-flash`)**: Handles natural language comprehension and response generation.
   - **Supabase (PostgreSQL + pgvector)**: Stores catalog data and executes Cosine Similarity vector searches via RPC `search_products`.

---

## ✨ Enterprise Features

- **Semantic Vector Search:** Understands user intent and nuances instead of strict keyword matching.
- **Content-Hash Synchronization:** Automatically computes MD5 hashes of product text chunks. Edits that don't alter text semantics skip AI re-embedding to conserve CPU.
- **In-Memory Query Caching:** `TTLCache` caches search results for 10 minutes to minimize redundant embedding and LLM calls. Cache auto-invalidates on product CRUD mutations.
- **Graceful Degradation:** Catches Gemini rate limit or quota exceptions and falls back directly to database vector search.
- **Production-Hardened Security:** Internal Docker loopback binding (`127.0.0.1:8000`), proxy headers handling, configurable CORS, and `X-Admin-Key` header authentication.

---

## 💻 Local Development Setup

### 1. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend/.env` (copy from `backend/.env.example`):
```env
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.5-flash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_service_key
ADMIN_API_KEY=your_secret_admin_password
PORT=8000
ALLOWED_ORIGINS=http://localhost:3000
```

Start the backend:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Frontend Setup

```bash
cd frontend
npm install
```

Create `frontend/.env.local` (copy from `frontend/.env.example`):
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Start Next.js:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📦 Production Deployment

### Option A: AWS EC2 (Recommended for Production)

#### 1. EC2 Server Setup (Ubuntu 24.04/26.04 LTS on t3.small)
Ensure your AWS EC2 Security Group allows:
- **Port 80 (HTTP)**
- **Port 443 (HTTPS)**
- **Port 22 (SSH)**
- *(Do NOT expose port 8000 publicly)*

#### 2. Install Docker & Nginx
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose-v2 nginx certbot python3-certbot-nginx
sudo usermod -aG docker $USER
```

#### 3. Clone Repository & Configure Environment
```bash
git clone <your-repo-url> picksy
cd picksy
cp backend/.env.example backend/.env
nano backend/.env  # Populate your real secrets
```

#### 4. Launch Backend with Docker Compose
```bash
docker compose up -d --build
```
Verify container status:
```bash
docker compose ps
curl http://127.0.0.1:8000/health
```

#### 5. Configure Nginx Reverse Proxy & SSL
Follow instructions in [`nginx/README.md`](nginx/README.md):
```bash
sudo cp nginx/picksy.conf /etc/nginx/sites-available/picksy.conf
sudo sed -i 's/YOUR_DOMAIN/api.yourdomain.com/g' /etc/nginx/sites-available/picksy.conf
sudo ln -sf /etc/nginx/sites-available/picksy.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo certbot --nginx -d api.yourdomain.com
```

---

### Option B: Frontend on Vercel

1. Import the repository into **Vercel** and set **Root Directory** to `frontend`.
2. Add the environment variable:
   - `NEXT_PUBLIC_API_URL` = `https://api.yourdomain.com` (your EC2 backend domain)
3. Deploy!

---

### Option C: Hugging Face Spaces (Backend Alternative)

1. Create a Docker Space on Hugging Face.
2. Set your environment secrets (`GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_KEY`, `ADMIN_API_KEY`).
3. Push the repository. The root `Dockerfile` automatically handles containerization and model pre-loading.
