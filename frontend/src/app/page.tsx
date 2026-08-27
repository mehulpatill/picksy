"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import Link from "next/link";

// ── Types ──────────────────────────────────────────
export interface Product {
  product_id?: string;
  product_name: string;
  brand: string | null;
  category_name: string | null;
  final_price: number | string | null;
  rating: number | null;
  review_count: number | null;
  available_for_delivery: boolean | null;
  description?: string | null;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  products?: Product[];
  timestamp: string;
}

interface BackendHealth {
  status: string;
  products_indexed: number;
}

const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
const API_URL = rawApiUrl.replace(/\/+$/, "");

// ── Formatters ─────────────────────────────────────
function formatPrice(val: number | string | null | undefined): string {
  if (val === null || val === undefined || val === "") return "N/A";
  if (typeof val === "number") return `$${val.toFixed(2)}`;
  const clean = String(val).replace(/[\$,]/g, "");
  const num = parseFloat(clean);
  return isNaN(num) ? String(val) : `$${num.toFixed(2)}`;
}

function formatMarkdownText(text: string) {
  // Split into lines for basic markdown rendering
  const lines = text.split("\n");
  return lines.map((line, idx) => {
    let formatted = line;

    // Bold text **text**
    const parts = formatted.split(/(\*\*.*?\*\*)/g);
    const renderedLine = parts.map((part, pIdx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={pIdx} className="font-semibold text-violet-200">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });

    if (line.trim().startsWith("* ") || line.trim().startsWith("- ")) {
      return (
        <li key={idx} className="ml-4 list-disc list-outside text-gray-200 leading-relaxed my-1">
          {renderedLine.slice(1)}
        </li>
      );
    }

    if (line.trim() === "") {
      return <div key={idx} className="h-2" />;
    }

    return (
      <p key={idx} className="text-sm text-gray-200 leading-relaxed my-1">
        {renderedLine}
      </p>
    );
  });
}

function StarRating({ rating }: { rating: number | null }) {
  if (rating === null || rating === undefined) return null;
  const full = Math.floor(rating);
  const partial = rating - full;
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="none">
          <defs>
            <linearGradient id={`star-fill-${i}-${rating}`}>
              <stop
                offset={`${i < full ? 100 : i === full ? partial * 100 : 0}%`}
                stopColor="#fbbf24"
              />
              <stop
                offset={`${i < full ? 100 : i === full ? partial * 100 : 0}%`}
                stopColor="#374151"
              />
            </linearGradient>
          </defs>
          <path
            d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.176 0l-3.37 2.448c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.013 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.336-3.957z"
            fill={`url(#star-fill-${i}-${rating})`}
          />
        </svg>
      ))}
      <span className="text-xs font-medium text-amber-400/90 ml-1">{rating.toFixed(1)}</span>
    </div>
  );
}

function ProductCard({
  product,
  onSelect,
}: {
  product: Product;
  onSelect: (p: Product) => void;
}) {
  return (
    <div
      onClick={() => onSelect(product)}
      className="product-card group relative bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/[0.08] hover:border-violet-500/50 hover:bg-white/[0.08] rounded-2xl p-4 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-violet-500/10 flex flex-col justify-between"
    >
      {/* Delivery badge */}
      {product.available_for_delivery && (
        <div className="absolute -top-2.5 -right-2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-semibold tracking-wider uppercase px-2.5 py-0.5 rounded-full backdrop-blur-md shadow-sm">
          ⚡ Delivery Available
        </div>
      )}

      <div>
        {/* Category badge */}
        {product.category_name && (
          <span className="inline-block text-[10px] tracking-widest uppercase font-semibold text-violet-400/90 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-md mb-2">
            {product.category_name}
          </span>
        )}

        {/* Product title */}
        <h4 className="text-sm font-semibold text-gray-100 leading-snug line-clamp-2 mb-2 group-hover:text-violet-200 transition-colors">
          {product.product_name}
        </h4>

        {/* Short description preview */}
        {product.description && (
          <p className="text-xs text-gray-400 line-clamp-2 mb-3 leading-relaxed">
            {product.description}
          </p>
        )}
      </div>

      <div className="pt-3 border-t border-white/[0.06] mt-2">
        {/* Price & Rating */}
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
            {formatPrice(product.final_price)}
          </span>
          <StarRating rating={product.rating} />
        </div>

        {/* Brand & Reviews */}
        <div className="flex items-center justify-between mt-2 text-[11px] text-gray-400">
          <span className="font-medium truncate max-w-[120px]">
            {product.brand || "Walmart Select"}
          </span>
          {product.review_count !== null && (
            <span className="text-gray-500">
              {product.review_count.toLocaleString()} reviews
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function ProductModal({
  product,
  onClose,
}: {
  product: Product | null;
  onClose: () => void;
}) {
  if (!product) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl bg-[#12121c] border border-white/[0.12] rounded-3xl p-6 sm:p-8 shadow-2xl shadow-violet-500/10 overflow-hidden animate-fade-in-up">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-gray-400 hover:text-white flex items-center justify-center transition-all"
        >
          ✕
        </button>

        {/* Category & Delivery Tag */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {product.category_name && (
            <span className="text-xs font-semibold text-violet-400 bg-violet-500/15 border border-violet-500/30 px-3 py-1 rounded-full uppercase tracking-wider">
              {product.category_name}
            </span>
          )}
          {product.available_for_delivery && (
            <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 rounded-full">
              ⚡ Free / Fast Delivery Available
            </span>
          )}
        </div>

        {/* Product Title */}
        <h3 className="text-xl font-bold text-white mb-3 leading-snug">
          {product.product_name}
        </h3>

        {/* Price & Rating Row */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.04] border border-white/[0.06] mb-5">
          <div>
            <div className="text-xs text-gray-400">Price</div>
            <div className="text-2xl font-black bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              {formatPrice(product.final_price)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-400 mb-1">Customer Rating</div>
            <StarRating rating={product.rating} />
            <div className="text-[11px] text-gray-500 mt-0.5">
              {product.review_count ? `${product.review_count.toLocaleString()} verified ratings` : "No ratings yet"}
            </div>
          </div>
        </div>

        {/* Brand & ID Info */}
        <div className="grid grid-cols-2 gap-3 mb-5 text-xs text-gray-300">
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
            <span className="text-gray-500 block mb-1">Brand</span>
            <span className="font-semibold">{product.brand || "Walmart Select"}</span>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
            <span className="text-gray-500 block mb-1">Product ID / SKU</span>
            <span className="font-mono text-gray-300">{product.product_id || "N/A"}</span>
          </div>
        </div>

        {/* Description */}
        {product.description && (
          <div className="mb-6 max-h-48 overflow-y-auto pr-2">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Product Overview
            </h4>
            <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
              {product.description}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => {
              alert("🛒 Added to cart! (Demo checkout)");
              onClose();
            }}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold text-sm shadow-lg shadow-violet-500/25 transition-all active:scale-[0.98]"
          >
            Add to Bag &middot; {formatPrice(product.final_price)}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-gray-300 text-sm font-medium transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex items-start gap-3 animate-fade-in-up">
      <div className="flex-shrink-0 w-9 h-9 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-violet-500/20">
        AI
      </div>
      <div className="flex-1 space-y-3 max-w-2xl">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-violet-400">Picksy AI is reasoning</span>
          <span className="inline-flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 dot-1" />
            <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400 dot-2" />
            <span className="w-1.5 h-1.5 rounded-full bg-pink-400 dot-3" />
          </span>
        </div>
        <div className="skeleton h-4 w-3/4 rounded-lg" />
        <div className="skeleton h-4 w-1/2 rounded-lg" />
        <div className="skeleton h-4 w-5/6 rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-36 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Smart Suggestion Prompts ───────────────────────
const SUGGESTIONS = [
  { label: "🪟 Best Curtains under $30", query: "What are the best curtains under $30?" },
  { label: "💄 Top Rated Makeup", query: "Show me highly rated makeup and eye cosmetics" },
  { label: "👗 Women's Summer Tops", query: "Comfortable women's cami and tank tops under $20" },
  { label: "⚡ Free Delivery Deals", query: "Find top rated products with delivery available under $25" },
];

const CATEGORY_CHIPS = [
  "Curtains",
  "Bras & Lingerie",
  "Tank Tops",
  "Eye Makeup",
  "Under $15",
  "Under $30",
  "Rated 4.5+ ★",
];

// ── Main Page ──────────────────────────────────────
export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [health, setHealth] = useState<BackendHealth | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Ping backend health
  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then((res) => res.json())
      .then((data: BackendHealth) => setHealth(data))
      .catch((err) => console.error("Health check error:", err));
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const sendMessage = async (queryText?: string) => {
    const query = (queryText ?? input).trim();
    if (!query || loading) return;

    const userMsg: Message = {
      id: `${Date.now()}-user`,
      role: "user",
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      if (!res.ok) throw new Error(`Server returned ${res.status}`);

      const data = await res.json();

      const aiMsg: Message = {
        id: `${Date.now()}-ai`,
        role: "assistant",
        content: data.answer,
        products: data.products,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error(err);
      const errorMsg: Message = {
        id: `${Date.now()}-err`,
        role: "assistant",
        content:
          "Unable to connect to the backend server. Please verify your internet connection or try again shortly.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    sendMessage();
  };

  const clearChat = () => {
    setMessages([]);
    inputRef.current?.focus();
  };

  const isEmpty = messages.length === 0 && !loading;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#0a0a0f] text-gray-100">
      {/* ── Header ──────────────────────────────── */}
      <header className="flex-shrink-0 border-b border-white/[0.08] bg-[#0c0c14]/90 backdrop-blur-2xl z-20 shadow-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Logo Icon */}
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 via-fuchsia-600 to-pink-500 flex items-center justify-center shadow-lg shadow-violet-500/25 ring-1 ring-white/20">
              <span className="text-xl select-none">🛍️</span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight bg-gradient-to-r from-violet-400 via-fuchsia-300 to-pink-400 bg-clip-text text-transparent">
                  Picksy
                </h1>
                <span className="text-[10px] font-bold uppercase tracking-wider text-violet-300 bg-violet-500/20 border border-violet-500/30 px-2 py-0.5 rounded-full">
                  RAG 2.0
                </span>
              </div>
              <p className="text-[11px] text-gray-400 font-medium">
                Enterprise AI Shopping Assistant &middot; FastEmbed + Gemini + Supabase
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Live Database Sync Badge */}
            <div className="hidden sm:flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/25 px-3 py-1.5 rounded-full text-xs font-semibold text-emerald-400 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>{health ? `${health.products_indexed} Products Synced` : "EC2 Connected"}</span>
            </div>

            {/* Clear Chat Button */}
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                className="text-xs font-medium text-gray-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] px-3 py-1.5 rounded-xl transition-all"
                title="Clear conversation"
              >
                Clear
              </button>
            )}

            {/* Admin link */}
            <Link
              href="/admin"
              className="text-xs font-semibold text-violet-300 hover:text-white bg-violet-600/20 hover:bg-violet-600/40 border border-violet-500/30 px-3.5 py-1.5 rounded-xl transition-all shadow-sm flex items-center gap-1"
            >
              <span>Admin</span>
              <span>&rarr;</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Chat Container ──────────────────────── */}
      <main ref={scrollRef} className="flex-1 overflow-y-auto relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          {/* Welcome Screen / Hero State */}
          {isEmpty && (
            <div className="flex flex-col items-center justify-center min-h-[62vh] text-center animate-fade-in-up pt-4">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-gradient-to-r from-violet-500/15 via-fuchsia-500/15 to-pink-500/15 border border-violet-500/30 text-violet-300 text-xs font-semibold mb-6 shadow-sm">
                <span>⚡ Sub-Second Semantic Search</span>
                <span>&middot;</span>
                <span>BAAI/bge-small Embeddings</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-3 max-w-lg leading-tight">
                What are you shopping for today?
              </h2>

              <p className="text-gray-400 text-sm max-w-md mx-auto leading-relaxed mb-8">
                Ask complex questions using natural language. Picksy finds exact matches, compares prices, and provides AI-curated recommendations.
              </p>

              {/* Suggestion Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl text-left mb-6">
                {SUGGESTIONS.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => sendMessage(item.query)}
                    className="p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] hover:border-violet-500/40 transition-all duration-200 group cursor-pointer text-left shadow-sm flex flex-col justify-between"
                  >
                    <span className="font-semibold text-sm text-gray-200 group-hover:text-violet-300 transition-colors">
                      {item.label}
                    </span>
                    <span className="text-xs text-gray-500 mt-2 line-clamp-1">
                      &ldquo;{item.query}&rdquo;
                    </span>
                  </button>
                ))}
              </div>

              {/* Feature Tags */}
              <div className="flex items-center justify-center gap-4 text-[11px] text-gray-500 font-medium">
                <span>✓ 999+ Catalog Items</span>
                <span>&middot;</span>
                <span>✓ MD5 Content Caching</span>
                <span>&middot;</span>
                <span>✓ Cosine Similarity</span>
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 animate-fade-in-up ${
                msg.role === "user" ? "flex-row-reverse" : ""
              }`}
            >
              {/* Avatar */}
              {msg.role === "assistant" ? (
                <div className="flex-shrink-0 w-9 h-9 rounded-2xl bg-gradient-to-tr from-violet-600 via-fuchsia-600 to-pink-500 flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-violet-500/25 ring-1 ring-white/20">
                  AI
                </div>
              ) : (
                <div className="flex-shrink-0 w-9 h-9 rounded-2xl bg-white/[0.08] border border-white/[0.1] flex items-center justify-center text-xs font-bold text-gray-300">
                  👤
                </div>
              )}

              {/* Message Content Container */}
              <div
                className={`max-w-2xl ${
                  msg.role === "user"
                    ? "bg-gradient-to-br from-violet-600/30 to-fuchsia-600/30 border border-violet-500/30 rounded-2xl rounded-tr-md px-5 py-3.5 shadow-md"
                    : "space-y-4 w-full"
                }`}
              >
                {msg.role === "user" ? (
                  <div>
                    <p className="text-sm text-gray-100 leading-relaxed font-medium">
                      {msg.content}
                    </p>
                    <span className="text-[10px] text-violet-300/60 mt-1 block text-right">
                      {msg.timestamp}
                    </span>
                  </div>
                ) : (
                  <>
                    {/* Assistant Natural Language Box */}
                    <div className="bg-[#12121c]/90 border border-white/[0.08] rounded-2xl rounded-tl-md px-5 py-4 shadow-lg">
                      <div className="space-y-1">
                        {formatMarkdownText(msg.content)}
                      </div>
                      <span className="text-[10px] text-gray-500 mt-2 block">
                        Picksy AI &middot; {msg.timestamp}
                      </span>
                    </div>

                    {/* Matched Product Cards Grid */}
                    {msg.products && msg.products.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-2 px-1">
                          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                            ⭐ Top Curated Matches ({msg.products.length})
                          </span>
                          <span className="text-[11px] text-violet-400/80 font-medium">
                            Click card for details
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                          {msg.products.map((p, i) => (
                            <ProductCard
                              key={i}
                              product={p}
                              onSelect={(prod) => setSelectedProduct(prod)}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}

          {/* Loading Indicator */}
          {loading && <LoadingSkeleton />}
        </div>
      </main>

      {/* ── Input Bar ───────────────────────────── */}
      <footer className="flex-shrink-0 border-t border-white/[0.08] bg-[#0c0c14]/90 backdrop-blur-2xl z-20">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          {/* Quick Category / Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 no-scrollbar">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 flex-shrink-0 mr-1">
              Filters:
            </span>
            {CATEGORY_CHIPS.map((chip, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  const newQuery = input ? `${input} ${chip}` : `Show me ${chip}`;
                  sendMessage(newQuery);
                }}
                className="text-xs font-medium whitespace-nowrap px-3 py-1 rounded-full bg-white/[0.04] hover:bg-violet-500/20 border border-white/[0.08] hover:border-violet-500/30 text-gray-300 hover:text-violet-200 transition-all cursor-pointer flex-shrink-0"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Main Input Box */}
          <div className="flex items-center gap-3 bg-white/[0.04] border border-white/[0.1] focus-within:border-violet-500/50 focus-within:bg-white/[0.06] rounded-2xl px-4 py-2.5 transition-all shadow-inner">
            <span className="text-gray-500 text-sm select-none">🔍</span>
            <input
              ref={inputRef}
              id="chat-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything... (e.g., 'What are the best curtains under $30?')"
              disabled={loading}
              className="flex-1 bg-transparent outline-none text-sm text-gray-100 placeholder:text-gray-500 disabled:opacity-50"
            />
            <button
              id="send-button"
              type="submit"
              disabled={loading || !input.trim()}
              className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 via-fuchsia-600 to-pink-500 flex items-center justify-center text-white disabled:opacity-25 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-violet-500/30 active:scale-95 transition-all cursor-pointer"
              title="Send question"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18"
                />
              </svg>
            </button>
          </div>

          <p className="text-[10px] text-gray-500 text-center mt-2.5 tracking-wide">
            Powered by Retrieval-Augmented Generation &middot; Real-time vector search over Walmart product catalog.
          </p>
        </form>
      </footer>

      {/* ── Product Quick View Modal ────────────── */}
      <ProductModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />
    </div>
  );
}

