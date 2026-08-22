"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { useCart } from "@/lib/useCart";
import { ProductPiece } from "@/lib/productVariants";

export type QuickViewProduct = {
  id: string | number;
  name: string;
  price: number | string;
  image: string;
  category?: string;
  description?: string;
  inStock?: boolean;
  isFeatured?: boolean;
  isNew?: boolean;
  isTrending?: boolean;
  hasColors?: boolean;
  pieces?: ProductPiece[];
};

interface ProductQuickViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: QuickViewProduct | null;
  onToggleFavorite?: (id: string | number) => void;
  isFavorite?: boolean;
}

export default function ProductQuickViewModal({
  isOpen,
  onClose,
  product,
  onToggleFavorite,
  isFavorite = false,
}: ProductQuickViewModalProps) {
  const [mounted, setMounted] = useState(false);
  const [selectedColor, setSelectedColor] = useState<"ذهبي" | "فضي">("ذهبي");
  const [selectedPiece, setSelectedPiece] = useState<ProductPiece | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [fav, setFav] = useState(isFavorite);
  const { addToCart } = useCart();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen && product) {
      setQuantity(1);
      setSelectedColor("ذهبي");
      setFav(isFavorite);
      if (product.pieces && product.pieces.length > 0) {
        setSelectedPiece(product.pieces[0]);
      } else {
        setSelectedPiece(null);
      }
    }
  }, [isOpen, isFavorite, product]);

  // إغلاق بـ Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleFavoriteClick = () => {
    setFav(!fav);
    if (product && onToggleFavorite) {
      onToggleFavorite(product.id);
    }
  };

  if (!mounted || !isOpen || !product) return null;

  const defaultNumericPrice =
    typeof product.price === "number"
      ? product.price
      : parseFloat(String(product.price).replace(/[^\d.]/g, "")) || 0;

  const currentPrice = selectedPiece ? selectedPiece.price : defaultNumericPrice;

  // هل تتوفر خيارات ألوان للقطعة الحالية أو للمنتج
  const showColors = selectedPiece
    ? !!selectedPiece.hasColors
    : !!product.hasColors;

  const handleAddToCart = async () => {
    if (!product || product.inStock === false) return;
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
          image_url: product.image || "/product-placeholder.png",
          in_stock: true,
          category_slug: product.category || "",
          selectedColor: colorToSave,
        },
        colorToSave
      );

      // إغلاق المودال وفتح دروج السلة
      onClose();
      window.dispatchEvent(new Event("july-open-cart"));
    } catch (err) {
      console.error("Error adding to cart:", err);
    } finally {
      setAdding(false);
    }
  };

  return createPortal(
    <div
      dir="rtl"
      className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md sm:max-w-lg rounded-[28px] sm:rounded-[32px] bg-white border border-black/10 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[88vh] animate-in zoom-in-95 duration-200 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* زر الإغلاق العلوي */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-5 pt-3.5 pb-2.5 sm:pt-4 sm:pb-3 border-b border-black/5">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#E0457D] animate-pulse" />
            <h2
              style={{ fontFamily: "'Lalezar', serif" }}
              className="text-base sm:text-xl text-neutral-900 leading-tight"
            >
              مواصفات وطلب المنتج
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* محتوى المودال القابل للتمرير */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-3 sm:py-4 space-y-3.5 bg-[#fffcfd]">
          {/* صورة المنتج الرئيسية */}
          <div className="relative aspect-[4/3] sm:aspect-square max-h-[220px] sm:max-h-[280px] w-full rounded-2xl overflow-hidden bg-neutral-900 border border-black/10 shadow-sm flex items-center justify-center">
            {/* بادج (الأكثر طلباً / جديد / مميز) */}
            <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5 z-10">
              {product.isTrending && (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 text-white px-2.5 py-0.5 text-[9px] sm:text-[10px] font-bold shadow-md">
                  🔥 الأكثر طلباً
                </span>
              )}
              {product.isNew && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 text-white px-2.5 py-0.5 text-[9px] sm:text-[10px] font-bold shadow-md">
                  ✦ جديد
                </span>
              )}
              {product.isFeatured && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 text-white px-2.5 py-0.5 text-[9px] sm:text-[10px] font-bold shadow-md">
                  ★ مميز
                </span>
              )}
            </div>

            {/* شارة اللون المختار في زاوية الصورة (تظهر فقط إذا كان هناك ألوان) */}
            {showColors && (
              <div className="absolute bottom-2.5 right-2.5 bg-black/80 backdrop-blur-md text-white text-[10px] sm:text-[11px] font-bold px-2.5 py-1 rounded-full shadow-md z-10 flex items-center gap-1.5 border border-white/10">
                {selectedColor === "ذهبي" ? (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-amber-600 via-amber-400 to-amber-200 border border-amber-300 shadow-sm flex-shrink-0" />
                    <span>ذهبي</span>
                  </>
                ) : (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-slate-400 via-slate-200 to-white border border-slate-300 shadow-sm flex-shrink-0" />
                    <span>فضي</span>
                  </>
                )}
              </div>
            )}

            {/* الصورة */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={product.image || "/product-placeholder.png"}
              alt={product.name}
              className="w-full h-full object-contain transition-transform duration-500 hover:scale-105"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/product-placeholder.png";
              }}
            />
          </div>

          {/* شريط السعر + المفضلة + اسم المنتج */}
          <div className="flex items-start justify-between gap-3 pt-0.5 border-b border-black/5 pb-2.5">
            <div className="space-y-0.5">
              <h3 className="text-sm sm:text-base font-bold text-neutral-900 leading-snug">
                {product.name}
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-500 font-semibold">السعر:</span>
                <span className="text-xl sm:text-2xl font-black text-[#00875a] font-mono">
                  {currentPrice} ₪
                </span>
                {selectedPiece && (
                  <span className="text-xs text-neutral-500 font-bold bg-neutral-100 px-2 py-0.5 rounded-lg border border-black/5">
                    ({selectedPiece.name})
                  </span>
                )}
              </div>
            </div>

            {/* زر المفضلة */}
            <button
              type="button"
              onClick={handleFavoriteClick}
              className={`flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-200 shadow-sm ${
                fav
                  ? "bg-rose-50 border-rose-200 text-rose-600 scale-105"
                  : "bg-white border-black/10 text-neutral-600 hover:border-rose-300 hover:text-rose-500"
              }`}
              aria-label="المفضلة"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill={fav ? "#e11d48" : "none"}
                stroke={fav ? "#e11d48" : "currentColor"}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>
          </div>

          {/* ── اختيار القطعة أو الطقم المنفرد (إن وجد خيارات قطع) ── */}
          {product.pieces && product.pieces.length > 0 && (
            <div className="space-y-2 pt-1 border-b border-black/5 pb-3">
              <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-neutral-900">
                <span>اختر الصنف / القطعة:</span>
                <span className="text-[#00875a] font-extrabold text-xs sm:text-sm">
                  {selectedPiece?.name}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {product.pieces.map((piece, idx) => {
                  const isSelected = selectedPiece?.name === piece.name;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedPiece(piece)}
                      className={`flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all duration-200 active:scale-95 ${
                        isSelected
                          ? "border-[#00875a] bg-[#00875a]/10 text-[#00875a] ring-2 ring-[#00875a]/25 shadow-sm"
                          : "border-black/15 bg-white text-neutral-700 hover:border-black/30"
                      }`}
                    >
                      <span>{piece.name}</span>
                      <span
                        className={`font-mono px-1.5 py-0.5 rounded text-[11px] font-black ${
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

          {/* ── اختيار اللون مع صور مصغرة للمنتج ── */}
          {showColors && (
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-neutral-900">
                <span>اختر اللون:</span>
                <span className="text-[#00875a] font-extrabold text-sm sm:text-base">
                  {selectedColor === "ذهبي" ? "ذهبي (Gold)" : "فضي (Silver)"}
                </span>
              </div>

              {/* بطاقات مصغرات صور المنتج للألوان */}
              <div className="flex items-center gap-3">
                {/* بطاقة ذهبي */}
                <button
                  type="button"
                  onClick={() => setSelectedColor("ذهبي")}
                  className={`group relative flex flex-col items-center w-20 sm:w-24 rounded-2xl overflow-hidden border-2 transition-all duration-200 p-1 bg-white ${
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
                  <span className={`text-[11px] font-bold ${selectedColor === "ذهبي" ? "text-[#00875a]" : "text-neutral-700"}`}>
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
                  className={`group relative flex flex-col items-center w-20 sm:w-24 rounded-2xl overflow-hidden border-2 transition-all duration-200 p-1 bg-white ${
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
                  <span className={`text-[11px] font-bold ${selectedColor === "فضي" ? "text-[#00875a]" : "text-neutral-700"}`}>
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
        </div>

        {/* الفوتر: العداد + زر الشراء الأخضر المباشر */}
        <div className="flex-shrink-0 border-t border-black/10 bg-white px-4 sm:px-5 py-3 sm:py-3.5 shadow-[0_-4px_16px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-3">
            {/* عداد الكمية (- 1 +) */}
            <div className="flex items-center border-2 border-black/15 rounded-2xl bg-white px-2 py-1 h-12">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="h-8 w-8 flex items-center justify-center rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-sm transition-colors active:scale-95"
              >
                -
              </button>
              <span className="w-10 text-center font-bold text-sm sm:text-base font-mono text-neutral-900">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="h-8 w-8 flex items-center justify-center rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-sm transition-colors active:scale-95"
              >
                +
              </button>
            </div>

            {/* زر الشراء الأخضر العريض */}
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={adding || product.inStock === false}
              className="flex-1 h-12 rounded-2xl bg-[#00875a] hover:bg-[#00704a] active:scale-95 text-white font-bold text-sm sm:text-base transition-all shadow-lg flex items-center justify-center gap-2.5 disabled:opacity-50"
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
        </div>
      </div>
    </div>,
    document.body
  );
}
