

# 🛍️ Picksy: Enterprise RAG Shopping Assistant

An enterprise-grade, highly optimized AI shopping assistant that uses **Retrieval-Augmented Generation (RAG)** to provide conversational, semantic search for products. Instead of keyword matching, users can ask complex questions like *"What are the best curtains under $30?"* and receive intelligent, AI-curated responses.

## 🚀 Live Demo
- **Frontend (Vercel):** [https://pickksy.vercel.app](https://pickksy.vercel.app)
- **Backend (Hugging Face):** [https://huggingface.co/spaces/mehulpatill/shoppingAgent](https://huggingface.co/spaces/mehulpatill/shoppingAgent)

## 🏗️ Architecture & Tech Stack
This project features a decoupled, highly-scalable architecture:

1. **Frontend (Next.js / React / Tailwind CSS)**
   - Deployed on **Vercel** for edge-optimized delivery.
   - Beautiful, glassmorphic UI with animated loading states and "Cold Boot" survival logic.
   - Built-in Admin Dashboard for managing the product catalog.

2. **Backend (Python / FastAPI)**
   - Deployed on **Hugging Face Spaces** (Docker).
   - Serves as the AI brain and API gateway.
   - **Google Gemini API (`gemini-3.5-flash`)**: Handles natural language understanding and response generation.
   - **FastEmbed (`BAAI/bge-small-en-v1.5`)**: Runs entirely locally within the Python backend to generate vector embeddings for free, completely bypassing paid API embedding costs.

3. **Database (Supabase / PostgreSQL + pgvector)**
   - Stores the product catalog.
   - Performs rapid Cosine Similarity vector searches to find relevant products based on the user's conversational query.

## ✨ Enterprise Features

- **Semantic Vector Search:** Understands the *meaning* of a query, not just exact keywords.
- **Content-Hash Synchronization:** The Admin dashboard automatically calculates MD5 hashes of product text. If you update a price, it skips the expensive AI re-embedding process to save CPU. It only re-embeds when textual meaning changes!
- **Graceful Degradation:** If the Gemini API hits a rate limit or crashes, the backend catches the error and instantly falls back to pure database vector search, ensuring the UI never crashes for the customer.
- **Cold-Boot Resilience:** Hugging Face free-tier servers sleep after inactivity. The frontend intelligently detects if the backend is asleep, bypasses strict serverless timeouts, and presents a beautiful "Waking up AI Engine" overlay to the user.

## 💻 Local Development Setup

### 1. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in the `backend/` directory:
```env
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.5-flash
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_service_key
ADMIN_API_KEY=your_secret_admin_password
```

Start the FastAPI server:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Frontend Setup
```bash
cd frontend
npm install
```

Create a `.env.local` file in the `frontend/` directory (optional for local dev if using the proxy):
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Start the Next.js server:
```bash
npm run dev
```

## 📦 Deployment

### Backend (Hugging Face Spaces)
1. Create a Docker Space on Hugging Face.
2. Set your 4 environment variables as Secrets.
3. Push the entire repository. The root `Dockerfile` is configured to automatically ignore the frontend and deploy the FastAPI server on port `7860`.

### Frontend (Vercel)
1. Import the repository into Vercel, ensuring the **Root Directory** is set to `frontend`.
2. Add `NEXT_PUBLIC_API_URL` to the Vercel Environment Variables, pointing to your live Hugging Face Space URL.
3. Deploy!
