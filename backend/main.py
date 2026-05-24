import os
import re
import hashlib
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Header, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google import genai
from google.genai import types
from supabase import create_client, Client
from dotenv import load_dotenv
from cachetools import TTLCache
from fastembed import TextEmbedding

load_dotenv()

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Supabase credentials missing.")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise RuntimeError("Gemini API key missing.")
gemini_client = genai.Client(api_key=GEMINI_API_KEY)
GEMINI_MODEL = "gemini-3.5-flash"

ADMIN_API_KEY = os.getenv("ADMIN_API_KEY", "")

# fastembed model (loaded once at startup via lifespan)
embedding_model: TextEmbedding | None = None

# TTLCache: stores max 100 items, expires in 10 minutes (600 seconds)
query_cache: TTLCache = TTLCache(maxsize=100, ttl=600)

# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    global embedding_model
    print("Loading embedding model BAAI/bge-small-en-v1.5...")
    embedding_model = TextEmbedding(model_name="BAAI/bge-small-en-v1.5")
    print("✅ Embedding model loaded")
    print("✅ App started")
    yield
    print("🛑 App stopped")

app = FastAPI(title="AI Product Assistant", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------
class AskRequest(BaseModel):
    query: str

class ProductOut(BaseModel):
    product_id: str
    product_name: str
    brand: str | None = None
    category_name: str | None = None
    final_price: float | None = None
    rating: float | None = None
    review_count: int | None = None
    available_for_delivery: bool | None = None
    description: str | None = None

class AskResponse(BaseModel):
    answer: str
    products: list[ProductOut]

class ProductCreate(BaseModel):
    product_id: str
    product_name: str
    brand: str | None = None
    category_name: str | None = None
    final_price: float | None = None
    rating: float | None = None
    review_count: int | None = None
    available_for_delivery: bool | None = None
    description: str | None = None

class ProductUpdate(BaseModel):
    product_name: str | None = None
    brand: str | None = None
    category_name: str | None = None
    final_price: float | None = None
    rating: float | None = None
    review_count: int | None = None
    available_for_delivery: bool | None = None
    description: str | None = None

class ProductListResponse(BaseModel):
    products: list[ProductOut]
    total: int
    page: int
    page_size: int

class StatsResponse(BaseModel):
    total_products: int
    categories: list[str]
    avg_rating: float | None

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
SYSTEM_PROMPT = (
    "You are a helpful Walmart product assistant. "
    "Answer the user's question using only the product context provided. "
    "Be concise and specific. If no relevant product exists in the context, say so honestly."
)

def _verify_admin(x_admin_key: str | None):
    """Verify admin API key."""
    if not ADMIN_API_KEY:
        raise HTTPException(status_code=500, detail="ADMIN_API_KEY not configured on server")
    if x_admin_key != ADMIN_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid admin key")

def _build_chunk(product: dict) -> str:
    """Build a text chunk from product fields for embedding."""
    delivery = "Yes" if product.get("available_for_delivery") else "No"
    return (
        f"Product: {product.get('product_name', 'N/A')}\n"
        f"Brand: {product.get('brand', 'N/A')}\n"
        f"Category: {product.get('category_name', 'N/A')}\n"
        f"Price: ${product.get('final_price', 'N/A')}\n"
        f"Rating: {product.get('rating', 'N/A')} stars ({product.get('review_count', 0)} reviews)\n"
        f"Delivery Available: {delivery}\n"
        f"Description: {product.get('description', 'N/A')}"
    )

def _compute_hash(text: str) -> str:
    """Compute MD5 hash of text chunk."""
    return hashlib.md5(text.encode("utf-8")).hexdigest()

def _embed_texts(texts: list[str]) -> list[list[float]]:
    """Embed texts using fastembed BAAI/bge-small-en-v1.5 (384 dims)."""
    embeddings = list(embedding_model.embed(texts))
    return [e.tolist() for e in embeddings]

def _embed_single(text: str) -> list[float]:
    """Embed a single text."""
    return _embed_texts([text])[0]

def _clear_cache():
    """Clear the query cache after mutations."""
    query_cache.clear()

def _extract_metadata_filters(query: str) -> dict:
    query_lower = query.lower()
    filters = {
        "filter_category": None,
        "filter_max_price": None,
        "filter_min_rating": None
    }
    price_match = re.search(r'under\s+\$?(\d+)', query_lower)
    if price_match:
        filters["filter_max_price"] = float(price_match.group(1))
    if "highly rated" in query_lower or "best" in query_lower:
        filters["filter_min_rating"] = 4.0
    categories = ["electronics", "home", "clothing", "toys", "decor", "curtains"]
    for cat in categories:
        if cat in query_lower:
            filters["filter_category"] = cat
            break
    return filters

# ---------------------------------------------------------------------------
# Health + Chat endpoints
# ---------------------------------------------------------------------------
@app.get("/health")
async def health():
    try:
        res = supabase.table("products").select("id", count="exact").limit(1).execute()
        count = res.count if hasattr(res, 'count') and res.count is not None else 0
        return {"status": "ok", "products_indexed": count}
    except Exception as e:
        return {"status": "error", "detail": str(e)}

@app.post("/ask", response_model=AskResponse)
async def ask(body: AskRequest):
    query = body.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    if query in query_cache:
        return query_cache[query]

    # 1. Embed query
    try:
        query_vec = _embed_single(query)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Embedding error: {e}")

    # 2. Extract metadata hints
    filters = _extract_metadata_filters(query)

    # 3. Call Supabase RPC
    rpc_params = {"query_embedding": query_vec, "match_count": 5}
    if filters["filter_category"]:
        rpc_params["filter_category"] = filters["filter_category"]
    if filters["filter_max_price"]:
        rpc_params["filter_max_price"] = filters["filter_max_price"]
    if filters["filter_min_rating"]:
        rpc_params["filter_min_rating"] = filters["filter_min_rating"]

    try:
        rpc_res = supabase.rpc("search_products", rpc_params).execute()
        products = rpc_res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database search error: {e}")

    # 4. Build context for LLM
    context_chunks = []
    for p in products:
        context_chunks.append(_build_chunk(p))

    context_str = "\n\n---\n\n".join(context_chunks)
    prompt = f"Product context:\n{context_str}\n\nUser question: {query}\n\n"

    # 5. Call Gemini
    try:
        response = gemini_client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(system_instruction=SYSTEM_PROMPT)
        )
        answer_text = response.text
    except Exception as e:
        print(f"Gemini API error (fallback to pure search): {e}")
        answer_text = "I'm currently experiencing high traffic (Gemini API quota exceeded), but here are the best matching products I found for you from the database!"

    # 6. Format top 3 products
    top_products = []
    for p in products[:3]:
        top_products.append(ProductOut(
            product_id=p.get("product_id", ""),
            product_name=p.get("product_name", ""),
            brand=p.get("brand"),
            category_name=p.get("category_name"),
            final_price=p.get("final_price"),
            rating=p.get("rating"),
            review_count=p.get("review_count", 0),
            available_for_delivery=p.get("available_for_delivery"),
            description=p.get("description"),
        ))

    response_data = AskResponse(answer=answer_text, products=top_products)
    query_cache[query] = response_data
    return response_data

# ---------------------------------------------------------------------------
# CRUD endpoints (admin-protected)
# ---------------------------------------------------------------------------
@app.get("/products", response_model=ProductListResponse)
async def list_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str = Query("", description="Search by product name"),
    category: str = Query("", description="Filter by category"),
):
    """List products with pagination, search, and category filter."""
    offset = (page - 1) * page_size

    query = supabase.table("products").select(
        "product_id, product_name, brand, category_name, final_price, rating, review_count, available_for_delivery, description",
        count="exact"
    )

    if search:
        query = query.ilike("product_name", f"%{search}%")
    if category:
        query = query.ilike("category_name", f"%{category}%")

    query = query.order("product_name").range(offset, offset + page_size - 1)
    res = query.execute()

    products = [ProductOut(**p) for p in res.data]
    total = res.count if hasattr(res, 'count') and res.count is not None else 0

    return ProductListResponse(products=products, total=total, page=page, page_size=page_size)

@app.get("/products/stats", response_model=StatsResponse)
async def product_stats():
    """Get product statistics."""
    count_res = supabase.table("products").select("id", count="exact").limit(1).execute()
    total = count_res.count if hasattr(count_res, 'count') and count_res.count is not None else 0

    cat_res = supabase.table("products").select("category_name").execute()
    categories = sorted(set(r["category_name"] for r in cat_res.data if r.get("category_name")))

    avg_res = supabase.rpc("avg_rating", {}).execute() if False else None  # placeholder
    # Compute avg rating from fetched data
    rating_res = supabase.table("products").select("rating").not_.is_("rating", "null").execute()
    ratings = [r["rating"] for r in rating_res.data if r.get("rating") is not None]
    avg_rating = round(sum(ratings) / len(ratings), 2) if ratings else None

    return StatsResponse(total_products=total, categories=categories, avg_rating=avg_rating)

@app.post("/products", response_model=ProductOut, status_code=201)
async def create_product(
    body: ProductCreate,
    x_admin_key: str | None = Header(None),
):
    """Add a new product. Auto-embeds and computes content hash."""
    _verify_admin(x_admin_key)

    # Check if product_id already exists
    existing = supabase.table("products").select("product_id").eq("product_id", body.product_id).execute()
    if existing.data:
        raise HTTPException(status_code=409, detail=f"Product '{body.product_id}' already exists")

    product_dict = body.model_dump()
    chunk = _build_chunk(product_dict)
    content_hash = _compute_hash(chunk)
    embedding = _embed_single(chunk)

    product_dict["content_hash"] = content_hash
    product_dict["embedding"] = embedding

    try:
        res = supabase.table("products").insert(product_dict).execute()
        _clear_cache()
        return ProductOut(**res.data[0])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Insert error: {e}")

@app.put("/products/{product_id}", response_model=ProductOut)
async def update_product(
    product_id: str,
    body: ProductUpdate,
    x_admin_key: str | None = Header(None),
):
    """Update a product. Re-embeds ONLY if content actually changed (hash comparison)."""
    _verify_admin(x_admin_key)

    # Fetch existing product
    existing = supabase.table("products").select("*").eq("product_id", product_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail=f"Product '{product_id}' not found")

    current = existing.data[0]

    # Merge updates into current product
    update_data = body.model_dump(exclude_unset=True)
    merged = {**current, **update_data}

    # Build chunk and check if content actually changed
    new_chunk = _build_chunk(merged)
    new_hash = _compute_hash(new_chunk)

    fields_to_update = {**update_data, "content_hash": new_hash}

    if new_hash != current.get("content_hash"):
        # Content changed — re-embed
        new_embedding = _embed_single(new_chunk)
        fields_to_update["embedding"] = new_embedding
        print(f"Product {product_id}: content changed, re-embedded")
    else:
        print(f"Product {product_id}: content unchanged, skipping re-embedding")

    try:
        res = supabase.table("products").update(fields_to_update).eq("product_id", product_id).execute()
        _clear_cache()
        return ProductOut(**res.data[0])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Update error: {e}")

@app.delete("/products/{product_id}")
async def delete_product(
    product_id: str,
    x_admin_key: str | None = Header(None),
):
    """Delete a product."""
    _verify_admin(x_admin_key)

    existing = supabase.table("products").select("product_id").eq("product_id", product_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail=f"Product '{product_id}' not found")

    try:
        supabase.table("products").delete().eq("product_id", product_id).execute()
        _clear_cache()
        return {"status": "deleted", "product_id": product_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Delete error: {e}")
