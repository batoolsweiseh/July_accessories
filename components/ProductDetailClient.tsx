"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/lib/useCart";
import ImageLightbox from "@/components/ImageLightbox";
import { ProductPiece } from "@/lib/productVariants";

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
  hasColors?: boolean;
  pieces?: ProductPiece[];
};

export default function ProductDetailClient({ product }: { product: Product }) {
  const [adding, setAdding] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedPiece, setSelectedPiece] = useState<ProductPiece | null>(
    product.pieces && product.pieces.length > 0 ? product.pieces[0] : null
  );
  const [selectedColor, setSelectedColor] = useState<"ذهبي" | "فضي">("ذهبي");
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCart();

  const handleSelectPiece = (piece: ProductPiece) => {
    setSelectedPiece(piece);
  };

  const defaultNumericPrice = parseFloat(product.price.replace(/[^\d.]/g, "")) || 0;
  const currentPrice = selectedPiece ? selectedPiece.price : defaultNumericPrice;

  // خيارات الألوان للقطعة المحددة أو للمنتج
  const showColors = selectedPiece
    ? !!selectedPiece.hasColors
    : !!product.hasColors;

  const handleAddToCart = async () => {
    if (product.inStock === false) return;
    setAdding(true);
    try {
      const finalPrice = currentPrice;
      const finalName =
        selectedPiece && selectedPiece.name !== product.name
          ? `${product.name} (${selectedPiece.name})`
          : product.name;

      const colorToSave = showColors ? selectedColor : undefined;

      const pieceSuffix = selectedPiece ? `-${selectedPiece.name}` : "";
      const customCartId = `${product.id}${pieceSuffix}`;

      await addToCart(
        customCartId,
        quantity,
        {
          id: customCartId,
          name: finalName,
          price: finalPrice,
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
                    <circle cx="60" cy="60" r="38" stroke="#9DA3A8" strokeWidth="8" />
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
            <h1 className="font-display text-4xl text-charcoal sm:text-5xl leading-tight mb-3">
              {product.name}
            </h1>

            {/* السعر */}
            <div className="flex items-center gap-3 mb-6">
              <p className="font-mono text-3xl font-bold text-[#00875a]">
                {currentPrice} ₪
              </p>
              {selectedPiece && (
                <span className="text-xs text-neutral-500 font-bold bg-neutral-100 px-2.5 py-1 rounded-lg border border-black/5">
                  ({selectedPiece.name})
                </span>
              )}
            </div>

            {/* ── اختيار القطعة أو الطقم المنفرد ── */}
            {product.pieces && product.pieces.length > 0 && (
              <div className="mb-6 space-y-2.5 p-4 rounded-2xl bg-neutral-50 border border-black/5">
                <div className="flex items-center justify-between text-sm font-bold text-neutral-900">
                  <span>اختر الصنف / القطعة:</span>
                  <span className="text-[#00875a] font-extrabold text-sm">
                    {selectedPiece?.name}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {product.pieces.map((piece, idx) => {
                    const isSelected = selectedPiece?.name === piece.name;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectPiece(piece)}
                        className={`flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-all duration-200 active:scale-95 ${
                          isSelected
                            ? "border-[#00875a] bg-[#00875a]/10 text-[#00875a] ring-2 ring-[#00875a]/25 shadow-sm"
                            : "border-black/15 bg-white text-neutral-700 hover:border-black/30"
                        }`}
                      >
                        <span>{piece.name}</span>
                        <span
                          className={`font-mono px-2 py-0.5 rounded text-[11px] font-black ${
                            isSelected ? "bg-[#00875a] text-white" : "bg-neutral-100 text-neutral-800"
                          }`}
                        >
                          {piece.price} ₪
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── اختيار اللون مع صور مصغرة ── */}
            {showColors && (
              <div className="mb-6 space-y-2.5">
                <div className="flex items-center justify-between text-sm font-bold text-neutral-900">
                  <span>اختر اللون:</span>
                  <span className="text-[#00875a] font-extrabold text-base">
                    {selectedColor === "ذهبي" ? "ذهبي (Gold)" : "فضي (Silver)"}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {/* بطاقة ذهبي */}
                  <button
                    type="button"
                    onClick={() => setSelectedColor("ذهبي")}
                    className={`group relative flex flex-col items-center w-24 rounded-2xl overflow-hidden border-2 transition-all duration-200 p-1 bg-white ${
                      selectedColor === "ذهبي"
                        ? "border-[#00875a] ring-2 ring-[#00875a]/25 shadow-lg scale-105"
                        : "border-black/15 hover:border-black/30 opacity-75 hover:opacity-100"
                    }`}
                  >
                    <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-neutral-100 mb-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={product.image || "/product-placeholder.png"}
                        alt="ذهبي"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/product-placeholder.png";
                        }}
                      />
                      <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-amber-600 via-amber-400 to-amber-200 border border-amber-600/40 shadow-sm" />
                    </div>
                    <span className={`text-xs font-bold ${selectedColor === "ذهبي" ? "text-[#00875a]" : "text-neutral-700"}`}>
                      ذهبي
                    </span>
                    {selectedColor === "ذهبي" && (
                      <span className="absolute top-1.5 left-1.5 h-4 w-4 rounded-full bg-[#00875a] text-white flex items-center justify-center text-[9px] font-black shadow-sm">
                        ✓
                      </span>
                    )}
                  </button>

                  {/* بطاقة فضي */}
                  <button
                    type="button"
                    onClick={() => setSelectedColor("فضي")}
                    className={`group relative flex flex-col items-center w-24 rounded-2xl overflow-hidden border-2 transition-all duration-200 p-1 bg-white ${
                      selectedColor === "فضي"
                        ? "border-[#00875a] ring-2 ring-[#00875a]/25 shadow-lg scale-105"
                        : "border-black/15 hover:border-black/30 opacity-75 hover:opacity-100"
                    }`}
                  >
                    <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-neutral-100 mb-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={product.image || "/product-placeholder.png"}
                        alt="فضي"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/product-placeholder.png";
                        }}
                      />
                      <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-slate-400 via-slate-200 to-white border border-slate-400/40 shadow-sm" />
                    </div>
                    <span className={`text-xs font-bold ${selectedColor === "فضي" ? "text-[#00875a]" : "text-neutral-700"}`}>
                      فضي
                    </span>
                    {selectedColor === "فضي" && (
                      <span className="absolute top-1.5 left-1.5 h-4 w-4 rounded-full bg-[#00875a] text-white flex items-center justify-center text-[9px] font-black shadow-sm">
                        ✓
                      </span>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* الوصف */}
            <p className="mb-6 text-base leading-relaxed text-charcoal">
              {product.fullDesc}
            </p>

            {/* المواصفات */}
            {product.specs && product.specs.length > 0 && (
              <div className="mb-6 rounded-2xl border border-steel/20 bg-paper-2 p-6">
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

            {/* التحكم بالكمية والزر */}
            <div className="flex flex-col gap-3">
              {product.inStock === false ? (
                <div className="w-full py-4 rounded-2xl bg-neutral-200 text-neutral-500 text-base font-bold flex items-center justify-center gap-2 cursor-not-allowed select-none">
                  <span>🚫</span>
                  نفدت الكمية — غير متوفر حالياً
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  {/* عداد الكمية (- 1 +) */}
                  <div className="flex items-center border-2 border-black/15 rounded-2xl bg-white px-3 py-1.5 h-14">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="h-9 w-9 flex items-center justify-center rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-sm transition-colors active:scale-95"
                    >
                      -
                    </button>
                    <span className="w-12 text-center font-bold text-base font-mono text-neutral-900">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => q + 1)}
                      className="h-9 w-9 flex items-center justify-center rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-sm transition-colors active:scale-95"
                    >
                      +
                    </button>
                  </div>

                  {/* زر الشراء الأخضر */}
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={adding}
                    className="flex-1 h-14 rounded-2xl bg-[#00875a] hover:bg-[#00704a] text-white text-base font-bold transition-all shadow-lg flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="9" cy="21" r="1" />
                      <circle cx="20" cy="21" r="1" />
                      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                    </svg>
                    <span>
                      {adding
                        ? "جاري الإضافة..."
                        : `شراء هذا الصنف (${(currentPrice * quantity).toFixed(0)} ₪)`}
                    </span>
                  </button>
                </div>
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
