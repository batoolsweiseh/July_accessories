"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";

interface ImageCropperModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string | null;
  fileName?: string;
  onCropComplete: (croppedFile: File, previewUrl: string) => void;
}

export default function ImageCropperModal({
  isOpen,
  onClose,
  imageSrc,
  fileName = "product-image.jpg",
  onCropComplete,
}: ImageCropperModalProps) {
  const [mounted, setMounted] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imgLoaded, setImgLoaded] = useState(false);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // إعادة التعيين عند فتح صورة جديدة
  useEffect(() => {
    if (isOpen && imageSrc) {
      setZoom(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
      setImgLoaded(false);
    }
  }, [isOpen, imageSrc]);

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

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    setImgLoaded(true);
  };

  /* ── بدء السحب (ماوس) ── */
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  /* ── أثناء السحب (ماوس) ── */
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    },
    [isDragging, dragStart]
  );

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  /* ── دعم اللمس على شاشات الموبايل ── */
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPosition({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  /* ── التكبير عبر عجلة الماوس ── */
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.001;
    setZoom((prev) => Math.min(Math.max(1, prev + delta), 3));
  };

  /* ── قص الصورة وإنشاء الملف ── */
  const handleCrop = () => {
    if (!imageRef.current || !containerRef.current) return;

    const img = imageRef.current;
    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();

    const outputSize = 1000; // دقة الإخراج مربعة 1000x1000
    const canvas = document.createElement("canvas");
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // تمكين تنعيم وجودة الرسم
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // الخلفية بيضاء
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, outputSize, outputSize);

    // حساب نسبة التحويل من العرض المعروض إلى دقة الإخراج
    const scaleFactor = outputSize / containerRect.width;

    ctx.save();
    // النقل إلى مركز الكانفاس
    ctx.translate(outputSize / 2, outputSize / 2);

    // تطبيق الدوران إذا وجد
    if (rotation !== 0) {
      ctx.rotate((rotation * Math.PI) / 180);
    }

    // تطبيق الإزاحة والتكبير
    const renderedWidth = img.width * zoom * scaleFactor;
    const renderedHeight = img.height * zoom * scaleFactor;
    const drawX = position.x * scaleFactor - renderedWidth / 2;
    const drawY = position.y * scaleFactor - renderedHeight / 2;

    ctx.drawImage(img, drawX, drawY, renderedWidth, renderedHeight);
    ctx.restore();

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const cleanName = fileName.replace(/\.[^/.]+$/, "") + ".jpg";
        const file = new File([blob], cleanName, { type: "image/jpeg" });
        const previewUrl = URL.createObjectURL(blob);
        onCropComplete(file, previewUrl);
        onClose();
      },
      "image/jpeg",
      0.92
    );
  };

  if (!mounted || !isOpen || !imageSrc) return null;

  return createPortal(
    <div
      dir="rtl"
      className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-[28px] bg-neutral-900 border border-white/15 p-5 sm:p-6 shadow-2xl text-white overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {/* الهيدر */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <h3
              style={{ fontFamily: "'Lalezar', serif" }}
              className="text-xl sm:text-2xl text-white leading-tight"
            >
              ✂️ ضبط وتوسيط صورة المنتج
            </h3>
            <p className="text-[11px] sm:text-xs text-white/60 mt-0.5">
              اسحب الصورة بالماوس أو الإصبع لتحديد الجزء الظاهر
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* مساحة المعاينة والقص المربعة */}
        <div className="my-4 flex items-center justify-center">
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
            className="relative w-[280px] h-[280px] sm:w-[340px] sm:h-[340px] rounded-2xl overflow-hidden bg-neutral-950 border-2 border-dashed border-[#E0457D] shadow-inner cursor-grab active:cursor-grabbing select-none flex items-center justify-center touch-none"
          >
            {/* الصورة القابلة للتحريك والزووم */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Crop"
              onLoad={handleImageLoad}
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                transformOrigin: "center center",
                transition: isDragging ? "none" : "transform 0.1s ease-out",
                maxWidth: "100%",
                maxHeight: "100%",
                pointerEvents: "none",
              }}
              className="object-contain"
              crossOrigin="anonymous"
            />

            {/* شبكة الإرشاد التوضيحية (Grid overlay) */}
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-20">
              <div className="border-r border-b border-white" />
              <div className="border-r border-b border-white" />
              <div className="border-b border-white" />
              <div className="border-r border-b border-white" />
              <div className="border-r border-b border-white" />
              <div className="border-b border-white" />
              <div className="border-r border-white" />
              <div className="border-r border-white" />
              <div />
            </div>

            {/* بادج الإرشاد بالسحب */}
            <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm text-white/80 text-[10px] px-2 py-0.5 rounded-full pointer-events-none">
              👆 اسحب للتحريك
            </div>
          </div>
        </div>

        {/* أدوات التحكم (الزووم والتدوير) */}
        <div className="space-y-3 bg-white/5 p-3.5 rounded-2xl border border-white/10">
          {/* شريط الزووم */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/70 font-semibold shrink-0">🔍 التكبير:</span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(1, z - 0.15))}
              className="h-7 w-7 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold transition flex items-center justify-center"
            >
              -
            </button>
            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 accent-[#E0457D] cursor-pointer h-1.5 bg-white/20 rounded-lg"
            />
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(3, z + 0.15))}
              className="h-7 w-7 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold transition flex items-center justify-center"
            >
              +
            </button>
            <span className="font-mono text-xs text-[#FF7FA8] w-10 text-left font-bold">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          {/* أزرار مساعدة سريعة (إعادة ضبط وتدوير) */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10 text-xs">
            <button
              type="button"
              onClick={() => {
                setPosition({ x: 0, y: 0 });
                setZoom(1);
                setRotation(0);
              }}
              className="inline-flex items-center gap-1 text-white/70 hover:text-white transition py-1 px-2.5 rounded-lg hover:bg-white/10"
            >
              <span>↺</span>
              <span>إعادة ضبط الموضع</span>
            </button>

            <button
              type="button"
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="inline-flex items-center gap-1 text-white/70 hover:text-white transition py-1 px-2.5 rounded-lg hover:bg-white/10"
            >
              <span>↻</span>
              <span>تدوير 90°</span>
            </button>
          </div>
        </div>

        {/* أزرار الحفظ والإلغاء */}
        <div className="flex items-center gap-3 mt-4 pt-3 border-t border-white/10">
          <button
            type="button"
            onClick={handleCrop}
            className="flex-1 py-3 bg-[#E0457D] hover:bg-[#c9356d] active:scale-95 text-white font-bold rounded-xl text-sm transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <span>✓</span>
            <span>اعتماد وحفظ موضع الصورة</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="py-3 px-5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl text-sm transition-colors"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
