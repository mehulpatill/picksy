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

const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
const API_URL = rawApiUrl.replace(/\/+$/, "");

// ── Formatters ─────────────────────────────────────
function formatPrice(val: number | string | null | undefined): string {
  if (val === null || val === undefined || val === "") return "";
  if (typeof val === "number") return `$${val.toFixed(2)}`;
  const clean = String(val).replace(/[\$,]/g, "");
  const num = parseFloat(clean);
  return isNaN(num) ? String(val) : `$${num.toFixed(2)}`;
}

function formatMarkdownText(text: string) {
  const lines = text.split("\n");
  return lines.map((line, idx) => {
    // Bold parsing
    const parts = line.split(/(\*\*.*?\*\*)/g);
    const renderedLine = parts.map((part, pIdx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={pIdx} className="font-semibold text-zinc-100">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });

    if (line.trim().startsWith("* ") || line.trim().startsWith("- ")) {
      return (
        <li key={idx} className="ml-4 list-disc list-outside text-zinc-300 leading-relaxed my-1">
          {renderedLine.slice(1)}
        </li>
      );
    }

    if (line.trim() === "") {
      return <div key={idx} className="h-2" />;
    }

    return (
      <p key={idx} className="text-sm text-zinc-300 leading-relaxed my-1">
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
      <div className="flex items-center">
        {Array.from({ length: 5 }).map((_, i) => (
          <svg key={i} className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="none">
            <defs>
              <linearGradient id={`star-fill-${i}-${rating}`}>
                <stop
                  offset={`${i < full ? 100 : i === full ? partial * 100 : 0}%`}
                  stopColor="#eab308"
                />
                <stop
                  offset={`${i < full ? 100 : i === full ? partial * 100 : 0}%`}
                  stopColor="#3f3f46"
                />
              </linearGradient>
            </defs>
            <path
              d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.176 0l-3.37 2.448c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.013 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.336-3.957z"
              fill={`url(#star-fill-${i}-${rating})`}
            />
          </svg>
        ))}
      </div>
      <span className="text-xs font-medium text-zinc-400 ml-0.5">{rating.toFixed(1)}</span>
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
      className="group relative bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 rounded-xl p-4 transition-all duration-200 cursor-pointer flex flex-col justify-between"
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          {product.brand ? (
            <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider truncate max-w-[150px]">
              {product.brand}
            </span>
          ) : (
            <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
              {product.category_name || "Product"}
            </span>
          )}
          {product.available_for_delivery && (
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded font-medium">
              Delivery
            </span>
          )}
        </div>

        <h4 className="text-sm font-medium text-zinc-100 leading-snug line-clamp-2 mb-1.5 group-hover:text-white transition-colors">
          {product.product_name}
        </h4>

        {product.description && (
          <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed mb-3">
            {product.description}
          </p>
        )}
      </div>

      <div className="pt-3 border-t border-zinc-800/60 flex items-center justify-between mt-auto">
        <span className="text-base font-semibold text-zinc-100">
          {formatPrice(product.final_price)}
        </span>
        <StarRating rating={product.rating} />
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl overflow-hidden animate-fade-in-up">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center text-sm transition-colors"
        >
          ✕
        </button>

        {/* Tags */}
        <div className="flex items-center gap-2 mb-2">
          {product.category_name && (
            <span className="text-xs text-zinc-400 bg-zinc-900 border border-zinc-800 px-2.5 py-0.5 rounded">
              {product.category_name}
            </span>
          )}
          {product.available_for_delivery && (
            <span className="text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-2.5 py-0.5 rounded">
              Delivery Available
            </span>
          )}
        </div>

        {/* Name */}
        <h3 className="text-lg font-semibold text-white mb-3 pr-6 leading-snug">
          {product.product_name}
        </h3>

        {/* Price & Rating */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800/80 mb-4">
          <div>
            <span className="text-xs text-zinc-400 block">Price</span>
            <span className="text-xl font-bold text-white">
              {formatPrice(product.final_price)}
            </span>
          </div>
          <div className="text-right">
            <StarRating rating={product.rating} />
            <span className="text-[11px] text-zinc-500 mt-0.5 block">
              {product.review_count ? `${product.review_count.toLocaleString()} reviews` : "No reviews"}
            </span>
          </div>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
          <div className="p-2.5 rounded-lg bg-zinc-900/40 border border-zinc-800/50">
            <span className="text-zinc-500 block">Brand</span>
            <span className="font-medium text-zinc-300">{product.brand || "—"}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-zinc-900/40 border border-zinc-800/50">
            <span className="text-zinc-500 block">Item ID</span>
            <span className="font-mono text-zinc-300 truncate block">{product.product_id || "—"}</span>
          </div>
        </div>

        {/* Description */}
        {product.description && (
          <div className="mb-5 max-h-40 overflow-y-auto pr-1">
            <h4 className="text-xs font-medium text-zinc-400 mb-1.5">Overview</h4>
            <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-line">
              {product.description}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => {
              alert("Added to bag!");
              onClose();
            }}
            className="flex-1 py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-medium text-sm transition-colors cursor-pointer"
          >
            Add to Bag
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-sm transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function LoadingIndicator() {
  return (
    <div className="flex items-start gap-3 animate-fade-in-up py-2">
      <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-semibold text-zinc-300">
        P
      </div>
      <div className="flex-1 space-y-2 max-w-xl">
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <span>Searching catalog</span>
          <span className="inline-flex gap-1">
            <span className="w-1 h-1 rounded-full bg-zinc-400 dot-1" />
            <span className="w-1 h-1 rounded-full bg-zinc-400 dot-2" />
            <span className="w-1 h-1 rounded-full bg-zinc-400 dot-3" />
          </span>
        </div>
        <div className="skeleton h-3.5 w-3/4 rounded" />
        <div className="skeleton h-3.5 w-1/2 rounded" />
      </div>
    </div>
  );
}

const STARTER_PROMPTS = [
  "What are the best curtains under $30?",
  "Show me popular makeup and beauty products",
  "Comfortable women's tops with free delivery",
  "Top rated products under $20",
];

// ── Main Page ──────────────────────────────────────
export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

      if (!res.ok) throw new Error(`Status ${res.status}`);

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
        content: "Sorry, I couldn't process that request right now. Please try again.",
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
    <div className="flex flex-col h-screen overflow-hidden bg-[#09090b] text-zinc-100 selection:bg-zinc-800">
      {/* ── Top Navigation ───────────────────────── */}
      <header className="flex-shrink-0 border-b border-zinc-800/80 bg-[#09090b]/90 backdrop-blur-md z-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="font-semibold text-base text-white tracking-tight">Picksy</span>
            <span className="text-zinc-600 text-xs font-normal">/</span>
            <span className="text-xs text-zinc-400">Shopping Assistant</span>
          </div>

          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                className="text-xs text-zinc-400 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                New Chat
              </button>
            )}
            <Link
              href="/admin"
              className="text-xs text-zinc-400 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              Admin
            </Link>
          </div>
        </div>
      </header>

      {/* ── Chat Content ────────────────────────── */}
      <main ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
          {/* Empty State */}
          {isEmpty && (
            <div className="flex flex-col items-center justify-center min-h-[58vh] text-center animate-fade-in-up">
              <h2 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight mb-2">
                Find exactly what you&apos;re looking for.
              </h2>
              <p className="text-zinc-400 text-sm max-w-sm mb-8">
                Search products, compare options, and get personalized recommendations.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-lg text-left">
                {STARTER_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => sendMessage(prompt)}
                    className="p-3.5 rounded-xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all text-xs text-zinc-300 hover:text-white text-left cursor-pointer group"
                  >
                    <span className="group-hover:translate-x-0.5 transition-transform inline-block">
                      {prompt} &rarr;
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message List */}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 animate-fade-in-up ${
                msg.role === "user" ? "flex-row-reverse" : ""
              }`}
            >
              {msg.role === "assistant" ? (
                <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-semibold text-zinc-300 mt-0.5">
                  P
                </div>
              ) : null}

              <div
                className={`max-w-2xl ${
                  msg.role === "user"
                    ? "bg-zinc-800 text-zinc-100 rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm"
                    : "space-y-3.5 w-full"
                }`}
              >
                {msg.role === "user" ? (
                  <p className="leading-relaxed">{msg.content}</p>
                ) : (
                  <>
                    <div className="space-y-1">
                      {formatMarkdownText(msg.content)}
                    </div>

                    {/* Matched Products */}
                    {msg.products && msg.products.length > 0 && (
                      <div className="pt-2">
                        <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2.5">
                          Recommended Products
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

          {loading && <LoadingIndicator />}
        </div>
      </main>

      {/* ── Search Input ────────────────────────── */}
      <footer className="flex-shrink-0 border-t border-zinc-800/80 bg-[#09090b]/90 backdrop-blur-md">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          <div className="relative flex items-center bg-zinc-900 border border-zinc-800 focus-within:border-zinc-600 rounded-xl px-4 py-2.5 transition-colors">
            <input
              ref={inputRef}
              id="chat-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about products, prices, or styles..."
              disabled={loading}
              className="flex-1 bg-transparent outline-none text-sm text-zinc-100 placeholder:text-zinc-500 disabled:opacity-50 pr-8"
            />
            <button
              id="send-button"
              type="submit"
              disabled={loading || !input.trim()}
              className="w-7 h-7 rounded-lg bg-white text-zinc-950 hover:bg-zinc-200 disabled:opacity-20 disabled:cursor-not-allowed flex items-center justify-center text-xs transition-colors cursor-pointer"
            >
              ↑
            </button>
          </div>
        </form>
      </footer>

      {/* ── Product Modal ───────────────────────── */}
      <ProductModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />
    </div>
  );
}


