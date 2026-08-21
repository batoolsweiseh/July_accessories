"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";

interface ImageLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  src: string;
  alt?: string;
  title?: string;
  price?: string | number;
}

export default function ImageLightbox({
  isOpen,
  onClose,
  src,
  alt = "صورة المنتج",
  title,
  price,
}: ImageLightboxProps) {
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

  if (!mounted || !isOpen || !src) return null;

  return createPortal(
    <div
      dir="rtl"
      className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative max-w-xl w-full max-h-[90vh] flex flex-col items-center justify-center rounded-3xl overflow-hidden shadow-2xl bg-neutral-900 border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* زر الإغلاق */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 left-3 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/90 transition-all hover:scale-105 border border-white/20 shadow-lg"
          aria-label="إغلاق الصورة"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* حاوية الصورة */}
        <div className="relative w-full aspect-square max-h-[75vh] bg-neutral-950 flex items-center justify-center overflow-hidden">
          <Image
            src={src}
            alt={alt}
            fill
            sizes="(max-width: 768px) 100vw, 600px"
            className="object-contain select-none"
            unoptimized={src.startsWith("http")}
            priority
          />
        </div>

        {/* تفاصيل المنتج */}
        {(title || price !== undefined) && (
          <div className="w-full px-5 py-3.5 bg-neutral-900/95 border-t border-white/10 flex items-center justify-between gap-3">
            {title && (
              <p className="text-white text-sm sm:text-base font-semibold truncate">
                {title}
              </p>
            )}
            {price !== undefined && (
              <span className="text-[#FF7FA8] font-mono text-sm sm:text-base font-bold shrink-0">
                {typeof price === "number" ? `${price} ₪` : price}
              </span>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
