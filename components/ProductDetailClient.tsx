"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/lib/useCart";
import ImageLightbox from "@/components/ImageLightbox";
import { supportsColorChoice, ProductColor } from "@/lib/productUtils";

type Product = {
  id: number | string;
  name: string;
  price: string;
  category: string;
  inStock?: boolean;
  isNew?: boolean;
  desc: string;
  fullDesc: string;
  specs: { label: string; value: string }[];
  image?: string;
  whatsapp: string;
};

export default function ProductDetailClient({ product }: { product: Product }) {
  const [adding, setAdding] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState<ProductColor>("ذهبي");
  const { addToCart } = useCart();

  const hasColorChoice = supportsColorChoice(product.category);

  const handleAddToCart = async () => {
    if (product.inStock === false) return;
    setAdding(true);
    try {
      const numericPrice = parseFloat(product.price.replace(/[^\d.]/g, ""));
      const colorToSave = hasColorChoice ? selectedColor : undefined;
      await addToCart(
        product.id,
        1,
        {
          id: String(product.id),
          name: product.name,
          price: isNaN(numericPrice) ? 0 : numericPrice,
          image_url: product.image || null,
          category_slug: product.category,
          in_stock: true,
          selectedColor: colorToSave,
        },
        colorToSave
      );
      // Open the cart drawer
      window.dispatchEvent(new Event("july-open-cart"));
    } catch (err) {
      console.error("Error adding to cart:", err);
    } finally {
      setAdding(false);
    }
  };

  return (
    <main className="min-h-screen bg-paper">
      {/* Breadcrumb */}
      <div className="border-b border-steel/10 bg-paper-2 py-3">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <nav className="flex items-center gap-2 text-sm text-charcoal">
            <Link href="/" className="hover:text-charcoal transition-colors">الرئيسية</Link>
            <span>/</span>
            <Link href="/#products" className="hover:text-charcoal transition-colors">تشكيلتنا</Link>
            <span>/</span>
            <span className="text-charcoal">{product.name}</span>
          </nav>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-2">
          {/* صورة المنتج */}
          <div className="relative flex justify-center items-start">
            <div
              className="sticky top-24 overflow-hidden rounded-3xl border border-steel/20 bg-paper-2 w-full max-w-md aspect-square relative flex items-center justify-center shadow-md cursor-zoom-in group"
              onClick={() => product.image && setLightboxOpen(true)}
            >
              {product.image ? (
                <>
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, 448px"
                    priority
                  />
                  {/* zoom icon overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/10">
                    <span className="bg-white/90 backdrop-blur-sm rounded-full p-3 shadow-lg">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        <line x1="11" y1="8" x2="11" y2="14" />
                        <line x1="8" y1="11" x2="14" y2="11" />
                      </svg>
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-4 p-6">
                  <svg viewBox="0 0 120 120" className="h-24 w-24" fill="none" aria-hidden>
                    {product.category === "حلقان" && (
                      <>
                        <circle cx="60" cy="60" r="38" stroke="#9DA3A8" strokeWidth="8" />
                        <circle cx="60" cy="60" r="28" stroke="#D1D5DB" strokeWidth="3" strokeDasharray="6 4" />
                      </>
                    )}
                    {product.category === "سناسل" && (
                      [0, 1, 2, 3, 4, 5].map((i) => (
                        <ellipse key={i} cx={10 + i * 20} cy="60" rx="12" ry="8" stroke="#9DA3A8" strokeWidth="4" />
                      ))
                    )}
                    {product.category === "خواتم" && (
                      <>
                        <circle cx="60" cy="60" r="34" stroke="#9DA3A8" strokeWidth="10" />
                        <circle cx="60" cy="26" r="7" fill="#000000" />
                      </>
                    )}
                    {product.category === "ساعات" && (
                      <>
                        <rect x="25" y="20" width="70" height="80" rx="18" stroke="#9DA3A8" strokeWidth="5" />
                        <circle cx="60" cy="60" r="24" stroke="#D1D5DB" strokeWidth="3" />
                        <line x1="60" y1="60" x2="60" y2="40" stroke="#000000" strokeWidth="3" strokeLinecap="round" />
                        <line x1="60" y1="60" x2="76" y2="60" stroke="#4B5563" strokeWidth="2.5" strokeLinecap="round" />
                        <rect x="40" y="5" width="40" height="16" rx="6" stroke="#9DA3A8" strokeWidth="3" />
                        <rect x="40" y="99" width="40" height="16" rx="6" stroke="#9DA3A8" strokeWidth="3" />
                      </>
                    )}
                  </svg>
                  <p className="font-mono text-[10px] text-charcoal tracking-widest text-center">JULY ACCESSORIES</p>
                </div>
              )}
              {product.isNew && (
                <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-emerald-50 via-emerald-100 to-emerald-200 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-emerald-950 shadow-md ring-1 ring-white/70">
                  <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-700" />
                  جديد
                </span>
              )}
            </div>
          </div>

          {/* تفاصيل المنتج */}
          <div className="flex flex-col justify-center" dir="rtl">
            {/* الفئة */}
            <p className="mb-3 font-mono text-xs tracking-widest text-charcoal">
              — {product.category} —
            </p>

            {/* الاسم */}
            <h1 className="font-display text-4xl text-charcoal sm:text-5xl leading-tight mb-4">
              {product.name}
            </h1>

            {/* السعر */}
            <p className="mb-6 font-mono text-3xl font-bold text-charcoal">
              {product.price}
            </p>

            {/* الوصف */}
            <p className="mb-8 text-base leading-relaxed text-charcoal">
              {product.fullDesc}
            </p>

            {/* المواصفات */}
            {product.specs && product.specs.length > 0 && (
              <div className="mb-8 rounded-2xl border border-steel/20 bg-paper-2 p-6">
                <h2 className="mb-4 font-display text-lg text-charcoal">المواصفات</h2>
                <dl className="space-y-3">
                  {product.specs.map((s) => (
                    <div key={s.label} className="flex items-center justify-between border-b border-steel/10 pb-3 last:border-0 last:pb-0">
                      <dt className="text-sm text-charcoal">{s.label}</dt>
                      <dd className="text-sm font-medium text-charcoal">{s.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {/* اختيار اللون (ذهبي / فضي) */}
            {hasColorChoice && (
              <div className="mb-8 rounded-2xl border border-steel/20 bg-paper-2 p-5">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-bold text-charcoal flex items-center gap-1.5">
                    <span>اختر اللون:</span>
                    <span className="text-[#E0457D] font-extrabold">{selectedColor}</span>
                  </label>
                  <span className="text-[11px] text-charcoal/50">متوفر بلونين</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedColor("ذهبي")}
                    className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl border-2 transition-all duration-200 font-bold text-sm ${
                      selectedColor === "ذهبي"
                        ? "border-amber-500 bg-amber-50/90 text-amber-950 shadow-md scale-[1.02]"
                        : "border-steel/20 bg-white text-charcoal hover:border-steel/40"
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-gradient-to-tr from-amber-600 via-amber-400 to-amber-200 border border-amber-600/40 shadow-sm inline-block" />
                    <span>ذهبي (Gold)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedColor("فضي")}
                    className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl border-2 transition-all duration-200 font-bold text-sm ${
                      selectedColor === "فضي"
                        ? "border-slate-500 bg-slate-100 text-slate-900 shadow-md scale-[1.02]"
                        : "border-steel/20 bg-white text-charcoal hover:border-steel/40"
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-gradient-to-tr from-slate-400 via-slate-200 to-white border border-slate-400/40 shadow-sm inline-block" />
                    <span>فضي (Silver)</span>
                  </button>
                </div>
              </div>
            )}

            {/* مميزات ستانلس */}
            <div className="mb-8 flex flex-wrap gap-2">
              {["ضد الصدأ", "ضد الماء", "ضد العرق", "آمن على البشرة"].map((tag) => (
                <span key={tag} className="rounded-full border border-steel/20 bg-white px-4 py-1.5 text-xs font-medium text-charcoal">
                  ✦ {tag}
                </span>
              ))}
            </div>

            {/* زر إضافة للسلة */}
            <div className="flex flex-col gap-3">
              {product.inStock === false ? (
                <div className="w-full py-4 rounded-2xl bg-neutral-200 text-neutral-500 text-base font-bold flex items-center justify-center gap-2 cursor-not-allowed select-none">
                  <span>🚫</span>
                  نفدت الكمية — غير متوفر حالياً
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={adding}
                  className="w-full py-4 rounded-2xl bg-black text-white text-base font-semibold transition hover:bg-neutral-800 active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-black/10 hover:shadow-xl disabled:opacity-50"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="9" cy="21" r="1" />
                    <circle cx="20" cy="21" r="1" />
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                  </svg>
                  {adding ? "جاري الإضافة..." : "إضافة للسلة"}
                </button>
              )}
            </div>

            {/* رجوع */}
            <Link
              href="/#products"
              className="mt-6 text-center text-sm text-charcoal hover:text-charcoal transition-colors"
            >
              ← العودة للتشكيلة
            </Link>
          </div>
        </div>
      </div>

      {/* Lightbox - تكبير الصورة */}
      <ImageLightbox
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        src={product.image || ""}
        alt={product.name}
        title={product.name}
        price={product.price}
      />
    </main>
  );
}
