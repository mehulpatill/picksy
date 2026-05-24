"use client";

import { useState, useEffect, FormEvent } from "react";
import Link from "next/link";

interface Product {
  product_id: string;
  product_name: string;
  brand: string | null;
  category_name: string | null;
  final_price: number | null;
  rating: number | null;
  review_count: number | null;
  available_for_delivery: boolean | null;
  description: string | null;
}

interface Stats {
  total_products: number;
  categories: string[];
  avg_rating: number | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

export default function AdminPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [adminKey, setAdminKey] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Product>>({});

  useEffect(() => {
    // Try to load key from local storage on mount
    const saved = localStorage.getItem("adminKey");
    if (saved) setAdminKey(saved);
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${API_URL}/products?search=${search}&page_size=50`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/products/stats`);
      if (res.ok) {
        setStats(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveAdminKey = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setAdminKey(val);
    localStorage.setItem("adminKey", val);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      const res = await fetch(`${API_URL}/products/${id}`, {
        method: "DELETE",
        headers: { "X-Admin-Key": adminKey },
      });
      if (res.ok) {
        fetchProducts();
        fetchStats();
      } else {
        alert("Failed to delete. Check your Admin Key.");
      }
    } catch (e) {
      console.error(e);
      alert("Error deleting product.");
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData({
      product_id: `prod_${Date.now()}`, // auto-generate if new
      available_for_delivery: false,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingId(product.product_id);
    setFormData(product);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const method = editingId ? "PUT" : "POST";
    const url = editingId
      ? `${API_URL}/products/${editingId}`
      : `${API_URL}/products`;

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchProducts();
        fetchStats();
      } else {
        const err = await res.json();
        alert(`Error: ${err.detail}`);
      }
    } catch (e) {
      console.error(e);
      alert("Network error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#0a0a0f] text-gray-100">
      <header className="flex-shrink-0 border-b border-white/[0.06] bg-[#0a0a0f]/80 backdrop-blur-xl z-10 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="w-10 h-10 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center hover:bg-white/[0.08] transition-colors"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Admin Dashboard</h1>
            <p className="text-xs text-gray-500">Manage Products & Inventory</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <input
            type="password"
            placeholder="Admin API Key"
            value={adminKey}
            onChange={handleSaveAdminKey}
            className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2 text-sm focus:border-fuchsia-500/50 outline-none w-64"
          />
          <button
            onClick={openAddModal}
            className="bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 shadow-lg shadow-violet-500/20"
          >
            + Add Product
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        {stats && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6">
              <div className="text-sm text-gray-500 mb-1">Total Products</div>
              <div className="text-3xl font-bold text-white">{stats.total_products}</div>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6">
              <div className="text-sm text-gray-500 mb-1">Categories</div>
              <div className="text-3xl font-bold text-white">{stats.categories.length}</div>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6">
              <div className="text-sm text-gray-500 mb-1">Avg Rating</div>
              <div className="text-3xl font-bold text-white">{stats.avg_rating ?? "N/A"}</div>
            </div>
          </div>
        )}

        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-white/[0.06]">
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2 text-sm focus:border-violet-500/50 outline-none w-full max-w-md"
            />
          </div>
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="bg-white/[0.02] text-gray-500 uppercase text-xs font-semibold">
              <tr>
                <th className="px-6 py-4">Product Name</th>
                <th className="px-6 py-4">Brand</th>
                <th className="px-6 py-4">Price</th>
                <th className="px-6 py-4">Rating</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {products.map((p) => (
                <tr key={p.product_id} className="hover:bg-white/[0.02]">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-200 line-clamp-1">{p.product_name}</div>
                    <div className="text-xs text-gray-500">{p.category_name}</div>
                  </td>
                  <td className="px-6 py-4">{p.brand || "-"}</td>
                  <td className="px-6 py-4 font-medium text-emerald-400">${p.final_price}</td>
                  <td className="px-6 py-4">{p.rating ? `${p.rating} ⭐` : "-"}</td>
                  <td className="px-6 py-4 text-right space-x-3">
                    <button onClick={() => openEditModal(p)} className="text-violet-400 hover:text-violet-300">Edit</button>
                    <button onClick={() => handleDelete(p.product_id)} className="text-red-400 hover:text-red-300">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#12121a] border border-white/[0.1] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-white/[0.06] flex items-center justify-between">
              <h2 className="text-xl font-bold">{editingId ? "Edit Product" : "Add Product"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-300">✕</button>
            </div>
            
            <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Product ID (Unique)</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingId} // can't change ID if editing
                    value={formData.product_id || ""}
                    onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2 text-sm disabled:opacity-50 outline-none"
                  />
                </div>
                
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Product Name</label>
                  <input
                    type="text"
                    required
                    value={formData.product_name || ""}
                    onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2 text-sm focus:border-violet-500/50 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Brand</label>
                  <input
                    type="text"
                    value={formData.brand || ""}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2 text-sm focus:border-violet-500/50 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Category</label>
                  <input
                    type="text"
                    value={formData.category_name || ""}
                    onChange={(e) => setFormData({ ...formData, category_name: e.target.value })}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2 text-sm focus:border-violet-500/50 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.final_price || ""}
                    onChange={(e) => setFormData({ ...formData, final_price: parseFloat(e.target.value) || null })}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2 text-sm focus:border-violet-500/50 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Rating (0-5)</label>
                  <input
                    type="number"
                    step="0.1"
                    max="5"
                    value={formData.rating || ""}
                    onChange={(e) => setFormData({ ...formData, rating: parseFloat(e.target.value) || null })}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2 text-sm focus:border-violet-500/50 outline-none"
                  />
                </div>
                
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Description (Will be embedded automatically!)</label>
                  <textarea
                    rows={4}
                    value={formData.description || ""}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2 text-sm focus:border-violet-500/50 outline-none resize-none"
                  />
                </div>

                <div className="col-span-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="delivery"
                    checked={formData.available_for_delivery || false}
                    onChange={(e) => setFormData({ ...formData, available_for_delivery: e.target.checked })}
                    className="w-4 h-4 accent-violet-500"
                  />
                  <label htmlFor="delivery" className="text-sm">Available for delivery</label>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold hover:bg-white/[0.04]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-violet-600 text-white px-6 py-2 rounded-xl text-sm font-semibold hover:bg-violet-500 disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Save Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
