import os
import math
import hashlib
import asyncio
import pandas as pd
from dotenv import load_dotenv
from supabase import create_client, Client
from fastembed import TextEmbedding

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not all([SUPABASE_URL, SUPABASE_KEY]):
    raise ValueError("Missing environment variables. Please check your .env file.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Initialize fastembed model (downloads on first run, then cached)
print("Loading embedding model BAAI/bge-small-en-v1.5...")
embedding_model = TextEmbedding(model_name="BAAI/bge-small-en-v1.5")
print("✅ Embedding model loaded")

REQUIRED_COLUMNS = [
    "product_id",
    "product_name",
    "brand",
    "category_name",
    "final_price",
    "rating",
    "review_count",
    "available_for_delivery",
    "description",
]


def _build_chunk(row: dict) -> str:
    delivery = "Yes" if row.get("available_for_delivery") else "No"
    return (
        f"Product: {row.get('product_name', 'N/A')}\n"
        f"Brand: {row.get('brand', 'N/A')}\n"
        f"Category: {row.get('category_name', 'N/A')}\n"
        f"Price: ${row.get('final_price', 'N/A')}\n"
        f"Rating: {row.get('rating', 'N/A')} stars ({row.get('review_count', 0)} reviews)\n"
        f"Delivery Available: {delivery}\n"
        f"Description: {row.get('description', 'N/A')}"
    )


def _compute_hash(text: str) -> str:
    """Compute MD5 hash of text chunk."""
    return hashlib.md5(text.encode("utf-8")).hexdigest()


def _embed_texts(texts: list[str]) -> list[list[float]]:
    """Embed a list of texts using fastembed BAAI/bge-small-en-v1.5 (384 dims)."""
    embeddings = list(embedding_model.embed(texts))
    return [e.tolist() for e in embeddings]


async def ingest():
    csv_path = os.path.join(os.path.dirname(__file__), "walmart-products.csv")
    print(f"Loading {csv_path}...")

    # Read the CSV file
    df = pd.read_csv(csv_path, usecols=REQUIRED_COLUMNS, dtype={"product_id": str})

    # Drop rows where product_name or description is null
    df = df.dropna(subset=["product_name", "description"])

    # Clean and parse types
    df["review_count"] = (
        pd.to_numeric(df["review_count"], errors="coerce").fillna(0).astype(int)
    )
    df["rating"] = pd.to_numeric(df["rating"], errors="coerce")

    # Remove $ sign if it exists and convert to float
    df["final_price"] = df["final_price"].replace(r"[\$,]", "", regex=True)
    df["final_price"] = pd.to_numeric(df["final_price"], errors="coerce")

    df["available_for_delivery"] = df["available_for_delivery"].astype(bool)

    # Convert NaNs to None for JSON compliance
    records = df.to_dict(orient="records")
    for r in records:
        for k, v in list(r.items()):
            if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
                r[k] = None
            elif pd.isna(v):
                r[k] = None

    csv_product_ids = {r["product_id"] for r in records}
    print(f"Found {len(records)} valid products in CSV.")

    # ── Fetch existing product_ids + content_hashes from DB ──────────────
    print("Fetching existing products from Supabase...")
    existing_res = (
        supabase.table("products")
        .select("product_id, content_hash")
        .execute()
    )
    existing_map: dict[str, str | None] = {
        r["product_id"]: r.get("content_hash") for r in existing_res.data
    }
    existing_ids = set(existing_map.keys())
    print(f"Found {len(existing_ids)} existing products in DB.")

    # ── Classify records ─────────────────────────────────────────────────
    to_insert = []   # new products
    to_update = []   # changed products (hash mismatch)
    unchanged = 0    # products whose hash matches

    for rec in records:
        chunk = _build_chunk(rec)
        content_hash = _compute_hash(chunk)
        rec["_chunk"] = chunk
        rec["_hash"] = content_hash

        if rec["product_id"] not in existing_ids:
            to_insert.append(rec)
        elif existing_map.get(rec["product_id"]) != content_hash:
            to_update.append(rec)
        else:
            unchanged += 1

    # Products in DB but not in CSV → to be deleted
    to_delete_ids = existing_ids - csv_product_ids

    print(f"\n📊 Sync Plan:")
    print(f"   New products to insert:  {len(to_insert)}")
    print(f"   Changed products to update: {len(to_update)}")
    print(f"   Unchanged (skip):        {unchanged}")
    print(f"   Stale products to delete: {len(to_delete_ids)}")

    # ── INSERT new products (batched) ────────────────────────────────────
    batch_size = 25
    total_inserted = 0

    if to_insert:
        print(f"\nInserting {len(to_insert)} new products...")
        for i in range(0, len(to_insert), batch_size):
            batch = to_insert[i : i + batch_size]
            chunks = [r["_chunk"] for r in batch]

            try:
                embeddings = _embed_texts(chunks)
            except Exception as e:
                print(f"  Batch {i // batch_size + 1}: Embedding error: {e}")
                continue

            rows = []
            for j, rec in enumerate(batch):
                row = {k: v for k, v in rec.items() if not k.startswith("_")}
                row["content_hash"] = rec["_hash"]
                row["embedding"] = embeddings[j]
                rows.append(row)

            try:
                supabase.table("products").insert(rows).execute()
                total_inserted += len(rows)
                print(f"  Batch {i // batch_size + 1}: Inserted {len(rows)}")
            except Exception as e:
                print(f"  Batch {i // batch_size + 1}: DB error: {e}")

    # ── UPDATE changed products (batched) ────────────────────────────────
    total_updated = 0

    if to_update:
        print(f"\nUpdating {len(to_update)} changed products...")
        for i in range(0, len(to_update), batch_size):
            batch = to_update[i : i + batch_size]
            chunks = [r["_chunk"] for r in batch]

            try:
                embeddings = _embed_texts(chunks)
            except Exception as e:
                print(f"  Batch {i // batch_size + 1}: Embedding error: {e}")
                continue

            for j, rec in enumerate(batch):
                row = {k: v for k, v in rec.items() if not k.startswith("_")}
                row["content_hash"] = rec["_hash"]
                row["embedding"] = embeddings[j]

                try:
                    supabase.table("products").update(row).eq(
                        "product_id", rec["product_id"]
                    ).execute()
                    total_updated += 1
                except Exception as e:
                    print(f"  Update error for {rec['product_id']}: {e}")

            print(f"  Batch {i // batch_size + 1}: Updated {min(len(batch), batch_size)}")

    # ── DELETE stale products ────────────────────────────────────────────
    total_deleted = 0

    if to_delete_ids:
        print(f"\nDeleting {len(to_delete_ids)} stale products...")
        delete_list = list(to_delete_ids)
        for i in range(0, len(delete_list), batch_size):
            batch_ids = delete_list[i : i + batch_size]
            try:
                supabase.table("products").delete().in_(
                    "product_id", batch_ids
                ).execute()
                total_deleted += len(batch_ids)
            except Exception as e:
                print(f"  Delete error: {e}")

    # ── Summary ──────────────────────────────────────────────────────────
    print("\n--- Smart Sync Complete ---")
    print(f"  Inserted:  {total_inserted}")
    print(f"  Updated:   {total_updated}")
    print(f"  Unchanged: {unchanged}")
    print(f"  Deleted:   {total_deleted}")


if __name__ == "__main__":
    asyncio.run(ingest())
