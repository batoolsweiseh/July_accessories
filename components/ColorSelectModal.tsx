"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { ProductColor } from "@/lib/productUtils";

export interface ColorSelectProduct {
  id: string | number;
  name: string;
  price: string | number;
  image?: string | null;
  category?: string;
}

interface ColorSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ColorSelectProduct | null;
  onSelectColor: (color: ProductColor) => void;
}

export default function ColorSelectModal({
  isOpen,
  onClose,
  product,
  onSelectColor,
}: ColorSelectModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  if (!mounted || !isOpen || !product) return null;

  const numericPrice =
    typeof product.price === "number"
      ? product.price
      : Number(String(product.price).replace(/[^\d.]/g, "")) || 0;

  return createPortal(
    <div
      dir="rtl"
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-[28px] bg-white p-5 shadow-2xl border border-black/10 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* زر الإغلاق */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 left-4 flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200 text-black/70 transition-colors"
          aria-label="إغلاق"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* رأس النافذة / معلومات المنتج */}
        <div className="flex items-center gap-3.5 pb-4 border-b border-black/8">
          <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-2xl border border-black/10 bg-gray-50">
            <Image
              src={product.image || "/product-placeholder.png"}
              alt={product.name}
              fill
              sizes="64px"
              className="object-cover"
              unoptimized={!!product.image && product.image.startsWith("http")}
            />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-sm sm:text-base text-black truncate leading-tight">
              {product.name}
            </h3>
            <p className="mt-1 font-mono text-sm font-bold text-[#E0457D]">
              {numericPrice} ₪
            </p>
          </div>
        </div>

        {/* جسم النافذة: اختيار اللون */}
        <div className="py-5 text-center">
          <h4 className="text-sm font-bold text-black mb-1" style={{ fontFamily: "'Lalezar', serif" }}>
            اختر اللون المطلوب
          </h4>
          <p className="text-xs text-black/50 mb-4">
            الرجاء تحديد لون القطعة لإضافتها إلى السلة:
          </p>

          <div className="grid grid-cols-2 gap-3">
            {/* زر اللون الذهبي */}
            <button
              type="button"
              onClick={() => onSelectColor("ذهبي")}
              className="group flex flex-col items-center justify-center gap-2 p-3.5 rounded-2xl border-2 border-amber-400 bg-amber-50/50 hover:bg-amber-100/70 hover:border-amber-500 active:scale-95 transition-all shadow-sm"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-600 via-amber-400 to-amber-200 border-2 border-white shadow-md flex items-center justify-center">
                <span className="text-xs">🪙</span>
              </div>
              <div>
                <span className="block text-sm font-bold text-amber-950">
                  ذهبي
                </span>
                <span className="text-[10px] text-amber-800/80 font-mono">
                  Gold
                </span>
              </div>
            </button>

            {/* زر اللون الفضي */}
            <button
              type="button"
              onClick={() => onSelectColor("فضي")}
              className="group flex flex-col items-center justify-center gap-2 p-3.5 rounded-2xl border-2 border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400 active:scale-95 transition-all shadow-sm"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-400 via-slate-200 to-white border-2 border-white shadow-md flex items-center justify-center">
                <span className="text-xs">⚪</span>
              </div>
              <div>
                <span className="block text-sm font-bold text-slate-900">
                  فضي
                </span>
                <span className="text-[10px] text-slate-600 font-mono">
                  Silver
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
