"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { useCart, CartItem } from "@/lib/useCart";
import { createCustomerOrder } from "@/app/admin/actions";

/* ─── بيانات المناطق وسعر التوصيل ─── */
const REGIONS = {
  "ضفة": {
    label: "الضفة",
    deliveryFee: 20,
    flag: "🇵🇸",
    placeholderCity: "مثال: رام الله، نابلس، جنين، الخليل...",
  },
  "قدس": {
    label: "القدس",
    deliveryFee: 30,
    flag: "🕌",
    placeholderCity: "مثال: بيت حنينا، شعفاط، سلوان...",
  },
  "داخل": {
    label: "الداخل",
    deliveryFee: 50,
    flag: "🟢",
    placeholderCity: "مثال: الناصرة، حيفا، أم الفحم، طمرة، عكا...",
  },
} as const;

type RegionKey = keyof typeof REGIONS;

/* ─── فورم الطلب ─── */
interface OrderFormData {
  firstName: string;
  lastName: string;
  phone: string;
  region: RegionKey | "";
  city: string;
  notes?: string;
  deliveryFee: number;
}

function OrderForm({
  totalPrice,
  onBack,
  onSubmit,
}: {
  totalPrice: number;
  onBack: () => void;
  onSubmit: (data: OrderFormData) => void;
}) {
  const [form, setForm] = useState<OrderFormData>({
    firstName: "",
    lastName: "",
    phone: "",
    region: "",
    city: "",
    notes: "",
    deliveryFee: 0,
  });
  // نوع مستقل لرسائل الخطأ (كلها strings)
  type FormErrors = { [K in keyof OrderFormData]?: string };
  const [errors, setErrors] = useState<FormErrors>({});

  const selectedRegion = form.region ? REGIONS[form.region] : null;

  const set = (field: keyof OrderFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const value = e.target.value;
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!form.firstName.trim()) e.firstName = "الاسم الأول مطلوب";
    if (!form.lastName.trim()) e.lastName = "اسم العائلة مطلوب";
    if (!form.region) e.region = "يرجى تحديد المنطقة (ضفة / قدس / داخل)";
    if (!form.city.trim()) e.city = "يرجى كتابة اسم المدينة أو البلدة بالتفصيل";
    
    if (!form.phone.trim()) {
      e.phone = "رقم الهاتف مطلوب";
    } else {
      const cleaned = form.phone.replace(/[\s-()]/g, ""); // تنظيف المسافات والأقواس
      if (!/^\d{8,15}$/.test(cleaned)) {
        e.phone = "يرجى كتابة رقم هاتف صحيح";
      }
    }
    
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) onSubmit(form);
  };

  const currentDeliveryFee = selectedRegion ? selectedRegion.deliveryFee : 0;
  const grandTotal = totalPrice + currentDeliveryFee;

  return (
    <form onSubmit={handleSubmit} noValidate dir="rtl" className="flex flex-col flex-1 min-h-0 h-full overflow-hidden">
      {/* الهيدر */}
      <div className="flex-shrink-0 flex items-center gap-3 px-5 py-3.5 border-b border-black/8 bg-white">
        <button
          type="button"
          onClick={onBack}
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-black/5 transition-colors"
          aria-label="رجوع"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M11 4l-5 5 5 5" />
          </svg>
        </button>
        <div>
          <h2 className="text-base sm:text-lg font-bold" style={{ fontFamily: "'Lalezar', serif" }}>
            تفاصيل الطلب
          </h2>
          <p className="text-[11px] text-black/50">أدخل بياناتك لإتمام الشراء</p>
        </div>
      </div>

      {/* الحقول مع سكرول داخلي */}
      <div className="flex-1 min-h-0 overflow-y-auto px-5 py-3.5 space-y-3 bg-[#fffafc]">

        {/* الاسم الأول + اسم العائلة */}
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[11px] font-bold text-black mb-1">الاسم الأول *</label>
            <input
              type="text"
              value={form.firstName}
              onChange={set("firstName")}
              placeholder="محمد"
              className={`w-full rounded-xl border px-3 py-2 text-xs sm:text-sm font-medium text-black placeholder:text-black/40 outline-none transition-colors ${
                errors.firstName ? "border-red-400 bg-red-50" : "border-black/20 bg-white focus:border-black/60"
              }`}
            />
            {errors.firstName && <p className="mt-0.5 text-[9px] text-red-600 font-semibold">{errors.firstName}</p>}
          </div>
          <div>
            <label className="block text-[11px] font-bold text-black mb-1">اسم العائلة *</label>
            <input
              type="text"
              value={form.lastName}
              onChange={set("lastName")}
              placeholder="العمر"
              className={`w-full rounded-xl border px-3 py-2 text-xs sm:text-sm font-medium text-black placeholder:text-black/40 outline-none transition-colors ${
                errors.lastName ? "border-red-400 bg-red-50" : "border-black/20 bg-white focus:border-black/60"
              }`}
            />
            {errors.lastName && <p className="mt-0.5 text-[9px] text-red-600 font-semibold">{errors.lastName}</p>}
          </div>
        </div>

        {/* اختيار المنطقة (ضفة / قدس / داخل) */}
        <div>
          <label className="block text-[11px] font-bold text-black mb-1">المنطقة *</label>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(REGIONS) as RegionKey[]).map((r) => {
              const reg = REGIONS[r];
              const isSelected = form.region === r;
              return (
                <button
                  type="button"
                  key={r}
                  onClick={() => {
                    setForm((prev) => ({
                      ...prev,
                      region: r,
                      deliveryFee: reg.deliveryFee,
                    }));
                    setErrors((prev) => ({ ...prev, region: "" }));
                  }}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all duration-200 text-center ${
                    isSelected
                      ? "border-black bg-black text-white shadow-md scale-[1.02]"
                      : "border-black/15 bg-white text-black hover:border-black/40 hover:bg-neutral-50"
                  }`}
                >
                  <span className="text-sm mb-0.5">{reg.flag}</span>
                  <span className="text-xs font-bold leading-tight">{reg.label}</span>
                  <span
                    className={`text-[9px] mt-1 font-semibold px-1.5 py-0.5 rounded-full ${
                      isSelected ? "bg-white/20 text-white" : "bg-neutral-100 text-neutral-600"
                    }`}
                  >
                    +{reg.deliveryFee} ₪ توصيل
                  </span>
                </button>
              );
            })}
          </div>
          {errors.region && <p className="mt-0.5 text-[9px] text-red-600 font-semibold">{errors.region}</p>}
        </div>

        {/* اسم المدينة / العنوان */}
        <div>
          <label className="block text-[11px] font-bold text-black mb-1">اسم المدينة / البلدة والعنوان *</label>
          <input
            type="text"
            value={form.city}
            onChange={set("city")}
            placeholder={
              selectedRegion
                ? selectedRegion.placeholderCity
                : "اكتب اسم مدينتك أو بلدتك والعنوان بالتفصيل"
            }
            className={`w-full rounded-xl border px-3 py-2 text-xs sm:text-sm font-medium text-black placeholder:text-black/40 outline-none transition-colors ${
              errors.city ? "border-red-400 bg-red-50" : "border-black/20 bg-white focus:border-black/60"
            }`}
          />
          {errors.city && <p className="mt-0.5 text-[9px] text-red-600 font-semibold">{errors.city}</p>}
        </div>

        {/* رقم الهاتف */}
        <div>
          <label className="block text-[11px] font-bold text-black mb-1">رقم الهاتف *</label>
          <input
            type="tel"
            inputMode="numeric"
            value={form.phone}
            onChange={set("phone")}
            placeholder="مثال: 0599000000 أو 0520000000"
            className={`w-full rounded-xl border px-3 py-2 text-xs sm:text-sm font-medium text-black placeholder:text-black/40 outline-none transition-colors ${
              errors.phone ? "border-red-400 bg-red-50" : "border-black/20 bg-white focus:border-black/60"
            }`}
          />
          {errors.phone && <p className="mt-0.5 text-[9px] text-red-600 font-semibold">{errors.phone}</p>}
        </div>

        {/* ملاحظات إضافية (نمرة الخاتم، تغليف هدية...) */}
        <div>
          <label className="block text-[11px] font-bold text-black mb-1">
            ملاحظات إضافية (اختياري)
          </label>
          <textarea
            rows={2}
            value={form.notes || ""}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            placeholder="مثال: قياس الخاتم (مثلاً: 7)، طلب تغليف هدية، توصيل بعد الساعة 4..."
            className="w-full rounded-xl border border-black/20 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-black placeholder:text-black/40 outline-none transition-colors focus:border-black/60 resize-none"
          />
        </div>
      </div>

      {/* الفوتر الثابت والمضمون في الأسفل */}
      <div className="flex-shrink-0 border-t border-black/8 bg-white px-5 py-3 space-y-2 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
        <div className="rounded-xl bg-[#fff5f8] p-2.5 space-y-1">
          <div className="flex items-center justify-between text-xs text-black/70">
            <span>مجموع المنتجات</span>
            <span className="font-semibold">{totalPrice.toFixed(0)} ₪</span>
          </div>
          <div className="flex items-center justify-between text-xs text-black/70">
            <span>سعر التوصيل {selectedRegion ? `(${selectedRegion.label})` : ""}</span>
            <span className="font-semibold">
              {selectedRegion ? `+${selectedRegion.deliveryFee} ₪` : "اختر المنطقة أعلاه"}
            </span>
          </div>
          <div className="h-px bg-black/10 my-0.5" />
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="font-bold text-black">المجموع الكلي</span>
            <span className="font-bold text-sm sm:text-base text-[#E0457D]">{grandTotal.toFixed(0)} ₪</span>
          </div>
        </div>
        <button
          type="submit"
          className="w-full py-3 rounded-xl bg-black text-white font-bold text-sm hover:bg-neutral-800 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2"
        >
          <span>تأكيد الطلب</span>
          <span>✓</span>
        </button>
      </div>
    </form>
  );
}

/* ─── شاشة نجاح الطلب ─── */
function SuccessScreen({ name, onClose }: { name: string; onClose: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-5 px-8 py-12 text-center" dir="rtl">
      <div
        className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 border-2 border-emerald-200 text-4xl"
        style={{ animation: "wheelBounceIn 0.5s ease-out" }}
      >
        🎉
      </div>
      <div>
        <h3 className="text-xl font-bold text-black mb-2" style={{ fontFamily: "'Lalezar', serif" }}>
          تم استلام طلبك!
        </h3>
        <p className="text-sm text-black/60 leading-relaxed">
          شكراً {name}، سيتم التواصل معك قريباً لتأكيد الطلب وتحديد التوصيل.
        </p>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="mt-2 px-8 py-3 rounded-2xl bg-black text-white text-sm font-semibold hover:bg-neutral-800 transition-colors"
      >
        حسناً، شكراً!
      </button>
    </div>
  );
}



/* ── أيقونة السلة ── */
export function CartIcon({ className = "" }: { className?: string }) {
  const { totalItems } = useCart();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("july-open-cart", handler);
    return () => window.removeEventListener("july-open-cart", handler);
  }, []);

  return (
    <div className="relative inline-flex">
      <button
        id="cart-icon-btn"
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((value) => !value);
        }}
        aria-label="فتح السلة"
        className={`relative inline-flex items-center justify-center ${className}`}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 01-8 0" />
        </svg>
        {totalItems > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-[#E0457D] text-white text-[10px] font-bold px-1 leading-none">
            {totalItems > 99 ? "99+" : totalItems}
          </span>
        )}
      </button>

      <CartDrawer open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

/* ── درج السلة ── */
type DrawerView = "cart" | "form" | "success";

function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  const { cart, loading, totalPrice, updateQuantity, removeItem, clearCart, syncCart } = useCart();
  const drawerRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<DrawerView>("cart");
  const [successName, setSuccessName] = useState("");
  const [submittingOrder, setSubmittingOrder] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      syncCart();
      setView("cart"); // إعادة تعيين العرض عند فتح السلة
    }
  }, [open, syncCart]);

  if (!mounted) return null;

  const items: CartItem[] = cart?.items ?? [];

  const handleOrderSubmit = async (data: OrderFormData) => {
    if (submittingOrder) return;
    setSubmittingOrder(true);

    try {
      const mappedItems = items.map((item) => ({
        id: item.product.id,
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
      }));

      const deliveryFee = data.deliveryFee || (data.region ? REGIONS[data.region].deliveryFee : 0);
      const regionLabel = data.region ? REGIONS[data.region].label : "";
      const fullCity = `${regionLabel} - ${data.city}`;
      const cleanPhone = data.phone.trim();
      const customerNotes = data.notes?.trim() || "";

      const res = await createCustomerOrder({
        customer_name: `${data.firstName} ${data.lastName}`,
        customer_phone: cleanPhone,
        customer_city: fullCity,
        notes: customerNotes,
        delivery_fee: deliveryFee,
        items: mappedItems,
      });

      if (res.success) {
        setSuccessName(data.firstName);
        setView("success");
        clearCart();
      } else {
        alert("حدث خطأ أثناء تقديم الطلب: " + res.error);
      }
    } catch (err: any) {
      console.error(err);
      alert("حدث خطأ في الاتصال بالخادم.");
    } finally {
      setSubmittingOrder(false);
    }
  };

  const handleSuccessClose = () => {
    setView("cart");
    onClose();
  };

  return createPortal(
    <>
      {/* خلفية معتمة تتيح النقر للإغلاق */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-[9998] bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* النافذة المنبثقة للسلة */}
      <div
        ref={drawerRef}
        dir="rtl"
        className={`fixed top-14 sm:top-16 left-3 right-3 sm:left-auto sm:right-6 bottom-3 sm:bottom-auto sm:w-[380px] sm:max-h-[calc(100vh-5rem)] max-h-[calc(100dvh-4.5rem)] z-[9999] flex flex-col bg-[#fffafc] shadow-2xl border border-black/10 rounded-[28px] sm:rounded-[32px] overflow-hidden transition-all duration-200 ease-out ${
          open ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
        }`}
      >
        <div className="hidden md:block absolute -top-2 right-8 h-4 w-4 rotate-45 bg-[#fffafc] border-t border-l border-black/10" />

        {/* ─── عرض السلة ─── */}
        {view === "cart" && (
          <>
            {/* الهيدر */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-black/8 bg-white">
              <div>
                <h2 className="text-lg font-bold" style={{ fontFamily: "'Lalezar', serif" }}>
                  السلة
                </h2>
                <p className="mt-1 text-sm text-black/50">
                  {items.length > 0
                    ? `${items.length} منتج${items.length === 1 ? "" : "ات"} في السلة`
                    : "السلة فارغة"}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="إغلاق السلة"
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-black/5 transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M14 4L4 14M4 4l10 10" />
                </svg>
              </button>
            </div>

            {/* المحتوى */}
            <div className="flex-1 overflow-y-auto bg-[#fffafc] py-2">
              {loading && items.length === 0 ? (
                <div className="flex flex-col gap-4 p-5">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-3 animate-pulse">
                      <div className="w-16 h-16 rounded-xl bg-gray-100 flex-shrink-0" />
                      <div className="flex-1 space-y-2 pt-1">
                        <div className="h-3 bg-gray-100 rounded w-3/4" />
                        <div className="h-3 bg-gray-100 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8 py-10">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                      <line x1="3" y1="6" x2="21" y2="6" />
                      <path d="M16 10a4 4 0 01-8 0" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-base font-semibold text-black">السلة فارغة</p>
                    <p className="mt-1 text-sm text-black/50">أضف منتجاتك وسنظهرها هنا مباشرة</p>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="mt-2 px-5 py-2 rounded-full bg-black text-white text-sm font-semibold hover:bg-neutral-700 transition-colors"
                  >
                    تصفح المنتجات
                  </button>
                </div>
              ) : (
                <ul className="space-y-3 px-4 pb-4">
                  {items.map((item) => (
                    <CartItemRow
                      key={item.id}
                      item={item}
                      onUpdateQty={(qty) => updateQuantity(item.id, qty)}
                      onRemove={() => removeItem(item.id)}
                      loading={loading}
                    />
                  ))}
                </ul>
              )}
            </div>

            {/* الفوتر */}
            {items.length > 0 && (
              <div className="border-t border-black/8 bg-white px-5 py-4 space-y-3">
                <div className="rounded-2xl bg-[#fff5f8] p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-black/60">الإجمالي</span>
                    <span className="font-bold text-base">{totalPrice.toFixed(0)} ₪</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setView("form")}
                  className="w-full py-3 rounded-2xl bg-black text-white font-semibold text-sm hover:bg-neutral-800 active:scale-95 transition-all"
                >
                  إتمام الشراء →
                </button>
              </div>
            )}
          </>
        )}

        {/* ─── عرض الفورم ─── */}
        {view === "form" && (
          <OrderForm
            totalPrice={totalPrice}
            onBack={() => setView("cart")}
            onSubmit={handleOrderSubmit}
          />
        )}

        {/* ─── عرض النجاح ─── */}
        {view === "success" && (
          <SuccessScreen name={successName} onClose={handleSuccessClose} />
        )}
      </div>
    </>,
    document.body
  );
}

/* ── صف منتج واحد في السلة ── */
function CartItemRow({
  item,
  onUpdateQty,
  onRemove,
  loading,
}: {
  item: CartItem;
  onUpdateQty: (qty: number) => void;
  onRemove: () => void;
  loading: boolean;
}) {
  const [imgSrc, setImgSrc] = useState(item.product.image_url || "/product-placeholder.png");

  return (
    <li className="rounded-3xl border border-black/10 bg-white p-4 shadow-sm">
      <div className="flex gap-3">
        {/* الصورة */}
        <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border border-black/8 bg-gray-50">
          <Image
            src={imgSrc}
            alt={item.product.name}
            fill
            sizes="80px"
            className="object-cover"
            unoptimized={imgSrc.startsWith("http")}
            onError={() => setImgSrc("/product-placeholder.png")}
          />
        </div>

        {/* التفاصيل */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-black leading-snug line-clamp-2">
              {item.product.name}
            </p>
            <button
              type="button"
              disabled={loading}
              onClick={onRemove}
              aria-label="حذف من السلة"
              className="rounded-full bg-[#fff1f5] px-2.5 py-1 text-[11px] font-semibold text-[#E0457D] transition-colors hover:bg-[#ffe4ec] disabled:opacity-40"
            >
              حذف
            </button>
          </div>

          <p className="mt-1 text-sm font-bold text-black/80">
            {(Number(item.product.price) * item.quantity).toFixed(0)} ₪
          </p>

          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 rounded-full border border-black/10 bg-[#fafafa] px-2 py-1">
              <button
                type="button"
                disabled={loading}
                onClick={() => onUpdateQty(item.quantity - 1)}
                className="flex h-6 w-6 items-center justify-center rounded-full border border-black/10 bg-white text-black hover:bg-black hover:text-white transition-colors disabled:opacity-40"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2 5h6" />
                </svg>
              </button>
              <span className="min-w-[1.2rem] text-center text-sm font-semibold">{item.quantity}</span>
              <button
                type="button"
                disabled={loading}
                onClick={() => onUpdateQty(item.quantity + 1)}
                className="flex h-6 w-6 items-center justify-center rounded-full border border-black/10 bg-white text-black hover:bg-black hover:text-white transition-colors disabled:opacity-40"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 2v6M2 5h6" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-black/50">سعر الوحدة: {Number(item.product.price).toFixed(0)} ₪</p>
          </div>
        </div>
      </div>
    </li>
  );
}
