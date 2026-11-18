"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";

export interface PosProduct {
  id: string;
  name: string;
  price: number;
  category_slug?: string;
  subcategory_id?: string;
  image_url?: string | null;
  in_stock?: boolean;
}

interface PosCatalogProps {
  onAddToCart: (product: PosProduct) => void;
}

const CATEGORIES = [
  { slug: "all", label: "الكل" },
  { slug: "accessories", label: "إكسسوارات" },
  { slug: "sets", label: "أطقم" },
  { slug: "bags", label: "شنط" },
  { slug: "watches", label: "ساعات" },
];

export default function PosCatalog({ onAddToCart }: PosCatalogProps) {
  const [products, setProducts] = useState<PosProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  useEffect(() => {
    async function loadProducts() {
      setLoading(true);
      try {
        const res = await fetch("/api/pos/products");
        const json = await res.json();
        if (json.success) {
          setProducts(json.data || []);
        }
      } catch (err) {
        console.error("Failed to load products for POS:", err);
      } finally {
        setLoading(false);
      }
    }
    loadProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat =
        activeCategory === "all" || p.category_slug === activeCategory;
      const matchQuery =
        !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
      return matchCat && matchQuery;
    });
  }, [products, activeCategory, searchQuery]);

  return (
    <div className="flex flex-col h-full bg-[#FAF8F5] border-l border-[#E6E0D8]">
      {/* ─── Search and Category Filter Bar ─── */}
      <div className="p-4 bg-white border-b border-[#E6E0D8] space-y-3 sticky top-0 z-10 shadow-sm">
        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث عن اسم القطعة أو الكود..."
            className="w-full pl-4 pr-10 py-2.5 text-sm rounded-xl border border-[#D8CFC5] bg-[#FDFBF9] text-[#3A302B] focus:outline-none focus:ring-2 focus:ring-[#E0457D] focus:border-transparent transition-all placeholder:text-gray-400"
          />
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs bg-gray-200 rounded-full w-5 h-5 flex items-center justify-center"
            >
              ✕
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.slug;
            return (
              <button
                key={cat.slug}
                onClick={() => setActiveCategory(cat.slug)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-[#3A302B] text-white shadow-sm"
                    : "bg-[#F3EFEA] text-[#6E645D] hover:bg-[#EBE5DE]"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Product Grid ─── */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-3">
            <div className="w-8 h-8 border-2 border-gray-300 border-t-[#E0457D] rounded-full animate-spin" />
            <p className="text-sm">جاري تحميل المنتجات...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-2">
            <svg
              className="w-12 h-12 stroke-current text-gray-300"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
            <p className="text-sm">لم يتم العثور على أي منتج مطابق</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredProducts.map((p) => {
              const inStock = p.in_stock !== false;
              return (
                <button
                  key={p.id}
                  onClick={() => onAddToCart(p)}
                  className="group relative flex flex-col bg-white rounded-xl border border-[#E8E2D9] overflow-hidden text-right shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:border-[#D0C4B6] hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
                >
                  {/* Image container */}
                  <div className="relative w-full aspect-square bg-[#F7F4F0] overflow-hidden">
                    {p.image_url ? (
                      <Image
                        src={p.image_url}
                        alt={p.name}
                        fill
                        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">
                        لا توجد صورة
                      </div>
                    )}

                    {/* Stock badge */}
                    {!inStock && (
                      <div className="absolute top-1.5 right-1.5 bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded font-medium shadow-sm">
                        نفذ
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-2.5 flex flex-col justify-between flex-1">
                    <h3 className="text-xs sm:text-sm font-semibold text-[#3A302B] line-clamp-2 leading-snug group-hover:text-[#E0457D] transition-colors">
                      {p.name}
                    </h3>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-sm font-bold text-[#E0457D]">
                        {Number(p.price).toFixed(0)} ₪
                      </span>
                      <span className="text-[10px] text-gray-400 group-hover:text-gray-600">
                        + إضافة
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
