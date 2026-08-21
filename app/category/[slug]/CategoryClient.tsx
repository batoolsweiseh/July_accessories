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
  inStock?: boolean;
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
    "أساور": "/images/asawer.png",
    "خاتم شبيه ذهب": "/images/WhatsApp Image 2026-07-18 at 11.52.28 PM.jpeg",
    "خاتم شبيه للذهب": "/images/WhatsApp Image 2026-07-18 at 11.52.28 PM.jpeg",
    "خاتم ماركة": "/images/khatam-markah.png",
    "سنسال": "/images/sansal.png",
    "حلق كبس": "/images/WhatsApp Image 2026-07-18 at 11.52.26 PM.jpeg",
    "حلق طويل": "/images/halq-taweel.png",
    "خلخال": "/images/anklet.png",
    "دبل": "/images/WhatsApp Image 2026-08-16 at 10.49.59 AM.jpeg",
    "أطقم أساور": "/images/WhatsApp Image 2026-07-18 at 11.52.27 PM.jpeg",
    "أساور سحب": "/images/asawer.png",
    "أطقم شبيه الذهب": "/images/atqam-shabih-markah.jpg",
    "أطقم شبيه ذهب": "/images/atqam-shabih-markah.jpg",
    "أطقم شبيه الماركة": "/images/atqam-shabih-markah.jpg",
    "أطقم شبيه ماركة": "/images/atqam-shabih-markah.jpg",
    "أطقم ماركات": "/images/atqam-markat.jpg",
    "أطقم ماركة": "/images/atqam-markat.jpg",
    "أطقم نواعم": "/images/atqam-nawaem.png",
    "حقائب صغيرة": "/images/bags.jpg",
    "حقائب متوسطة": "/images/medium-bags.png",
    "حقائب كبيرة": "/images/large-bags.jpg",
    "ساعات ماركة ستاتي": "/images/saat-markah-stati.png",
    "ساعات ماركة رجالي": "/images/saat-markah-rajali.png",
    "ساعات شبيه ماركة ستاتي": "/images/saat-stati.png",
    "ساعات شبيه ماركة رجالي": "/images/saat-rajali.png",
  };
  return map[subcategory];
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
  const [page, setPage] = useState<number>(1);
  const filterScrollerRef = useRef<HTMLDivElement | null>(null);
  const { addToCart } = useCart();

  const handleBuy = useCallback(async (product: Product) => {
    if (product.inStock === false) return;
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

  const PRODUCTS_PER_PAGE = 12;
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE));
  const paginatedProducts = filteredProducts.slice(
    (page - 1) * PRODUCTS_PER_PAGE,
    page * PRODUCTS_PER_PAGE
  );

  useEffect(() => {
    setPage(1);
  }, [selectedSubcategory]);

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
            const curatedImg = getSubcategoryImage(sub);
            const firstImg = products.find((p) => p.subcategory === sub && p.image && !p.image.includes("placeholder"))?.image || null;
            const subImg = curatedImg || firstImg || "/product-placeholder.png";
            return (
              <button
                key={sub}
                onClick={() => setSelectedSubcategory(sub === selectedSubcategory ? "" : sub)}
                className={`group flex w-[60px] min-w-[60px] h-[88px] flex-col items-center justify-between rounded-3xl border border-black/[0.08] bg-white overflow-hidden p-1 text-center transition-all duration-300 hover:border-[#E0457D] ${
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
                  <span className="block truncate text-[7px] sm:text-[8px] font-semibold text-charcoal">{sub}</span>
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
        <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8">
          {paginatedProducts.map((product) => (
            <article
              key={product.id}
              className="group relative flex w-full flex-col overflow-hidden rounded-xl border border-black/[0.08] bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5 hover:border-black/20"
            >
              {/* صورة المنتج */}
              <div className="relative aspect-square w-full overflow-hidden bg-[#FFF3F7] flex items-center justify-center">
                {/* شارات المنتج */}
                <div className="absolute top-2.5 right-2.5 flex flex-col gap-1 z-10" dir="rtl">
                  {product.inStock === false && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-neutral-900 text-white px-2 py-0.5 text-[7px] sm:text-[8px] font-bold uppercase tracking-wider shadow-lg">
                      نفدت الكمية
                    </span>
                  )}
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
                  className={`w-full h-full object-cover transition-transform duration-500 ${
                    product.inStock === false ? "opacity-60 grayscale-[30%]" : "group-hover:scale-105"
                  }`}
                  loading="lazy"
                  onError={(e) => { (e.target as HTMLImageElement).src = "/product-placeholder.png"; }}
                />
                <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/[0.03] to-transparent pointer-events-none" />
              </div>

              {/* تفاصيل المنتج */}
              <div className="flex flex-1 flex-col p-0.5">
                <h3 className="font-body text-[6px] font-medium text-charcoal line-clamp-2 leading-tight mb-1">
                  {product.name}
                </h3>
                <div className="mt-auto pt-1 border-t border-black/[0.04]">
                  <span className={`block font-mono text-[6px] font-bold mb-1.5 ${product.inStock === false ? 'text-black/40' : 'text-charcoal'}`}>
                    {product.price} ₪
                  </span>
                  <div className="flex items-center justify-between gap-1">
                    {product.inStock === false ? (
                      <div className="flex-1 text-center rounded-lg bg-neutral-200 text-neutral-500 text-[6px] font-bold py-1 select-none">
                        نفد
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleBuy(product)}
                        disabled={addingId === product.id}
                        className={`inline-flex h-4 flex-1 items-center justify-center rounded-lg text-[5px] font-semibold transition-all duration-200 active:scale-95 ${
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
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleFavorite(product.id);
                      }}
                      className={`inline-flex h-4 w-4 items-center justify-center rounded-lg border transition-all duration-200 ${
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

        {filteredProducts.length > PRODUCTS_PER_PAGE && (
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1}
              className="inline-flex items-center justify-center rounded-full border border-charcoal/20 bg-white px-3 py-2 text-[11px] font-semibold text-charcoal transition hover:bg-charcoal/5 disabled:opacity-40"
            >
              السابق
            </button>
            {Array.from({ length: totalPages }).map((_, index) => {
              const pageNumber = index + 1;
              return (
                <button
                  key={pageNumber}
                  type="button"
                  onClick={() => setPage(pageNumber)}
                  className={`inline-flex items-center justify-center rounded-full border px-3 py-2 text-[11px] font-semibold transition ${
                    pageNumber === page
                      ? 'border-[#E0457D] bg-[#E0457D] text-white'
                      : 'border-charcoal/20 bg-white text-charcoal hover:bg-charcoal/5'
                  }`}
                >
                  {pageNumber}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page === totalPages}
              className="inline-flex items-center justify-center rounded-full border border-charcoal/20 bg-white px-3 py-2 text-[11px] font-semibold text-charcoal transition hover:bg-charcoal/5 disabled:opacity-40"
            >
              التالي
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
