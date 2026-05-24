"use client";

import { useState, useRef, useEffect, FormEvent } from "react";

// ── Types ──────────────────────────────────────────
interface Product {
  product_name: string;
  brand: string | null;
  category_name: string | null;
  final_price: string | null;
  rating: number | null;
  review_count: number | null;
  available_for_delivery: boolean | null;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  products?: Product[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

// ── Helpers ────────────────────────────────────────
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
                stopColor="#facc15"
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
      <span className="text-xs text-gray-400 ml-1">{rating.toFixed(1)}</span>
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  return (
    <div className="product-card group relative bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 hover:border-violet-500/30 hover:bg-white/[0.05] transition-all duration-300 cursor-default">
      {/* Delivery badge */}
      {product.available_for_delivery && (
        <div className="absolute -top-2 -right-2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full backdrop-blur-sm">
          ✦ Delivery
        </div>
      )}

      {/* Category pill */}
      {product.category_name && (
        <span className="inline-block text-[10px] tracking-widest uppercase text-violet-400/70 font-medium mb-2">
          {product.category_name}
        </span>
      )}

      {/* Product name */}
      <h4 className="text-sm font-semibold text-gray-100 leading-snug line-clamp-2 mb-2 group-hover:text-violet-300 transition-colors">
        {product.product_name}
      </h4>

      {/* Price + Rating row */}
      <div className="flex items-center justify-between mt-auto">
        <span className="text-lg font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
          {product.final_price ?? "N/A"}
        </span>
        <StarRating rating={product.rating} />
      </div>

      {/* Brand + Reviews */}
      <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
        <span>{product.brand ?? "Unknown brand"}</span>
        {product.review_count !== null && (
          <span>{product.review_count.toLocaleString()} reviews</span>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 animate-fade-in-up">
      <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center text-xs font-bold shadow-lg shadow-violet-500/20">
        AI
      </div>
      <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl rounded-tl-md px-5 py-3">
        <div className="flex items-center gap-1.5">
          <div className="dot-1 w-2 h-2 rounded-full bg-violet-400" />
          <div className="dot-2 w-2 h-2 rounded-full bg-violet-400" />
          <div className="dot-3 w-2 h-2 rounded-full bg-violet-400" />
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex items-start gap-3 animate-fade-in-up">
      <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center text-xs font-bold shadow-lg shadow-violet-500/20">
        AI
      </div>
      <div className="flex-1 space-y-3 max-w-2xl">
        <div className="skeleton h-4 w-3/4 rounded-lg" />
        <div className="skeleton h-4 w-1/2 rounded-lg" />
        <div className="skeleton h-4 w-5/6 rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-32 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Suggested queries ──────────────────────────────
const SUGGESTIONS = [
  "What are the best curtains under $30?",
  "Show me top-rated electronics",
  "Find products with free delivery",
  "What are good home decor options?",
];

// ── Main Page ──────────────────────────────────────
export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isBooting, setIsBooting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Ping backend to wake it up
  useEffect(() => {
    let timer = setTimeout(() => setIsBooting(true), 1500);
    fetch(`${API_URL}/products?page_size=1`)
      .then(() => {
        clearTimeout(timer);
        setIsBooting(false);
      })
      .catch(() => {
        clearTimeout(timer);
        setIsBooting(false);
      });
    return () => clearTimeout(timer);
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
      id: Date.now().toString(),
      role: "user",
      content: query,
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

      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      const data = await res.json();

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.answer,
        products: data.products,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "Sorry, I couldn't reach the server. Please check your connection or try again later.",
      };
      setMessages((prev) => [...prev, errorMsg]);
      console.error(err);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    sendMessage();
  };

  const isEmpty = messages.length === 0 && !loading;

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* ── Booting UI ──────────────────────────────── */}
      {isBooting && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0a0f]/80 backdrop-blur-md animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/25 mb-6 animate-pulse">
            <svg className="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2 tracking-wide">Waking up AI Engine</h2>
          <p className="text-sm text-gray-400 text-center max-w-xs">
            Hugging Face free tier servers sleep after inactivity. This usually takes about <span className="text-violet-400 font-semibold">30 seconds</span>.
          </p>
        </div>
      )}

      {/* ── Header ──────────────────────────────── */}
      <header className="flex-shrink-0 border-b border-white/[0.06] bg-[#0a0a0f]/80 backdrop-blur-xl z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                ShopAssist AI
              </h1>
              <p className="text-[11px] text-gray-500 tracking-wide">
                Powered by Gemini &middot; Smart Product Data
              </p>
            </div>
          </div>
          
          <a 
            href="/admin" 
            className="text-xs font-semibold text-gray-400 hover:text-violet-400 border border-white/[0.08] hover:border-violet-500/30 bg-white/[0.03] px-3 py-1.5 rounded-lg transition-all"
          >
            Admin Dashboard &rarr;
          </a>
        </div>
      </header>

      {/* ── Chat Area ───────────────────────────── */}
      <main ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          {/* Empty state */}
          {isEmpty && (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center animate-fade-in-up">
              {/* Large icon */}
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20 border border-violet-500/20 flex items-center justify-center mb-6">
                <svg
                  className="w-10 h-10 text-violet-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
                  />
                </svg>
              </div>
              <h3 className="text-white font-medium mb-1 tracking-wide">Welcome to ShopAssist!</h3>
              <p className="text-gray-400 leading-relaxed text-sm">
                Ask me anything about products — prices, ratings,
                features, or just say <span className="text-violet-400">"What are the best laptops?"</span>
              </p>

              {/* Suggestion chips */}
              <div className="flex flex-wrap justify-center gap-2 max-w-lg mt-8">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="px-4 py-2 text-sm rounded-full border border-white/[0.08] bg-white/[0.03] text-gray-300 hover:bg-violet-500/10 hover:border-violet-500/30 hover:text-violet-300 transition-all duration-200 cursor-pointer"
                  >
                    {s}
                  </button>
                ))}
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
                <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center text-xs font-bold shadow-lg shadow-violet-500/20">
                  AI
                </div>
              ) : (
                <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-white/[0.08] border border-white/[0.1] flex items-center justify-center text-xs font-bold text-gray-400">
                  U
                </div>
              )}

              {/* Bubble */}
              <div
                className={`max-w-2xl ${
                  msg.role === "user"
                    ? "bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20 border border-violet-500/20 rounded-2xl rounded-tr-md px-4 py-3"
                    : "space-y-4"
                }`}
              >
                {msg.role === "user" ? (
                  <p className="text-sm text-gray-100 leading-relaxed">
                    {msg.content}
                  </p>
                ) : (
                  <>
                    <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl rounded-tl-md px-5 py-4">
                      <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
                        {msg.content}
                      </p>
                    </div>

                    {/* Product cards */}
                    {msg.products && msg.products.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {msg.products.map((p, i) => (
                          <ProductCard key={i} product={p} />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}

          {/* Loading state */}
          {loading && <LoadingSkeleton />}
        </div>
      </main>

      {/* ── Input Bar ───────────────────────────── */}
      <footer className="flex-shrink-0 border-t border-white/[0.06] bg-[#0a0a0f]/80 backdrop-blur-xl">
        <form
          onSubmit={handleSubmit}
          className="max-w-4xl mx-auto px-4 sm:px-6 py-4"
        >
          <div className="flex items-center gap-3 bg-white/[0.04] border border-white/[0.08] rounded-2xl px-4 py-2 focus-within:border-violet-500/40 focus-within:bg-white/[0.06] transition-all duration-200">
            <input
              ref={inputRef}
              id="chat-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about products..."
              disabled={loading}
              className="flex-1 bg-transparent outline-none text-sm text-gray-100 placeholder:text-gray-600 disabled:opacity-50"
            />
            <button
              id="send-button"
              type="submit"
              disabled={loading || !input.trim()}
              className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center text-white disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-violet-500/25 active:scale-95 transition-all duration-200 cursor-pointer"
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
          <p className="text-[10px] text-gray-600 text-center mt-2 tracking-wide">
            Prices and availability may vary. Product information is synchronized in real-time from the store.
          </p>
        </form>
      </footer>
    </div>
  );
}
