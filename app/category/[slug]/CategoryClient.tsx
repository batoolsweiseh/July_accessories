"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useCart } from "@/lib/useCart";

type Product = {
  id: string;
  name: string;
  price: number;
  subcategory: string;
  image: string;
  isFeatured?: boolean;
  isNew?: boolean;
  isTrending?: boolean;
};

function getFavorites(): string[] {
  try {
    const stored = window.localStorage.getItem("july-favorites");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveFavorites(ids: string[]) {
  try {
    window.localStorage.setItem("july-favorites", JSON.stringify(ids));
    window.dispatchEvent(new Event("july-favorites-changed"));
  } catch {
    // ignore
  }
}

function getSubcategoryImage(subcategory: string) {
  const map: Record<string, string> = {
    "أساور": "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?auto=format&fit=crop&w=800&q=80",
    "خاتم شبيه ذهب": "/images/WhatsApp Image 2026-07-18 at 11.52.28 PM.jpeg",
    "خاتم شبيه للذهب": "/images/WhatsApp Image 2026-07-18 at 11.52.28 PM.jpeg",
    "خاتم ماركة": "https://images.unsplash.com/photo-1540574163026-643ea20ade25?auto=format&fit=crop&w=800&q=80",
    "سنسال": "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=800&q=80",
    "حلق كبس": "/images/WhatsApp Image 2026-07-18 at 11.52.26 PM.jpeg",
    "حلق طويل": "https://images.unsplash.com/photo-1595433707802-6c4a033aa8da?auto=format&fit=crop&w=800&q=80",
    "خلخال": "https://images.unsplash.com/photo-1548911914-1c5dfa1e5046?auto=format&fit=crop&w=800&q=80",
    "دبل": "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?auto=format&fit=crop&w=800&q=80",
    "أطقم أساور": "/images/WhatsApp Image 2026-07-18 at 11.52.27 PM.jpeg",
    "أساور سحب": "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=800&q=80",
    "أطقم شبيه الذهب": "https://images.unsplash.com/photo-1548911914-1c5dfa1e5046?auto=format&fit=crop&w=800&q=80",
    "أطقم ماركات": "https://images.unsplash.com/photo-1511376777868-611b54f68947?auto=format&fit=crop&w=800&q=80",
    "أطقم نواعم": "https://images.unsplash.com/photo-1540574163026-643ea20ade25?auto=format&fit=crop&w=800&q=80",
    "حقائب صغيرة": "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=800&q=80",
    "حقائب متوسطة": "/images/medium-bags.png",
    "حقائب كبيرة": "/images/large-bags.jpg",
    "ساعات ماركة ستاتي": "https://images.unsplash.com/photo-1511381939415-4c0ac7b51760?auto=format&fit=crop&w=800&q=80",
    "ساعات ماركة رجالي": "https://images.unsplash.com/photo-1519337265831-281ec6cc8514?auto=format&fit=crop&w=800&q=80",
    "ساعات شبيه ماركة ستاتي": "https://images.unsplash.com/photo-1511381939415-4c0ac7b51760?auto=format&fit=crop&w=800&q=80",
    "ساعات شبيه ماركة رجالي": "https://images.unsplash.com/photo-1519337265831-281ec6cc8514?auto=format&fit=crop&w=800&q=80",
  };
  return map[subcategory] || "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?auto=format&fit=crop&w=800&q=80";
}

type CategoryClientProps = {
  categoryTitle: string;
  categorySubtitle: string;
  subcategories: string[];
  products: Product[];
};

export default function CategoryClient({
  categoryTitle,
  categorySubtitle,
  subcategories,
  products,
}: CategoryClientProps) {
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("");
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [doneId, setDoneId] = useState<string | null>(null);
  const filterScrollerRef = useRef<HTMLDivElement | null>(null);
  const { addToCart } = useCart();

  const handleBuy = useCallback(async (product: Product) => {
    if (addingId === product.id) return;
    setAddingId(product.id);
    await addToCart(product.id, 1, {
      id: product.id,
      name: product.name,
      price: product.price,
      image_url: product.image || "/product-placeholder.png",
      in_stock: true,
      category_slug: product.subcategory,
    });
    setAddingId(null);
    setDoneId(product.id);
    window.dispatchEvent(new Event("july-open-cart"));
    setTimeout(() => setDoneId(null), 2000);
  }, [addToCart, addingId]);

  useEffect(() => {
    const load = () => {
      setFavoriteIds(getFavorites());
    };
    load();
    window.addEventListener("july-favorites-changed", load);
    return () => window.removeEventListener("july-favorites-changed", load);
  }, []);

  const scrollFilters = (direction: "left" | "right") => {
    if (!filterScrollerRef.current) return;
    const offset = filterScrollerRef.current.clientWidth * 0.7;
    filterScrollerRef.current.scrollBy({
      left: direction === "left" ? -offset : offset,
      behavior: "smooth",
    });
  };

  const toggleFavorite = (productId: string) => {
    const current = getFavorites();
    const next = current.includes(productId)
      ? current.filter((id) => id !== productId)
      : [...current, productId];
    saveFavorites(next);
    setFavoriteIds(next);
  };

  // Filter products based on selected subcategory
  const filteredProducts =
    selectedSubcategory === ""
      ? products
      : products.filter((p) => p.subcategory === selectedSubcategory);

  return (
    <main className="min-h-screen bg-paper" dir="rtl">
      {/* ── زر الرجوع ── */}
      <div className="mx-auto max-w-7xl px-5 sm:px-8 pt-28 sm:pt-32">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-body text-sm text-charcoal/60 transition-colors hover:text-charcoal group"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-transform group-hover:translate-x-1"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
          الرئيسية
        </Link>
      </div>

      {/* ── هيدر الفئة ── */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8 pt-8 pb-6 text-center">
        <h1
          style={{ fontFamily: "'Lalezar', serif" }}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-charcoal leading-tight"
        >
          {categoryTitle}
        </h1>
        <p className="mt-2 font-mono text-[10px] sm:text-xs tracking-[0.2em] text-charcoal/50 uppercase">
          — {categorySubtitle} —
        </p>
        <div className="mx-auto mt-4 h-[2px] w-16 sm:w-20 bg-charcoal rounded-full" />
      </section>

      {/* ── أزرار الفلترة ── */}
      <section className="relative mx-auto max-w-7xl px-5 sm:px-8 py-6">
        <div className="absolute inset-y-0 left-0 flex items-center pl-1 sm:pl-2 z-20">
          <button
            type="button"
            onClick={() => scrollFilters("left")}
            aria-label="سابق"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-black/10 bg-white shadow-md transition hover:bg-neutral-50"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 5L7 9L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div
          ref={filterScrollerRef}
          className="no-scrollbar flex gap-1 overflow-x-auto pb-2 pl-8 pr-8"
        >
          {subcategories.map((sub) => {
            const firstImg = products.find((p) => p.subcategory === sub)?.image || null;
            const subImg = firstImg || getSubcategoryImage(sub);
            return (
              <button
                key={sub}
                onClick={() => setSelectedSubcategory(sub === selectedSubcategory ? "" : sub)}
                className={`group flex w-[80px] min-w-[80px] h-[120px] flex-col items-center justify-between rounded-3xl border border-black/[0.08] bg-white overflow-hidden p-1 text-center transition-all duration-300 hover:border-[#E0457D] ${
                  selectedSubcategory === sub ? "border-[#E0457D] shadow-md" : ""
                }`}
              >
                <div className="relative h-[72%] w-full overflow-hidden rounded-2xl bg-gray-100">
                  {subImg ? (
                    <Image
                      src={subImg}
                      alt={sub}
                      fill
                      className="object-cover"
                      unoptimized={subImg.startsWith("http")}
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100" />
                  )}
                </div>
                <div className="mt-1 w-full">
                  <span className="block truncate text-[8px] sm:text-[9px] font-semibold text-charcoal">{sub}</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="absolute inset-y-0 right-0 flex items-center pr-1 sm:pr-2 z-20">
          <button
            type="button"
            onClick={() => scrollFilters("right")}
            aria-label="التالي"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-black/10 bg-white shadow-md transition hover:bg-neutral-50"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M7 5L11 9L7 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </section>

      {/* ── شبكة المنتجات المفلوترة ── */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8 pt-10 pb-20 sm:pb-28">
        <div className="grid gap-2 grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
          {filteredProducts.map((product) => (
            <article
              key={product.id}
              className="group relative mx-auto flex w-full max-w-[110px] sm:max-w-[140px] flex-col overflow-hidden rounded-xl border border-black/[0.08] bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5 hover:border-black/20"
            >
              {/* صورة المنتج */}
              <div className="relative aspect-square w-full overflow-hidden bg-[#FFF3F7] flex items-center justify-center">
                {/* شارات المنتج */}
                <div className="absolute top-2.5 right-2.5 flex flex-col gap-1 z-10" dir="rtl">
                  {product.isFeatured && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-amber-900 shadow-lg shadow-amber-200/70">
                      <span className="text-[10px]">★</span> مميز
                    </span>
                  )}
                  {product.isNew && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-white via-emerald-200 to-emerald-500 px-2.5 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-emerald-950 shadow-lg shadow-emerald-200/50 ring-1 ring-white/80">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-700 shadow-inner" />
                      جديد
                    </span>
                  )}
                  {product.isTrending && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-white via-rose-200 to-rose-500 px-2.5 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-rose-950 shadow-lg shadow-rose-200/50 ring-1 ring-white/80">
                      <span className="h-2.5 w-2.5 rounded-full bg-rose-600 shadow-inner" />
                      ترند
                    </span>
                  )}
                </div>

                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={product.image || "/product-placeholder.png"}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                  onError={(e) => { (e.target as HTMLImageElement).src = "/product-placeholder.png"; }}
                />
                <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/[0.03] to-transparent pointer-events-none" />
              </div>

              {/* تفاصيل المنتج */}
              <div className="flex flex-1 flex-col p-2">
                <h3 className="font-body text-[9px] font-medium text-charcoal line-clamp-2 leading-tight mb-1">
                  {product.name}
                </h3>
                <div className="mt-auto pt-1.5 border-t border-black/[0.04]">
                  <span className="block font-mono text-[9px] font-bold text-charcoal mb-1.5">
                    {product.price} ₪
                  </span>
                  <div className="flex items-center justify-between gap-1">
                    <button
                      type="button"
                      onClick={() => handleBuy(product)}
                      disabled={addingId === product.id}
                      className={`inline-flex h-7 flex-1 items-center justify-center rounded-lg text-[9px] font-semibold transition-all duration-200 active:scale-95 ${
                        doneId === product.id
                          ? 'bg-green-500 text-white'
                          : 'bg-charcoal text-white hover:bg-neutral-800'
                      } disabled:opacity-60`}
                    >
                      {addingId === product.id ? (
                        <svg className="animate-spin" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
                        </svg>
                      ) : doneId === product.id ? (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      ) : "اشتري"}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleFavorite(product.id);
                      }}
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border transition-all duration-200 ${
                        favoriteIds.includes(product.id)
                          ? 'bg-white text-[#E0457D] border-[#E0457D]'
                          : 'bg-white text-charcoal border-black/10 hover:border-[#E0457D]'
                      }`}
                      aria-label={favoriteIds.includes(product.id) ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
                    >
                      <i className={`${favoriteIds.includes(product.id) ? 'fa-solid' : 'fa-regular'} fa-heart text-[8px]`} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* رسالة في حال عدم وجود منتجات */}
        {filteredProducts.length === 0 && (
          <div className="text-center py-20">
            <p className="text-charcoal/50 text-sm sm:text-base">
              لا توجد منتجات في هذا القسم حالياً.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
