"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Logo from "./Logo";
import { CartIcon } from "./CartDrawer";

/* ─── بيانات الميجا منيو ─────────────────────────────────── */
type NavCategory = {
  label: string;
  sub: string[];
};

const navCategories: NavCategory[] = [
  {
    label: "إكسسوارات",
    sub: [
      "أساور",
      "خاتم شبيه للذهب",
      "خواتم ماركة",
      "سنسال",
      "حلق كبس",
      "حلق طويل",
      "خلخال",
      "دبل",
      "أطقم أساور",
      "أساور سحب",
    ],
  },
  {
    label: "أطقم",
    sub: ["أطقم شبيه الذهب", "أطقم ماركات", "أطقم نواعم"],
  },
  {
    label: "حقائب",
    sub: ["حقائب صغيرة", "حقائب متوسطة", "حقائب كبيرة"],
  },
  {
    label: "ساعات",
    sub: [
      "ساعات ماركة ستاتي",
      "ساعات ماركة رجالي",
      "ساعات شبيه الماركة ستاتي",
      "ساعات شبيه الماركة رجالي",
    ],
  },
];

const staticLinks = [
  { label: "الرئيسية", href: "/" },
  { label: "من نحن", href: "/about" },
];

/* ─── مكوّن ─────────────────────────────────────────────── */
export default function Header() {
  /* حالة القائمة الجانبية للموبايل */
  const [mobileOpen, setMobileOpen] = useState(false);
  /* الفئة المفتوحة في أكورديون الموبايل */
  const [mobileAccordion, setMobileAccordion] = useState<string | null>(null);

  /* الفئة النشطة في Mega Menu على الديسكتوب */
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  /* مرجع الـ wrapper للإغلاق عند الضغط خارجه */
  const headerRef = useRef<HTMLElement>(null);

  /* المفضلة */
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<(number | string)[]>([]);
  const [favoriteProducts, setFavoriteProducts] = useState<any[]>([]);

  /* ── تحميل المفضلة ── */
  const loadFavorites = () => {
    try {
      const saved = window.localStorage.getItem("july-favorites");
      setFavoriteIds(saved ? JSON.parse(saved) : []);
    } catch {
      setFavoriteIds([]);
    }
  };

  useEffect(() => {
    loadFavorites();
    const sync = () => loadFavorites();
    window.addEventListener("july-favorites-changed", sync);
    window.addEventListener("storage", sync);
    // إعادة التحقق عند رجوع المستخدم للتاب (مثلاً بعد حذف منتج من لوحة التحكم)
    const onFocus = () => {
      try {
        const saved = window.localStorage.getItem("july-favorites");
        const ids: (number | string)[] = saved ? JSON.parse(saved) : [];
        if (ids.length > 0) {
          // أعد التحقق من وجود المنتجات في قاعدة البيانات
          fetch(`/api/products?ids=${ids.join(",")}`, { cache: "no-store" })
            .then((r) => r.json())
            .then((json) => {
              if (json && Array.isArray(json.data)) {
                const fetchedIds = json.data.map((p: any) => String(p.id));
                const validIds = ids.filter((id) =>
                  fetchedIds.includes(String(id))
                );
                if (validIds.length !== ids.length) {
                  // بعض المنتجات محذوفة — نحدّث القائمة
                  setFavoriteIds(validIds);
                  try {
                    window.localStorage.setItem(
                      "july-favorites",
                      JSON.stringify(validIds)
                    );
                    window.dispatchEvent(new Event("july-favorites-changed"));
                  } catch { /* ignore */ }
                }
              }
            })
            .catch(() => {/* ignore */});
        }
      } catch { /* ignore */ }
    };
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("july-favorites-changed", sync);
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  useEffect(() => {
    if (favoriteIds.length === 0) {
      setFavoriteProducts([]);
      return;
    }
    async function fetchFav() {
      try {
        const res = await fetch(`/api/products?ids=${favoriteIds.join(",")}`, { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();
        
        if (json && Array.isArray(json.data)) {
          const fetchedProducts = json.data;
          const fetchedIds = fetchedProducts.map((p: any) => String(p.id));
          
          const validIds = favoriteIds.filter(id => 
            fetchedIds.includes(String(id))
          );
          
          if (validIds.length !== favoriteIds.length) {
            updateFavorites(validIds);
            return;
          }
          
          setFavoriteProducts(
            fetchedProducts.map((p: any) => ({
              id: p.id,
              name: p.name,
              price: String(p.price) + " ₪",
              category: p.category_slug,
              isNew: p.is_featured,
              desc: p.description,
              image: p.image_url,
            }))
          );
        }
      } catch (err) {
        console.error(err);
      }
    }
    fetchFav();
  }, [favoriteIds]);

  const updateFavorites = (next: (number | string)[]) => {
    setFavoriteIds(next);
    try {
      window.localStorage.setItem("july-favorites", JSON.stringify(next));
      window.dispatchEvent(new Event("july-favorites-changed"));
    } catch { /* ignore */ }
  };

  const toggleFavoritesPanel = () => {
    setFavoritesOpen((v) => { if (!v) loadFavorites(); return !v; });
  };

  /* ── إغلاق الميجا منيو عند الضغط خارجه ── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ── حساب grid-cols للأقسام الفرعية ── */
  const activeCat = navCategories.find((c) => c.label === activeMenu);
  const subCols = activeCat
    ? activeCat.sub.length > 6
      ? "grid-cols-3"
      : activeCat.sub.length > 3
        ? "grid-cols-2"
        : "grid-cols-1"
    : "grid-cols-2";

  /* ════════════════════════════════════════════════════════ */
  return (
    <header ref={headerRef} className="sticky top-0 z-50">
      {/* ── شريط الهيدر الرئيسي ── */}
      <div className="relative bg-paper/90 backdrop-blur-md">
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-l from-transparent via-steel/70 to-transparent" />

        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">

          {/* ── الأيمن: أيقونات + زر الموبايل ── */}
          <div className="flex items-center gap-3">
            {/* زر الهامبرغر - موبايل فقط */}
            <button
              aria-label="فتح القائمة"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((v) => !v)}
              className="md:hidden inline-flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded-full border border-steel/40"
            >
              <span className={`h-px w-5 bg-charcoal transition-transform duration-300 ${mobileOpen ? "translate-y-[3px] rotate-45" : ""}`} />
              <span className={`h-px w-5 bg-charcoal transition-all duration-300 ${mobileOpen ? "opacity-0" : ""}`} />
              <span className={`h-px w-5 bg-charcoal transition-transform duration-300 ${mobileOpen ? "-translate-y-[9px] -rotate-45" : ""}`} />
            </button>

            {/* السلة */}
            <CartIcon className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-steel/40 text-charcoal transition-colors hover:border-steel/20" />

            {/* المفضلة */}
            <button
              type="button"
              aria-label="المفضلة"
              aria-expanded={favoritesOpen}
              onClick={toggleFavoritesPanel}
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-steel/40 text-charcoal transition-colors hover:border-steel/20"
            >
              <i className="fa-solid fa-heart text-sm" aria-hidden="true" />
              {favoriteIds.length > 0 && (
                <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-white border border-steel/20 px-1.5 text-[10px] font-bold leading-none text-charcoal">
                  {favoriteIds.length}
                </span>
              )}
            </button>

          </div>

          {/* ── الوسط: ناف ديسكتوب ── */}
          <nav className="hidden md:flex items-center gap-8" dir="rtl">
            {/* الرئيسية — أول على اليمين */}
            <Link
              href="/"
              className="group relative font-body text-[17px] text-charcoal transition-colors hover:text-charcoal"
            >
              الرئيسية
              <span className="pointer-events-none absolute -bottom-1.5 right-0 h-px w-0 bg-charcoal transition-all duration-300 group-hover:w-full" />
            </Link>

            {/* فئات الميجا منيو */}
            {navCategories.map((cat) => (
              <button
                key={cat.label}
                type="button"
                onMouseEnter={() => setActiveMenu(cat.label)}
                onClick={() => setActiveMenu((v) => (v === cat.label ? null : cat.label))}
                className={`group relative flex items-center gap-1 font-body text-[17px] text-charcoal transition-colors hover:text-[#E0457D] ${activeMenu === cat.label ? "text-[#E0457D]" : ""}`}
              >
                {cat.label}
                {/* سهم صغير */}
                <svg
                  width="12" height="12" viewBox="0 0 12 12" fill="none"
                  className={`transition-transform duration-200 ${activeMenu === cat.label ? "rotate-180" : ""}`}
                >
                  <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {/* خط تحت وردي */}
                <span className={`pointer-events-none absolute -bottom-1.5 right-0 h-px bg-[#E0457D] transition-all duration-300 ${activeMenu === cat.label ? "w-full" : "w-0 group-hover:w-full"}`} />
              </button>
            ))}

            {/* من نحن — آخر على اليسار */}
            <Link
              href="/about"
              className="group relative font-body text-[17px] text-charcoal transition-colors hover:text-charcoal"
            >
              من نحن
              <span className="pointer-events-none absolute -bottom-1.5 right-0 h-px w-0 bg-charcoal transition-all duration-300 group-hover:w-full" />
            </Link>
          </nav>

          {/* ── الأيسر: الشعار ── */}
          <a href="/" className="shrink-0">
            <Logo />
          </a>
        </div>
      </div>

      {/* ════════════════════════════════════════════════
          MEGA MENU — ديسكتوب فقط
      ════════════════════════════════════════════════ */}
      <div
        onMouseLeave={() => setActiveMenu(null)}
        style={{
          opacity: activeMenu ? 1 : 0,
          transform: activeMenu ? "translateY(0)" : "translateY(-8px)",
          pointerEvents: activeMenu ? "auto" : "none",
          transition: "opacity 0.22s ease, transform 0.22s ease",
        }}
        className="hidden md:block absolute inset-x-0 top-full z-40 border-b border-steel/15"
      >
        <div
          style={{ background: "#FFFFFF", boxShadow: "0 8px 40px rgba(44,30,36,0.10)" }}
          className="mx-auto max-w-7xl px-8 py-8"
          dir="rtl"
        >
          {activeCat && (
            <>
              {/* عنوان الفئة */}
              <p
                style={{
                  fontFamily: "'Lalezar', serif",
                  color: "#E0457D",
                  fontSize: "1.35rem",
                  marginBottom: "1.25rem",
                  letterSpacing: "0.01em",
                }}
              >
                {activeCat.label}
              </p>

              {/* الأقسام الفرعية */}
              <div className={`grid gap-x-10 gap-y-3 ${subCols}`}>
                {activeCat.sub.map((item) => (
                  <span
                    key={item}
                    className="flex items-center gap-2 text-[15px] cursor-default"
                    style={{ color: "#2B1E24", textDecoration: "none" }}
                  >
                    {/* نقطة سوداء */}
                    <span
                      style={{
                        width: "5px", height: "5px",
                        borderRadius: "50%",
                        background: "#2B1E24",
                        flexShrink: 0,
                      }}
                    />
                    <span>
                      {item}
                    </span>
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════
          قائمة الموبايل (accordion)
      ════════════════════════════════════════════════ */}
      <div
        className={`md:hidden overflow-hidden bg-paper-2 transition-[max-height] duration-300 ${mobileOpen ? "max-h-[32rem] overflow-y-auto" : "max-h-0"}`}
      >
        <nav className="flex flex-col gap-1 px-5 py-4" dir="rtl">
          {/* فئات قابلة للفتح */}
          {navCategories.map((cat) => (
            <div key={cat.label}>
              <button
                type="button"
                onClick={() =>
                  setMobileAccordion((v) => (v === cat.label ? null : cat.label))
                }
                className="flex w-full items-center justify-between rounded-lg px-3 py-3 font-body text-base text-charcoal hover:bg-paper-3"
              >
                <span>{cat.label}</span>
                <svg
                  width="14" height="14" viewBox="0 0 12 12" fill="none"
                  className={`transition-transform duration-200 ${mobileAccordion === cat.label ? "rotate-180" : ""}`}
                >
                  <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {/* أقسام فرعية accordion */}
              <div
                className="overflow-hidden transition-[max-height] duration-300"
                style={{ maxHeight: mobileAccordion === cat.label ? `${cat.sub.length * 48}px` : "0" }}
              >
                <div className="flex flex-col gap-0.5 pb-2 pr-6">
                  {cat.sub.map((item) => (
                    <span
                      key={item}
                      className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm cursor-default"
                      style={{ color: "#2B1E24" }}
                    >
                      <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#2B1E24", flexShrink: 0 }} />
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {/* روابط ثابتة */}
          {staticLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="rounded-lg px-3 py-3 font-body text-base text-charcoal hover:bg-paper-3"
            >
              {link.label}
            </Link>
          ))}

          <button
            type="button"
            onClick={() => { setMobileOpen(false); toggleFavoritesPanel(); }}
            className="rounded-lg px-3 py-3 text-right font-body text-base text-charcoal hover:bg-paper-3"
          >
            المفضلة
          </button>

          <a
            href="#categories"
            onClick={() => setMobileOpen(false)}
            className="mt-2 inline-flex items-center justify-center rounded-full bg-white border border-steel/20 px-5 py-3 font-body text-sm font-semibold text-charcoal hover:bg-paper-3 transition-colors"
          >
            تسوّقي الآن
          </a>
        </nav>
      </div>

      {/* ════════════════════════════════════════════════
          لوحة المفضلة
      ════════════════════════════════════════════════ */}
      {favoritesOpen && (
        <div className="absolute inset-x-0 top-full z-50 px-4 sm:px-8">
          <div className="mx-auto mt-3 max-w-3xl overflow-hidden rounded-3xl border border-steel/20 bg-paper/98 shadow-2xl shadow-charcoal/10 backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-steel/10 px-5 py-4">
              <div>
                <h2 className="font-display text-2xl text-charcoal">المفضلة</h2>
                <p className="mt-1 text-sm text-charcoal">كل القطع التي حفظتها الزبونة تظهر هنا.</p>
              </div>
              <button
                type="button"
                onClick={() => setFavoritesOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-steel/20 text-charcoal transition hover:border-steel/40"
                aria-label="إغلاق المفضلة"
              >
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </div>

            <div className="max-h-[26rem] overflow-y-auto p-5">
              {favoriteProducts.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {favoriteProducts.map((product) => (
                    <div key={product.id} className="flex gap-4 rounded-2xl border border-steel/15 bg-paper-2 p-3">
                      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-steel/10 bg-paper">
                        {product.image ? (
                          <Image src={product.image} alt={product.name} fill sizes="96px" className="object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-charcoal">
                            <i className="fa-solid fa-gem" aria-hidden="true" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="truncate font-display text-lg text-charcoal">{product.name}</h3>
                            <p className="mt-1 text-xs text-charcoal">{product.category}</p>
                          </div>

                          <button
                            type="button"
                            onClick={() => updateFavorites(favoriteIds.filter((id) => id !== product.id))}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-steel/20 text-charcoal transition hover:bg-paper-3"
                            aria-label={`إزالة ${product.name} من المفضلة`}
                          >
                            <i className="fa-solid fa-heart text-xs" aria-hidden="true" />
                          </button>
                        </div>

                        <div className="mt-4 flex items-center justify-between gap-3">
                          <span className="font-mono text-sm font-semibold text-charcoal">{product.price}</span>
                          <Link
                            href={`/product/${product.id}`}
                            className="rounded-full border border-steel/20 px-3 py-1.5 text-xs font-semibold text-charcoal transition hover:bg-paper-3"
                            onClick={() => setFavoritesOpen(false)}
                          >
                            عرض المنتج
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-steel/20 bg-paper-2 px-6 py-12 text-center">
                  <p className="font-display text-2xl text-charcoal">لا توجد مفضلات بعد</p>
                  <p className="mt-2 text-sm text-charcoal">اضغطي على القلب داخل أي بطاقة منتج حتى تنحفظ هنا.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
