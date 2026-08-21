"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import ImageCropperModal from "@/components/ImageCropperModal";
import {
  fetchAdminData,
  createProduct,
  deleteProduct,
  toggleStock,
  updateProduct,
  fetchOrders,
  updateOrderStatus,
} from "./actions";

/* ─── Types ─── */
type Category = {
  id: string;
  slug: string;
  title_ar: string;
  title_en: string;
};

type Subcategory = {
  id: string;
  category_slug: string;
  title_ar: string;
};

type Product = {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  category_slug: string;
  subcategory_id: string | null;
  description?: string | null;
  is_featured: boolean;
  in_stock: boolean;
  subcategories: { title_ar: string } | null;
};

type Toast = { message: string; type: "success" | "error" };

/* ─── Fallback data ─── */
const FALLBACK_CATEGORIES: Category[] = [
  { id: "accessories", slug: "accessories", title_ar: "إكسسوارات", title_en: "ACCESSORIES" },
  { id: "sets", slug: "sets", title_ar: "أطقم إكسسوارات", title_en: "ACCESSORIES SETS" },
  { id: "bags", slug: "bags", title_ar: "شنط", title_en: "BAGS" },
  { id: "watches", slug: "watches", title_ar: "ساعات", title_en: "WATCHES" },
];

const FALLBACK_SUBCATEGORIES: Subcategory[] = [
  { id: "acc-1", category_slug: "accessories", title_ar: "أساور" },
  { id: "acc-2", category_slug: "accessories", title_ar: "خاتم شبيه ذهب" },
  { id: "acc-3", category_slug: "accessories", title_ar: "خاتم ماركة" },
  { id: "acc-4", category_slug: "accessories", title_ar: "سنسال" },
  { id: "acc-5", category_slug: "accessories", title_ar: "حلق كبس" },
  { id: "acc-6", category_slug: "accessories", title_ar: "حلق طويل" },
  { id: "acc-7", category_slug: "accessories", title_ar: "خلخال" },
  { id: "acc-8", category_slug: "accessories", title_ar: "دبل" },
  { id: "acc-9", category_slug: "accessories", title_ar: "أطقم أساور" },
  { id: "set-1", category_slug: "sets", title_ar: "أطقم شبيه الذهب" },
  { id: "set-2", category_slug: "sets", title_ar: "أطقم ماركات" },
  { id: "set-3", category_slug: "sets", title_ar: "أطقم نواعم" },
  { id: "bag-1", category_slug: "bags", title_ar: "حقائب صغيرة" },
  { id: "bag-2", category_slug: "bags", title_ar: "حقائب متوسطة" },
  { id: "bag-3", category_slug: "bags", title_ar: "حقائب كبيرة" },
  { id: "wat-1", category_slug: "watches", title_ar: "ساعات ماركة ستاتي" },
  { id: "wat-2", category_slug: "watches", title_ar: "ساعات ماركة رجالي" },
  { id: "wat-3", category_slug: "watches", title_ar: "ساعات شبيه ماركة ستاتي" },
  { id: "wat-4", category_slug: "watches", title_ar: "ساعات شبيه ماركة رجالي" },
];

const PAGE_SIZE = 10;
const WHEEL_KEY = "july-wheel-segments";

const WHEEL_COLORS = [
  "#FF6B6B", "#FFD93D", "#6BCB77", "#4D96FF",
  "#FF922B", "#CC5DE8", "#20C997", "#F06595",
  "#A9E34B", "#74C0FC",
];

type WheelSegment = { label: string; color: string; probability?: number };

function loadWheelSegments(): WheelSegment[] {
  try {
    const s = localStorage.getItem(WHEEL_KEY);
    return s ? JSON.parse(s) : [];
  } catch { return []; }
}

function saveWheelSegments(segs: WheelSegment[]) {
  try { localStorage.setItem(WHEEL_KEY, JSON.stringify(segs)); } catch { /* ignore */ }
  fetch("/api/wheel-segments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ segments: segs }),
  }).catch((err) => console.error("Error syncing wheel segments to server:", err));
}

/* ─── Wheel Admin Section ─── */
function WheelAdminSection() {
  const [segments, setSegments] = useState<WheelSegment[]>([]);
  const [newLabel, setNewLabel] = useState("");
  const [newProbability, setNewProbability] = useState("10");
  const [newColor, setNewColor] = useState(WHEEL_COLORS[0]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setSegments(loadWheelSegments());
    fetch("/api/wheel-segments")
      .then((res) => res.json())
      .then((data) => {
        if (data.segments && Array.isArray(data.segments)) {
          setSegments(data.segments);
          try { localStorage.setItem(WHEEL_KEY, JSON.stringify(data.segments)); } catch {}
        }
      })
      .catch((err) => console.error("Error loading wheel segments:", err));
  }, []);

  const add = () => {
    const label = newLabel.trim();
    if (!label) return;
    const probVal = parseFloat(newProbability);
    if (isNaN(probVal) || probVal < 0 || probVal > 100) return;

    const next = [...segments, { label, color: newColor, probability: probVal / 100 }];
    setSegments(next);
    saveWheelSegments(next);
    setNewLabel("");
    setNewProbability("10");
    setNewColor(WHEEL_COLORS[(segments.length + 1) % WHEEL_COLORS.length]);
  };

  const remove = (idx: number) => {
    const next = segments.filter((_, i) => i !== idx);
    setSegments(next);
    saveWheelSegments(next);
  };

  if (!mounted) return null;

  return (
    <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6" dir="rtl">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0 text-xl">
          🎡
        </div>
        <div>
          <h2 style={{ fontFamily: "'Lalezar', serif" }} className="text-xl text-neutral-900 leading-tight">
            إدارة دولاب الحظ
          </h2>
          <p className="text-xs text-slate-500">الخيارات تظهر للزوار في صفحة المتجر</p>
        </div>
      </div>

      {/* إضافة خيار */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          type="text"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="اسم الجائزة (مثال: خصم 5%)"
          maxLength={25}
          className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-neutral-900 placeholder:text-slate-400 outline-none focus:border-neutral-400 transition-colors"
        />
        
        <div className="flex items-center gap-2">
          {/* حقل الاحتمالية */}
          <div className="relative flex-1 sm:w-28 flex items-center">
            <input
              type="number"
              min="0"
              max="100"
              step="any"
              value={newProbability}
              onChange={(e) => setNewProbability(e.target.value)}
              placeholder="الاحتمالية"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-7 pr-3 py-2.5 text-sm text-neutral-900 placeholder:text-slate-400 outline-none focus:border-neutral-400 transition-colors"
            />
            <span className="absolute left-3 text-xs text-slate-400 font-bold">%</span>
          </div>

          {/* منتقي الألوان */}
          <div className="relative flex items-center gap-1.5 px-2.5 py-2 rounded-xl border border-slate-200 bg-slate-50">
            <span className="text-xs text-slate-400">اللون:</span>
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="w-6 h-6 rounded cursor-pointer border-0 p-0 bg-transparent"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={add}
          disabled={!newLabel.trim() || !newProbability.trim()}
          className="rounded-xl bg-neutral-900 text-white px-5 py-2.5 text-sm font-semibold hover:bg-neutral-700 disabled:opacity-40 transition-all active:scale-95"
        >
          + إضافة
        </button>
      </div>

      {/* القائمة */}
      {segments.length === 0 ? (
        <div className="text-center py-8 rounded-xl border-2 border-dashed border-slate-200">
          <div className="text-3xl mb-2">🎡</div>
          <p className="text-sm text-slate-400">لا توجد خيارات بعد</p>
        </div>
      ) : (
        <ul className="space-y-2 max-h-64 overflow-y-auto">
          {segments.map((seg, i) => (
            <li key={i} className="flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
              <span
                className="h-4 w-4 rounded-full flex-shrink-0 border border-white shadow"
                style={{ backgroundColor: seg.color }}
              />
              <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-neutral-900 truncate">{seg.label}</span>
                <span className="font-mono text-xs font-semibold text-slate-500 bg-slate-200/50 px-2 py-0.5 rounded-md">
                  {((seg.probability ?? 0) * 100).toFixed(1)}%
                </span>
              </div>
              <button
                type="button"
                onClick={() => remove(i)}
                className="text-slate-300 hover:text-rose-500 transition-colors text-lg leading-none"
                aria-label="حذف"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {segments.length > 0 && (
        <div className="mt-4 p-3 rounded-xl bg-neutral-50 border border-slate-100 flex justify-between items-center text-xs">
          <span className="text-slate-500">إجمالي الاحتمالات:</span>
          {(() => {
            const totalProbability = segments.reduce((sum, seg) => sum + (seg.probability ?? 0) * 100, 0);
            return (
              <span className={`font-mono font-bold ${Math.abs(totalProbability - 100) < 0.01 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {totalProbability.toFixed(1)}% 
                {Math.abs(totalProbability - 100) > 0.01 && (
                  <span className="font-normal text-[10px] text-slate-400 block sm:inline sm:mr-1">
                    (يفضل أن يكون المجموع 100%)
                  </span>
                )}
              </span>
            );
          })()}
        </div>
      )}
    </section>
  );
}

/* ─── Delete Confirm Dialog ─── */
function DeleteConfirmDialog({
  productName,
  onConfirm,
  onCancel,
}: {
  productName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
      />
      {/* Dialog */}
      <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 max-w-sm w-full space-y-5 animate-[fadeIn_0.15s_ease-out]">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center border border-red-100">
            <i className="fa-solid fa-triangle-exclamation text-red-500 text-2xl" />
          </div>
          <h3 className="text-lg font-bold text-neutral-900">تأكيد الحذف</h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            هل أنت متأكد من حذف{" "}
            <span className="font-semibold text-neutral-900">«{productName}»</span>؟
            <br />
            لا يمكن التراجع عن هذه الخطوة.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-semibold rounded-xl text-sm transition-all"
          >
            <i className="fa-solid fa-trash-can ml-1.5" />
            نعم، احذف
          </button>
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 px-4 bg-white hover:bg-slate-50 active:scale-95 border border-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-all"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── مكوّن عرض أصناف وملاحظات الطلب ─── */
function OrderProductsCell({ text }: { text: string }) {
  if (!text) return <span className="text-slate-400 text-xs">لا يوجد أصناف</span>;

  const rawLines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const items: string[] = [];
  let note: string | null = null;
  let inNote = false;

  for (const line of rawLines) {
    if (line.startsWith("📝") || line.includes("ملاحظة العميل") || line.startsWith("ملاحظة:")) {
      inNote = true;
      const cleanLine = line.replace(/^📝\s*/, "").replace(/^ملاحظة العميل:?\s*/, "").trim();
      if (cleanLine) {
        note = (note ? note + "\n" : "") + cleanLine;
      }
    } else if (inNote) {
      note = (note ? note + "\n" : "") + line;
    } else {
      if (line.includes(" ، ")) {
        items.push(...line.split(" ، "));
      } else {
        items.push(line);
      }
    }
  }

  return (
    <div className="space-y-1.5 min-w-[220px] max-w-sm py-1" dir="rtl">
      {/* قائمة الأصناف */}
      <div className="space-y-1">
        {items.map((item, idx) => {
          const cleanItem = item.replace(/^[•\-\*]\s*/, "").trim();
          return (
            <div
              key={idx}
              className="flex items-center gap-2 bg-slate-50 border border-slate-200/90 rounded-lg px-2.5 py-1 text-xs text-neutral-900 font-semibold leading-normal shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
            >
              <span className="text-[#E0457D] text-sm leading-none">•</span>
              <span className="flex-1">{cleanItem}</span>
            </div>
          );
        })}
      </div>

      {/* صندوق ملاحظات العميل */}
      {note && (
        <div className="rounded-xl bg-amber-50 border border-amber-300/80 p-2 text-xs text-amber-950 leading-relaxed shadow-sm">
          <div className="flex items-center gap-1 font-bold text-amber-900 mb-0.5 text-[11px]">
            <span>📝</span>
            <span>ملاحظة العميل:</span>
          </div>
          <p className="whitespace-pre-line text-[11px] font-medium text-amber-900/90 pr-4">
            {note}
          </p>
        </div>
      )}
    </div>
  );
}

/* ─── Orders Admin Section ─── */
function OrdersAdminSection({
  orders,
  onUpdateStatus,
}: {
  orders: any[];
  onUpdateStatus: (id: string, status: string) => void;
}) {
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-amber-50 border-amber-200 text-amber-800";
      case "approved":
        return "bg-emerald-50 border-emerald-200 text-emerald-800";
      case "shipped":
        return "bg-sky-50 border-sky-200 text-sky-800";
      case "delivered":
        return "bg-indigo-50 border-indigo-200 text-indigo-800";
      case "cancelled":
      case "rejected":
        return "bg-rose-50 border-rose-200 text-rose-800";
      default:
        return "bg-slate-50 border-slate-200 text-slate-800";
    }
  };

  return (
    <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6" dir="rtl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center flex-shrink-0 text-lg">
          🛍️
        </div>
        <div>
          <h2 style={{ fontFamily: "'Lalezar', serif" }} className="text-2xl text-neutral-900 leading-tight">
            طلبات الشراء الواردة
          </h2>
          <p className="text-xs text-slate-500">إدارة الطلبات الواردة وتحديث حالات الشحن والدفع</p>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-20 rounded-2xl border-2 border-dashed border-slate-200">
          <div className="text-5xl mb-4">🛒</div>
          <h3 className="text-lg font-bold text-neutral-900">لا توجد طلبات بعد</h3>
          <p className="text-sm text-slate-400 mt-1">عندما يقوم الزوار بطلب منتجات، ستظهر هنا فوراً.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold border-b border-slate-100">
                <th className="px-6 py-4 text-right">العميل</th>
                <th className="px-6 py-4 text-right">العنوان والمدينة</th>
                <th className="px-6 py-4 text-right">الأصناف والملاحظات</th>
                <th className="px-6 py-4 text-right">الإجمالي</th>
                <th className="px-6 py-4 text-right">التاريخ</th>
                <th className="px-6 py-4 text-right">حالة الطلب</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {orders.map((order) => {
                const formattedDate = new Date(order.created_at).toLocaleString("ar-EG", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                    {/* العميل */}
                    <td className="px-6 py-4 font-semibold text-neutral-900">
                      <div>{order.customer_name}</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <a
                          href={`tel:${order.customer_phone}`}
                          className="text-xs text-slate-400 hover:text-neutral-900 flex items-center gap-1"
                        >
                          <i className="fa-solid fa-phone text-[10px]" /> {order.customer_phone}
                        </a>
                        <span className="text-slate-200">|</span>
                        <a
                          href={`https://wa.me/${order.customer_phone.replace(/\+/g, "").replace(/^0+/, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-emerald-500 hover:text-emerald-700 flex items-center gap-1 font-bold"
                        >
                          واتساب
                        </a>
                      </div>
                    </td>

                    {/* العنوان والمدينة */}
                    <td className="px-6 py-4 text-slate-600 font-medium">
                      {order.customer_city || "غير محدد"}
                    </td>

                    {/* المنتج والملاحظات المنظمة */}
                    <td className="px-6 py-4 text-neutral-900 font-medium align-top">
                      <OrderProductsCell text={order.product_name} />
                    </td>

                    {/* الإجمالي */}
                    <td className="px-6 py-4 font-bold text-neutral-900">
                      {order.product_price} ₪
                    </td>

                    {/* التاريخ */}
                    <td className="px-6 py-4 text-slate-400 text-xs">
                      {formattedDate}
                    </td>

                    {/* حالة الطلب */}
                    <td className="px-6 py-4">
                      <div className="relative inline-block w-full min-w-[140px]">
                        <select
                          value={order.status}
                          onChange={(e) => onUpdateStatus(order.id, e.target.value)}
                          className={`w-full appearance-none rounded-xl border px-3 py-2 text-xs font-semibold outline-none transition-colors bg-white cursor-pointer ${getStatusBadgeClass(
                            order.status
                          )}`}
                        >
                          <option value="pending">⏳ قيد الانتظار</option>
                          <option value="approved">✅ مقبول</option>
                          <option value="shipped">🚚 تم الشحن</option>
                          <option value="delivered">🏠 تم التوصيل</option>
                          <option value="cancelled">❌ ملغي</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* ─── Main Page ─── */
export default function AdminPage() {
  /* Data */
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredSubcategories, setFilteredSubcategories] = useState<Subcategory[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  /* Form */
  const [editingProduct, setEditingProduct] = useState<Product | null>(null); // null = add mode
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [inStock, setInStock] = useState(true);
  const [isNew, setIsNew] = useState(false);
  const [isTrending, setIsTrending] = useState(false);
  const [hasColors, setHasColors] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperSrc, setCropperSrc] = useState<string | null>(null);

  /* Table filters & pagination */
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<"products" | "orders">("products");

  /* UI */
  const [submitting, setSubmitting] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  /* ── Load Data ── */
  const loadData = async () => {
    setLoading(true);
    const [result, ordersResult] = await Promise.all([
      fetchAdminData(),
      fetchOrders()
    ]);
    
    if (result.success) {
      setCategories(
        result.categories && result.categories.length > 0 ? result.categories : FALLBACK_CATEGORIES
      );
      setSubcategories(
        result.subcategories && result.subcategories.length > 0
          ? result.subcategories
          : FALLBACK_SUBCATEGORIES
      );
      setProducts(result.products || []);
    } else {
      setCategories(FALLBACK_CATEGORIES);
      setSubcategories(FALLBACK_SUBCATEGORIES);
      console.warn("Supabase error (using fallback data):", result.error);
    }

    if (ordersResult.success) {
      setOrders(ordersResult.orders || []);
    } else {
      console.warn("Error loading orders:", ordersResult.error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  /* Filter subcategories on category change */
  useEffect(() => {
    if (categorySlug) {
      setFilteredSubcategories(subcategories.filter((s) => s.category_slug === categorySlug));
    } else {
      setFilteredSubcategories([]);
    }
  }, [categorySlug, subcategories]);

  /* Reset page when filters change */
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterCategory]);

  /* ── Toast ── */
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  /* ── Image handler ── */
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setImagePreviewUrl(url);
      setCropperSrc(url);
      setCropperOpen(true);
    }
  };

  /* ── Crop complete handler ── */
  const handleCropComplete = (croppedFile: File, previewUrl: string) => {
    setImageFile(croppedFile);
    setImagePreviewUrl(previewUrl);
    showToast("تم ضبط وتوسيط صورة المنتج بنجاح ✓", "success");
  };

  /* ── Reset Form ── */
  const resetForm = () => {
    setEditingProduct(null);
    setName("");
    setPrice("");
    setDescription("");
    setCategorySlug("");
    setSubcategoryId("");
    setIsFeatured(false);
    setInStock(true);
    setIsNew(false);
    setIsTrending(false);
    setHasColors(false);
    setImageFile(null);
    setImagePreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /* ── Start Edit ── */
  const handleStartEdit = (product: Product) => {
    setEditingProduct(product);
    setName(product.name);
    setPrice(String(product.price));
    // Strip tags from description
    const rawDesc = product.description || "";
    setDescription(rawDesc.replace(/\s*\[tag:(new|trending|colors)\]/g, "").trim());
    setCategorySlug(product.category_slug);
    setSubcategoryId(product.subcategory_id || "");
    setIsFeatured(product.is_featured);
    setInStock(product.in_stock);
    setIsNew(rawDesc.includes("[tag:new]"));
    setIsTrending(rawDesc.includes("[tag:trending]"));
    setHasColors(rawDesc.includes("[tag:colors]"));
    setImageFile(null);
    setImagePreviewUrl(product.image_url || null);
    if (fileInputRef.current) fileInputRef.current.value = "";

    // Scroll form into view on mobile
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  /* ── Submit (Add or Update) ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !price || !categorySlug) {
      showToast("يرجى ملء جميع الحقول الإلزامية", "error");
      return;
    }

    setSubmitting(true);
    const formData = new FormData();
    formData.append("name", name.trim());
    formData.append("price", price);
    formData.append("description", description.trim());
    formData.append("categorySlug", categorySlug);
    formData.append("subcategoryId", subcategoryId);
    formData.append("isFeatured", String(isFeatured));
    formData.append("inStock", String(inStock));
    formData.append("isNew", String(isNew));
    formData.append("isTrending", String(isTrending));
    formData.append("hasColors", String(hasColors));
    if (imageFile) formData.append("imageFile", imageFile);

    let result;
    if (editingProduct) {
      formData.append("existingImageUrl", editingProduct.image_url || "");
      result = await updateProduct(editingProduct.id, formData);
    } else {
      result = await createProduct(formData);
    }

    setSubmitting(false);

    if (result.success) {
      showToast(editingProduct ? "تم تحديث المنتج بنجاح ✓" : "تمت إضافة المنتج بنجاح ✓", "success");
      resetForm();
      loadData();
    } else {
      showToast(result.error || "حدث خطأ أثناء الحفظ", "error");
    }
  };

  /* ── Delete ── */
  const handleDeleteConfirmed = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    setActionId(target.id);
    const result = await deleteProduct(target.id, target.image_url);
    setActionId(null);
    if (result.success) {
      showToast("تم حذف المنتج بنجاح", "success");
      if (editingProduct?.id === target.id) resetForm();
      loadData();
    } else {
      showToast(result.error || "فشل حذف المنتج", "error");
    }
  };

  /* ── Toggle Stock ── */
  const handleToggleStock = async (id: string, currentStatus: boolean) => {
    setActionId(id);
    const result = await toggleStock(id, currentStatus);
    setActionId(null);
    if (result.success) {
      showToast("تم تحديث حالة المخزون بنجاح", "success");
      loadData();
    } else {
      showToast(result.error || "فشل تحديث حالة المخزون", "error");
    }
  };

  /* ── Update Order Status ── */
  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    const res = await updateOrderStatus(orderId, newStatus);
    if (res.success) {
      if (newStatus === "cancelled") {
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
        showToast("تم حذف الطلب بنجاح ✓", "success");
      } else {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
        );
        showToast("تم تحديث حالة الطلب بنجاح ✓", "success");
      }
    } else {
      showToast(res.error || "فشل تحديث حالة الطلب", "error");
    }
  };

  /* ── Computed / Filtered / Paginated ── */
  const filteredProducts = products.filter((p) => {
    const matchName = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = filterCategory ? p.category_slug === filterCategory : true;
    return matchName && matchCat;
  });

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedProducts = filteredProducts.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const totalCount = products.length;
  const inStockCount = products.filter((p) => p.in_stock).length;
  const outOfStockCount = products.filter((p) => !p.in_stock).length;

  /* ─────────────────────────── JSX ─────────────────────────── */
  return (
    <div
      className="min-h-screen bg-slate-50 text-slate-800 font-body py-12 px-4 sm:px-6 lg:px-8"
      dir="rtl"
    >
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-3.5 rounded-xl shadow-lg border transition-all duration-300 ${
            toast.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <i
            className={`fa-solid ${
              toast.type === "success" ? "fa-circle-check" : "fa-circle-exclamation"
            } text-lg`}
          />
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Delete Confirm Dialog */}
      {deleteTarget && (
        <DeleteConfirmDialog
          productName={deleteTarget.name}
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <div className="max-w-7xl mx-auto space-y-10">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <h1
              style={{ fontFamily: "'Lalezar', serif" }}
              className="text-4xl text-neutral-900 leading-tight"
            >
              لوحة التحكم المشرف
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              إضافة وإدارة منتجات متجر July Accessories
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-slate-200 hover:border-slate-400 rounded-xl text-sm font-semibold transition-all hover:bg-slate-50"
          >
            <i className="fa-solid fa-arrow-left" />
            العودة للمتجر الرئيسي
          </Link>
        </header>

        {loading && products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 space-y-3">
            <i className="fa-solid fa-circle-notch animate-spin text-3xl text-neutral-900" />
            <p className="text-sm">جاري تحميل لوحة التحكم...</p>
          </div>
        ) : (
          <>
            {/* ── Stats Bar ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Total */}
              <div className="bg-white border border-slate-200 rounded-2xl px-5 py-4 flex items-center gap-4 shadow-sm min-w-0">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <i className="fa-solid fa-box text-slate-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-neutral-900 leading-none">{totalCount}</div>
                  <div className="text-xs text-slate-500 mt-0.5">إجمالي المنتجات</div>
                </div>
              </div>

              {/* In stock */}
              <div className="bg-white border border-emerald-100 rounded-2xl px-5 py-4 flex items-center gap-4 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <i className="fa-solid fa-circle-check text-emerald-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-emerald-700 leading-none">{inStockCount}</div>
                  <div className="text-xs text-slate-500 mt-0.5">متوفرة</div>
                </div>
              </div>

              {/* Out of stock */}
              <div className="bg-white border border-rose-100 rounded-2xl px-5 py-4 flex items-center gap-4 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center flex-shrink-0">
                  <i className="fa-solid fa-circle-xmark text-rose-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-rose-600 leading-none">{outOfStockCount}</div>
                  <div className="text-xs text-slate-500 mt-0.5">نافدة</div>
                </div>
              </div>
            </div>

            {/* ── Tabs Bar ── */}
            <div className="flex gap-4 border-b border-slate-200 pb-px mb-6">
              <button
                type="button"
                onClick={() => setActiveTab("products")}
                className={`py-3 px-6 text-sm font-bold border-b-2 transition-all ${
                  activeTab === "products"
                    ? "border-neutral-900 text-neutral-900"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                📦 إدارة المنتجات ({totalCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("orders")}
                className={`py-3 px-6 text-sm font-bold border-b-2 transition-all ${
                  activeTab === "orders"
                    ? "border-neutral-900 text-neutral-900"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                🛍️ إدارة الطلبات ({orders.length})
              </button>
            </div>

            {activeTab === "products" ? (
              <>
                {/* ── Wheel Admin ── */}
                <WheelAdminSection />

                {/* ── Main Grid ── */}
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 items-start w-full min-w-0">
                  {/* ── Form ── */}
                  <section
                    ref={formRef}
                    className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-6 lg:sticky lg:top-6 w-full"
                  >
                <div className="flex items-center justify-between">
                  <h2
                    style={{ fontFamily: "'Lalezar', serif" }}
                    className="text-2xl text-neutral-900"
                  >
                    {editingProduct ? "تعديل المنتج" : "إضافة منتج جديد"}
                  </h2>
                  {editingProduct && (
                    <button
                      onClick={resetForm}
                      title="إلغاء التعديل"
                      className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg p-1.5 transition-all text-sm"
                    >
                      <i className="fa-solid fa-xmark" />
                    </button>
                  )}
                </div>

                {editingProduct && (
                  <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs text-amber-800 font-semibold">
                    <i className="fa-solid fa-pen-to-square" />
                    وضع التعديل — {editingProduct.name}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Image Upload */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-700">صورة المنتج</label>
                      {imagePreviewUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setCropperSrc(imagePreviewUrl);
                            setCropperOpen(true);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#E0457D] hover:underline"
                        >
                          <span>✂️</span>
                          <span>تحريك / قص الصورة</span>
                        </button>
                      )}
                    </div>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-200 hover:border-slate-400 rounded-xl cursor-pointer aspect-video flex flex-col items-center justify-center bg-slate-50 overflow-hidden relative group transition-colors"
                    >
                      {imagePreviewUrl ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={imagePreviewUrl}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                            تغيير الصورة
                          </div>
                        </>
                      ) : (
                        <div className="text-center p-4 space-y-2">
                          <i className="fa-regular fa-image text-3xl text-slate-400 group-hover:text-slate-600 transition-colors" />
                          <p className="text-xs text-slate-500">اضغط لرفع صورة المنتج</p>
                        </div>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </div>

                  {/* Name */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">
                      اسم المنتج <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      placeholder="مثال: أسوارة الفراشة الفضية"
                      className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all bg-white"
                    />
                  </div>

                  {/* Price */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">
                      السعر (شيكل ₪) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      required
                      placeholder="مثال: 45"
                      min="1"
                      step="any"
                      className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all bg-white"
                    />
                  </div>

                  {/* Category */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">
                      القسم الرئيسي <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={categorySlug}
                      onChange={(e) => {
                        setCategorySlug(e.target.value);
                        setSubcategoryId("");
                      }}
                      required
                      className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all bg-white"
                    >
                      <option value="">اختر القسم الرئيسي</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.slug}>
                          {cat.title_ar}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Subcategory */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">القسم الفرعي</label>
                    <select
                      value={subcategoryId}
                      onChange={(e) => setSubcategoryId(e.target.value)}
                      disabled={!categorySlug}
                      className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all bg-white disabled:bg-slate-50 disabled:text-slate-400"
                    >
                      <option value="">اختر القسم الفرعي (اختياري)</option>
                      {filteredSubcategories.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.title_ar}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Description */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">الوصف</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="تفاصيل حول مادة الصنع، القياس، مميزات المنتج..."
                      rows={3}
                      className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all bg-white resize-none"
                    />
                  </div>

                  {/* Checkboxes */}
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    {[
                      { label: "منتج مميز", value: isFeatured, setter: setIsFeatured },
                      { label: "متوفر بالمخزون", value: inStock, setter: setInStock },
                      { label: "منتج جديد", value: isNew, setter: setIsNew },
                      { label: "منتج ترند", value: isTrending, setter: setIsTrending },
                      { label: "خيارات ألوان (ذهبي / فضي)", value: hasColors, setter: setHasColors },
                    ].map(({ label, value, setter }) => (
                      <label key={label} className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={(e) => setter(e.target.checked)}
                          className="rounded text-neutral-900 focus:ring-neutral-900 border-slate-300 w-4 h-4"
                        />
                        <span className="text-xs font-semibold text-slate-700">{label}</span>
                      </label>
                    ))}
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 px-5 bg-black hover:bg-neutral-800 text-white font-semibold rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-2 disabled:bg-neutral-400 active:scale-95"
                  >
                    {submitting ? (
                      <>
                        <i className="fa-solid fa-spinner animate-spin" />
                        جاري الحفظ...
                      </>
                    ) : editingProduct ? (
                      <>
                        <i className="fa-solid fa-floppy-disk" />
                        تحديث المنتج
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-plus" />
                        أضف المنتج
                      </>
                    )}
                  </button>
                </form>
              </section>

              {/* ── Products Table ── */}
              <section className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col w-full min-w-0">
                {/* Table Header */}
                <div className="p-5 border-b border-slate-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2
                      style={{ fontFamily: "'Lalezar', serif" }}
                      className="text-2xl text-neutral-900"
                    >
                      قائمة المنتجات ({filteredProducts.length})
                    </h2>
                    <button
                      onClick={loadData}
                      className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
                      title="تحديث البيانات"
                    >
                      <i className={`fa-solid fa-arrows-rotate ${loading ? "animate-spin" : ""}`} />
                    </button>
                  </div>

                  {/* Search + Filter */}
                  <div className="flex flex-col sm:flex-row gap-3 w-full min-w-0">
                    {/* Search */}
                    <div className="relative flex-1 min-w-0">
                      <i className="fa-solid fa-magnifying-glass absolute top-1/2 -translate-y-1/2 right-3.5 text-slate-400 text-sm pointer-events-none" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="ابحثي باسم المنتج..."
                        className="w-full pr-10 pl-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all bg-white"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery("")}
                          className="absolute top-1/2 -translate-y-1/2 left-3 text-slate-400 hover:text-slate-700"
                        >
                          <i className="fa-solid fa-xmark text-xs" />
                        </button>
                      )}
                    </div>

                    {/* Category filter */}
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="w-full sm:w-auto text-sm border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all bg-white min-w-0 sm:min-w-[160px]"
                    >
                      <option value="">كل الأقسام</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.slug}>
                          {cat.title_ar}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Table Body */}
                {filteredProducts.length === 0 ? (
                  <div className="text-center py-20 text-slate-400 space-y-2 flex-1 flex flex-col items-center justify-center">
                    <i className="fa-solid fa-box-open text-4xl" />
                    <p className="text-sm">
                      {searchQuery || filterCategory
                        ? "لا توجد نتائج مطابقة للبحث."
                        : "لا توجد منتجات مضافة حالياً."}
                    </p>
                    {(searchQuery || filterCategory) && (
                      <button
                        onClick={() => { setSearchQuery(""); setFilterCategory(""); }}
                        className="mt-2 text-xs text-neutral-900 underline underline-offset-2"
                      >
                        إزالة الفلتر
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto min-w-0">
                      <table className="w-full text-right border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500">
                            <th className="py-4 px-6">المنتج</th>
                            <th className="py-4 px-4">السعر</th>
                            <th className="py-4 px-4">القسم والفرع</th>
                            <th className="py-4 px-4 text-center">التوفر</th>
                            <th className="py-4 px-6 text-center">خيارات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                          {paginatedProducts.map((product) => {
                            const isLoading = actionId === product.id;
                            const isBeingEdited = editingProduct?.id === product.id;
                            const categoryName =
                              categories.find((c) => c.slug === product.category_slug)?.title_ar ||
                              product.category_slug;
                            const subcategoryName = product.subcategories?.title_ar || "—";

                            return (
                              <tr
                                key={product.id}
                                className={`transition-colors ${
                                  isBeingEdited
                                    ? "bg-amber-50/60 border-r-2 border-r-amber-400"
                                    : "hover:bg-slate-50/50"
                                }`}
                              >
                                {/* Image + Name */}
                                <td className="py-4 px-6 flex items-center gap-3">
                                  <div className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden border border-slate-200/60 flex-shrink-0 flex items-center justify-center">
                                    {product.image_url ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img
                                        src={product.image_url}
                                        alt={product.name}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                      />
                                    ) : (
                                      <i className="fa-regular fa-image text-slate-300" />
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <h4
                                      className="font-semibold text-neutral-900 truncate max-w-[180px]"
                                      title={product.name}
                                    >
                                      {product.name}
                                    </h4>
                                    <div className="flex flex-wrap gap-1 mt-0.5">
                                      {product.is_featured && (
                                        <span className="px-1.5 py-0.5 bg-neutral-900 text-white text-[9px] font-extrabold rounded">
                                          مميز
                                        </span>
                                      )}
                                      {product.description?.includes("[tag:new]") && (
                                        <span className="px-1.5 py-0.5 bg-emerald-600 text-white text-[9px] font-extrabold rounded">
                                          جديد
                                        </span>
                                      )}
                                      {product.description?.includes("[tag:trending]") && (
                                        <span className="px-1.5 py-0.5 bg-rose-600 text-white text-[9px] font-extrabold rounded">
                                          ترند
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </td>

                                {/* Price */}
                                <td className="py-4 px-4 font-mono font-medium text-neutral-900">
                                  {product.price} ₪
                                </td>

                                {/* Category */}
                                <td className="py-4 px-4 text-xs text-slate-500">
                                  <div className="font-semibold text-neutral-900">{categoryName}</div>
                                  <div className="text-[10px] mt-0.5">{subcategoryName}</div>
                                </td>

                                {/* Stock toggle */}
                                <td className="py-4 px-4 text-center">
                                  <button
                                    disabled={isLoading}
                                    onClick={() => handleToggleStock(product.id, product.in_stock)}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm transition-all border ${
                                      product.in_stock
                                        ? "bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100"
                                        : "bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100"
                                    } disabled:opacity-50`}
                                    title="اضغط لتغيير حالة التوفر"
                                  >
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full ${
                                        product.in_stock ? "bg-emerald-500" : "bg-rose-500"
                                      }`}
                                    />
                                    {product.in_stock ? "متوفر" : "نفد"}
                                  </button>
                                </td>

                                {/* Actions */}
                                <td className="py-4 px-6 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    {/* Edit */}
                                    <button
                                      disabled={isLoading}
                                      onClick={() => handleStartEdit(product)}
                                      className={`p-2 rounded-xl transition-all disabled:opacity-50 ${
                                        isBeingEdited
                                          ? "bg-amber-100 text-amber-700"
                                          : "text-slate-500 hover:text-neutral-900 hover:bg-slate-100"
                                      }`}
                                      title="تعديل المنتج"
                                    >
                                      <i className="fa-regular fa-pen-to-square text-sm" />
                                    </button>

                                    {/* Delete */}
                                    <button
                                      disabled={isLoading}
                                      onClick={() => setDeleteTarget(product)}
                                      className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-all disabled:opacity-50"
                                      title="حذف المنتج"
                                    >
                                      {isLoading ? (
                                        <i className="fa-solid fa-spinner animate-spin text-sm" />
                                      ) : (
                                        <i className="fa-regular fa-trash-can text-sm" />
                                      )}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                        <p className="text-xs text-slate-500">
                          عرض {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredProducts.length)} من {filteredProducts.length} منتج
                        </p>
                        <div className="flex items-center gap-1.5">
                          {/* Prev */}
                          <button
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={safePage === 1}
                            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-white hover:border-slate-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-xs"
                          >
                            <i className="fa-solid fa-chevron-right" />
                          </button>

                          {/* Page Numbers */}
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                            <button
                              key={page}
                              onClick={() => setCurrentPage(page)}
                              className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-semibold transition-all border ${
                                page === safePage
                                  ? "bg-neutral-900 text-white border-neutral-900"
                                  : "bg-white border-slate-200 text-slate-600 hover:border-slate-400"
                              }`}
                            >
                              {page}
                            </button>
                          ))}

                          {/* Next */}
                          <button
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={safePage === totalPages}
                            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-white hover:border-slate-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-xs"
                          >
                            <i className="fa-solid fa-chevron-left" />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </section>
            </div>
          </>
        ) : (
          <OrdersAdminSection orders={orders} onUpdateStatus={handleUpdateStatus} />
        )}
      </>
    )}
      </div>

      {/* مودال ضبط وتوسيط الصورة */}
      <ImageCropperModal
        isOpen={cropperOpen}
        onClose={() => setCropperOpen(false)}
        imageSrc={cropperSrc}
        fileName={imageFile?.name || `${name.trim() || "product"}.jpg`}
        onCropComplete={handleCropComplete}
      />
    </div>
  );
}
