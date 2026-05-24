# AI Product Assistant — Backend

FastAPI backend with a RAG pipeline (Supabase pgvector + Gemini Embeddings + Gemini 1.5 Flash) for Walmart product Q&A.

## Local Setup

### 1. Install dependencies

```bash
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Environment Variables

Copy the example env file and add your keys:

```bash
cp .env.example .env
```

Edit `.env`:

```
GEMINI_API_KEY=your_gemini_api_key
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_or_service_key
```

### 3. Ingest Data

Run the ingestion script once to populate Supabase with products and embeddings:

```bash
python ingest.py
```
This script reads `walmart-products.csv`, creates text chunks, embeds them using Gemini, and inserts them into Supabase.

### 4. Run the Server

```bash
uvicorn main:app --reload --port 8000
```

### Endpoints

| Method | Path      | Description                                     |
|--------|-----------|-------------------------------------------------|
| GET    | `/health` | Health check → `{ status: ok, products_indexed: N }`  |
| POST   | `/ask`    | Ask a product question                          |

#### POST `/ask`

**Request:**
```json
{ "query": "best curtains under $30" }
```

**Response:**
```json
{
  "answer": "Based on the products available...",
  "products": [
    {
      "product_name": "...",
      "brand": "...",
      "category_name": "...",
      "final_price": "$22.92",
      "rating": 4.6,
      "review_count": 58,
      "available_for_delivery": true
    }
  ]
}
```

## Deploy to HuggingFace Spaces

This backend includes a `Dockerfile` ready for HuggingFace Spaces.
1. Create a new Space (Docker) on HuggingFace.
2. Push this `backend/` folder.
3. Set the `GEMINI_API_KEY`, `SUPABASE_URL`, and `SUPABASE_KEY` as Space Secrets.
