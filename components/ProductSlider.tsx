"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useCart } from "@/lib/useCart";

/* ── أنواع ── */
type Product = {
  id: number | string;
  name: string;
  price: string | number;
  category: string;
  inStock?: boolean;
  is_new?: boolean;
  image?: string;
  isFeatured?: boolean;
  isNew?: boolean;
  isTrending?: boolean;
};

/* ── قراءة/حفظ المفضلة من localStorage ── */
function getFavorites(): (string | number)[] {
  try {
    const s = window.localStorage.getItem("july-favorites");
    return s ? JSON.parse(s) : [];
  } catch {
    return [];
  }
}
function saveFavorites(ids: (string | number)[]) {
  try {
    window.localStorage.setItem("july-favorites", JSON.stringify(ids));
    window.dispatchEvent(new Event("july-favorites-changed"));
  } catch { /* ignore */ }
}


/* ── بطاقة منتج مفردة ── */
function ProductCard({ product }: { product: Product }) {
  const [isFav, setIsFav] = useState(false);
  const [imgSrc, setImgSrc] = useState(product.image || "/product-placeholder.png");
  const [addedState, setAddedState] = useState<"idle" | "loading" | "done">("idle");
  const { addToCart } = useCart();

  const handleBuy = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (addedState !== "idle") return;
    setAddedState("loading");
    await addToCart(String(product.id), 1, {
      id: String(product.id),
      name: product.name,
      price: Number(String(product.price).replace(/[^\d.]/g, "")) || 0,
      image_url: imgSrc,
      in_stock: product.inStock !== false,
      category_slug: product.category,
    });
    setAddedState("done");
    // فتح درج السلة
    window.dispatchEvent(new Event("july-open-cart"));
    setTimeout(() => setAddedState("idle"), 2000);
  };

  /* نحمّل حالة المفضلة عند الـ mount */
  useEffect(() => {
    setIsFav(getFavorites().includes(product.id));
    const sync = () => setIsFav(getFavorites().includes(product.id));
    window.addEventListener("july-favorites-changed", sync);
    return () => window.removeEventListener("july-favorites-changed", sync);
  }, [product.id]);

  const toggleFav = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const current = getFavorites();
    const next = current.includes(product.id)
      ? current.filter((x) => x !== product.id)
      : [...current, product.id];
    saveFavorites(next);
    setIsFav(!current.includes(product.id));
  };

  return (
    <div className="group relative flex-shrink-0 w-[75px] sm:w-[90px] md:w-[105px] rounded-xl overflow-hidden border border-black/10 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/10 hover:border-black/20">
      {/* الصورة */}
      <div className="relative aspect-square overflow-hidden bg-gray-50">
        <Image
          src={imgSrc}
          alt={product.name}
          fill
          sizes="(max-width:640px) 75px, (max-width:768px) 90px, 105px"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          onError={() => setImgSrc("/product-placeholder.png")}
          unoptimized={imgSrc.startsWith("http")}
        />

        {/* بادجات المنتج */}
        <div className="absolute top-1 right-1 flex flex-col gap-1 z-10" dir="rtl">
          {product.isFeatured && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-amber-900 shadow-lg shadow-amber-200/50 ring-1 ring-white/70">
              <span className="text-[10px]">★</span>
              مميز
            </span>
          )}
          {(product.isNew || product.is_new) && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-white via-emerald-200 to-emerald-500 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-emerald-950 shadow-lg shadow-emerald-200/50 ring-1 ring-white/70">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-700 shadow-inner" />
              جديد
            </span>
          )}
          {product.isTrending && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-white via-rose-200 to-rose-500 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-rose-950 shadow-lg shadow-rose-200/50 ring-1 ring-white/70">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-600 shadow-inner" />
              ترند
            </span>
          )}
        </div>
      </div>

      {/* معلومات */}
      <div className="p-1.5" dir="rtl">
        <p className="font-body text-[9px] font-medium text-black leading-tight line-clamp-2">
          {product.name}
        </p>
        <p className={`mt-1 font-mono text-[9px] font-bold ${product.inStock === false ? 'text-slate-400' : 'text-black'}`}>
          {product.price}
        </p>
        <div className="mt-1.5 flex items-center justify-between gap-1">
          {product.inStock === false ? (
            <>
              <div className="flex-1 text-center rounded-full bg-slate-200 text-slate-500 text-[8px] font-semibold py-1">
                نفد
              </div>
              <button
                type="button"
                onClick={toggleFav}
                aria-label={isFav ? "إزالة من المفضلة" : "إضافة للمفضلة"}
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full border transition-all duration-200 ${isFav ? 'bg-white text-[#E0457D] border-[#E0457D]' : 'bg-white text-black border-black/10 hover:border-[#E0457D]'}`}
              >
                <svg width="9" height="9" viewBox="0 0 24 24" fill={isFav ? "#E0457D" : "none"} stroke={isFav ? "#E0457D" : "#444"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleBuy}
                disabled={addedState !== "idle"}
                className={`inline-flex h-7 flex-1 items-center justify-center rounded-lg text-[9px] font-semibold transition-all duration-200 focus:outline-none ${
                  addedState === "done"
                    ? "bg-green-500 text-white"
                    : "bg-black text-white hover:bg-neutral-700"
                } disabled:opacity-70`}
              >
                {addedState === "loading" ? (
                  <svg className="animate-spin" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                ) : addedState === "done" ? (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                ) : (
                  "اشتري"
                )}
              </button>
              <button
                type="button"
                onClick={toggleFav}
                aria-label={isFav ? "إزالة من المفضلة" : "إضافة للمفضلة"}
                className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border transition-all duration-200 ${isFav ? 'bg-white text-[#E0457D] border-[#E0457D]' : 'bg-white text-black border-black/10 hover:border-[#E0457D]'}`}
              >
                <svg width="9" height="9" viewBox="0 0 24 24" fill={isFav ? "#E0457D" : "none"} stroke={isFav ? "#E0457D" : "#444"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

}

/* ── زر سهم التنقل ── */
function ArrowBtn({
  direction,
  onClick,
}: {
  direction: "left" | "right";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === "right" ? "يمين" : "يسار"}
      className={`absolute top-1/2 -translate-y-1/2 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white border border-black/15 shadow-lg text-black transition-all duration-200 hover:bg-neutral-50 hover:scale-105 active:bg-black active:text-white active:scale-95 ${
        direction === "right" ? "right-1 xl:-right-5" : "left-1 xl:-left-5"
      }`}
    >
      {direction === "right" ? (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M11 5L7 9L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M7 5L11 9L7 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}

/* ── شريط سلايدر لقسم واحد ── */
/* ── شريط سلايدر لقسم واحد ── */
function SectionSlider({
  title,
  titleAr,
  products,
}: {
  title: string;
  titleAr: string;
  products: Product[];
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const getScrollAmount = () => {
    if (!trackRef.current) return 236; // 220px + 16px gap fallback
    const firstCard = trackRef.current.querySelector(".group");
    return firstCard ? firstCard.clientWidth + 16 : 236;
  };

  /* في RTL: left يعني للأمام (التالي)، right يعني للخلف (السابق) */
  const goRight = () => {
    trackRef.current?.scrollBy({ left: getScrollAmount(), behavior: "smooth" });
  };
  const goLeft = () => {
    trackRef.current?.scrollBy({ left: -getScrollAmount(), behavior: "smooth" });
  };

  return (
    <div dir="rtl">
      {/* عنوان القسم */}
      <div className="mb-3 px-4 sm:px-12">
        <p className="font-mono text-[9px] tracking-widest text-black/40 uppercase mb-0.5">
          {title}
        </p>
        <h3
          style={{ fontFamily: "'Lalezar', serif" }}
          className="text-xl sm:text-2xl md:text-3xl text-black leading-tight"
        >
          {titleAr}
        </h3>
      </div>

      {/* Track + أسهم */}
      <div className="relative px-4 sm:px-12">
        {/* سهم يمين — دائماً ظاهر */}
        <ArrowBtn direction="right" onClick={goRight} />

        {/* الـ Track */}
        <div
          ref={trackRef}
          className="flex gap-1 overflow-x-auto pb-2"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>

        {/* سهم يسار — دائماً ظاهر */}
        <ArrowBtn direction="left" onClick={goLeft} />
      </div>
    </div>
  );
}

/* ── المكوّن الرئيسي ── */
export default function ProductSlider() {
  const [accessories, setAccessories] = useState<Product[]>([]);
  const [bags, setBags] = useState<Product[]>([]);
  const [sets, setSets] = useState<Product[]>([]);
  const [watches, setWatches] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const fetchCategory = async (cat: string): Promise<Product[]> => {
          const res = await fetch(`/api/products?category=${cat}`, { cache: "no-store" });
          const json = await res.json();
          const allProds = (json.data || []).map((p: any) => {
            const desc = p.description || "";
            const isNew = !!p.is_new || desc.includes("[tag:new]");
            const isTrending = !!p.is_trending || desc.includes("[tag:trending]");
            return {
              id: p.id,
              name: p.name,
              price: String(p.price) + " ₪",
              category: p.category_slug,
              image: p.image_url || "/product-placeholder.png",
              isFeatured: !!p.is_featured,
              inStock: p.in_stock ?? true,
              isNew,
              isTrending,
            };
          });

          // إرجاع المنتجات المحددة فقط بـ (مميز / جديد / ترند) المرفوعة على Supabase
          return allProds.filter((p: any) => p.isFeatured || p.isNew || p.isTrending);
        };

        const [accData, bagsData, setsData, watchesData] = await Promise.all([
          fetchCategory("accessories"),
          fetchCategory("bags"),
          fetchCategory("sets"),
          fetchCategory("watches"),
        ]);

        setAccessories(accData);
        setBags(bagsData);
        setSets(setsData);
        setWatches(watchesData);
      } catch {
        setAccessories([]);
        setBags([]);
        setSets([]);
        setWatches([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <section id="product-sliders" className="bg-white py-10 sm:py-14">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 pb-8 text-center" dir="rtl">
        <p className="font-mono text-[10px] tracking-[0.24em] uppercase text-black/40 mb-2">
          LATEST PRODUCTS
        </p>
        <h2
          style={{ fontFamily: "'Lalezar', serif" }}
          className="text-3xl sm:text-4xl md:text-5xl text-black leading-tight font-black"
        >
          أحدث المنتجات
        </h2>
      </div>
      {loading ? (
        <div className="mx-auto max-w-7xl space-y-12 px-12 sm:px-16">
          {[0, 1].map((i) => (
            <div key={i}>
              <div className="h-8 w-40 rounded-lg bg-gray-100 animate-pulse mb-6" />
              <div className="flex gap-4 overflow-hidden">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="flex-shrink-0 w-[108px] aspect-square rounded-2xl bg-gray-100 animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mx-auto max-w-7xl space-y-8">
          {accessories.length > 0 && (
            <>
              <SectionSlider title="ACCESSORIES" titleAr="إكسسوارات" products={accessories} />
              <div className="mx-8 h-px bg-gradient-to-r from-transparent via-black/8 to-transparent" />
            </>
          )}
          {sets.length > 0 && (
            <>
              <SectionSlider title="SETS" titleAr="أطقم إكسسوارات" products={sets} />
              <div className="mx-8 h-px bg-gradient-to-r from-transparent via-black/8 to-transparent" />
            </>
          )}
          {watches.length > 0 && (
            <>
              <SectionSlider title="WATCHES" titleAr="ساعات" products={watches} />
              <div className="mx-8 h-px bg-gradient-to-r from-transparent via-black/8 to-transparent" />
            </>
          )}
          {bags.length > 0 && (
            <SectionSlider title="BAGS" titleAr="شنط" products={bags} />
          )}
        </div>
      )}
    </section>
  );
}
