"use client";

import { useState, useMemo } from "react";
import { saveSubcategoriesSettingsAction } from "@/app/admin/actions";

interface Category {
  id: string;
  slug: string;
  title_ar: string;
  title_en: string;
}

interface Subcategory {
  id: string;
  category_slug: string;
  title_ar: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  in_stock: boolean;
  category_slug: string;
  subcategory_id: string | null;
  subcategories?: { title_ar: string } | null;
}

export interface SubcategoriesSettings {
  hidden_ids: string[];
  hidden_categories?: string[];
  auto_hide_empty: boolean;
}

interface SectionsAdminSectionProps {
  categories: Category[];
  subcategories: Subcategory[];
  products: Product[];
  initialSettings: SubcategoriesSettings;
  onToast: (msg: string, type: "success" | "error") => void;
  onRefresh?: () => Promise<void>;
}

export default function SectionsAdminSection({
  categories,
  subcategories,
  products,
  initialSettings,
  onToast,
  onRefresh,
}: SectionsAdminSectionProps) {
  const [settings, setSettings] = useState<SubcategoriesSettings>(() => ({
    hidden_ids: initialSettings.hidden_ids || [],
    hidden_categories: initialSettings.hidden_categories || [],
    auto_hide_empty: !!initialSettings.auto_hide_empty,
  }));

  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCatFilter, setSelectedCatFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "visible" | "hidden" | "out_of_stock">("all");

  // حساب إحصائيات المنتجات لكل قسم فرعي
  const subcategoryStats = useMemo(() => {
    const stats: Record<string, { total: number; inStock: number; outOfStock: number }> = {};

    subcategories.forEach((sub) => {
      stats[sub.id] = { total: 0, inStock: 0, outOfStock: 0 };
    });

    products.forEach((p) => {
      if (p.subcategory_id && stats[p.subcategory_id]) {
        stats[p.subcategory_id].total += 1;
        if (p.in_stock) {
          stats[p.subcategory_id].inStock += 1;
        } else {
          stats[p.subcategory_id].outOfStock += 1;
        }
      }
    });

    return stats;
  }, [subcategories, products]);

  // حفظ التعديلات في السيرفر
  const handleSaveSettings = async (newSettings: SubcategoriesSettings, successMsg: string, key?: string) => {
    if (key) setSavingKey(key);
    try {
      const res = await saveSubcategoriesSettingsAction(newSettings);
      if (res.success) {
        setSettings(newSettings);
        onToast(successMsg, "success");
        if (onRefresh) await onRefresh();
      } else {
        onToast(res.error || "فشل في حفظ التعديلات", "error");
      }
    } catch (err: any) {
      onToast(err.message || "حدث خطأ غير متوقع", "error");
    } finally {
      if (key) setSavingKey(null);
    }
  };

  // تبديل إظهار / إخفاء قسم فرعي
  const toggleSubcategory = (sub: Subcategory) => {
    const isManuallyHidden =
      settings.hidden_ids.includes(sub.id) || settings.hidden_ids.includes(sub.title_ar);
    const stats = subcategoryStats[sub.id] || { total: 0, inStock: 0, outOfStock: 0 };
    const isAutoHidden = settings.auto_hide_empty && stats.inStock === 0;
    const isEffectivelyHidden = isManuallyHidden || isAutoHidden;
    
    let updatedHiddenIds: string[];

    if (isEffectivelyHidden) {
      // إظهار: إزالة الـ ID والاسم
      updatedHiddenIds = settings.hidden_ids.filter((id) => id !== sub.id && id !== sub.title_ar);
    } else {
      // إخفاء: إضافة الـ ID والاسم معاً لضمان التطابق
      updatedHiddenIds = Array.from(new Set([...settings.hidden_ids, sub.id, sub.title_ar]));
    }

    const nextSettings: SubcategoriesSettings = {
      ...settings,
      hidden_ids: updatedHiddenIds,
    };

    const actionText = isEffectivelyHidden
      ? `تم إظهار قسم "${sub.title_ar}" في المتجر`
      : `تم إخفاء قسم "${sub.title_ar}" من المتجر`;
    handleSaveSettings(nextSettings, actionText, sub.id);
  };

  // تبديل إظهار / إخفاء قسم رئيسي كامل
  const toggleCategory = (cat: Category) => {
    const hiddenCats = settings.hidden_categories || [];
    const isCurrentlyHidden = hiddenCats.includes(cat.slug);

    let updatedHiddenCats: string[];
    if (isCurrentlyHidden) {
      updatedHiddenCats = hiddenCats.filter((s) => s !== cat.slug);
    } else {
      updatedHiddenCats = [...hiddenCats, cat.slug];
    }

    const nextSettings: SubcategoriesSettings = {
      ...settings,
      hidden_categories: updatedHiddenCats,
    };

    const actionText = isCurrentlyHidden
      ? `تم إظهار قسم "${cat.title_ar}" بالكامل`
      : `تم إخفاء قسم "${cat.title_ar}" بالكامل من المتجر`;
    handleSaveSettings(nextSettings, actionText, `cat-${cat.slug}`);
  };

  // تبديل خيار الإخفاء التلقائي عند نفاد المنتجات
  const toggleAutoHideEmpty = () => {
    const nextVal = !settings.auto_hide_empty;
    const nextSettings: SubcategoriesSettings = {
      ...settings,
      auto_hide_empty: nextVal,
    };
    const msg = nextVal
      ? "تم تفعيل الإخفاء التلقائي للأقسام الفارغة"
      : "تم تعطيل الإخفاء التلقائي للأقسام الفارغة";
    handleSaveSettings(nextSettings, msg, "auto_hide");
  };

  // إخفاء جميع الأقسام الفارغة بنقرة واحدة
  const hideAllEmptySubcategories = () => {
    const emptySubIdsAndTitles: string[] = [];
    subcategories.forEach((sub) => {
      const stats = subcategoryStats[sub.id];
      if (!stats || stats.inStock === 0) {
        emptySubIdsAndTitles.push(sub.id);
        emptySubIdsAndTitles.push(sub.title_ar);
      }
    });

    const merged = Array.from(new Set([...settings.hidden_ids, ...emptySubIdsAndTitles]));
    const nextSettings: SubcategoriesSettings = {
      ...settings,
      hidden_ids: merged,
    };

    handleSaveSettings(
      nextSettings,
      `تم إخفاء الأقسام الفارغة بنجاح`,
      "bulk-empty"
    );
  };

  // إظهار جميع الأقسام بنقرة واحدة
  const showAllSubcategories = () => {
    const nextSettings: SubcategoriesSettings = {
      ...settings,
      hidden_ids: [],
      hidden_categories: [],
    };
    handleSaveSettings(nextSettings, "تم إظهار جميع الأقسام والأجزاء الفرعية في المتجر", "bulk-all");
  };

  // تصفية الأقسام حسب البحث والفلاتر
  const filteredCategories = useMemo(() => {
    return categories
      .filter((c) => c.slug !== "wheel_settings" && c.slug !== "subcategories_settings")
      .filter((c) => {
        if (selectedCatFilter !== "all" && c.slug !== selectedCatFilter) return false;
        return true;
      });
  }, [categories, selectedCatFilter]);

  // إحصائيات سريعة عامة
  const totalSubcategories = subcategories.length;
  const totalHiddenCount = subcategories.filter(
    (s) => settings.hidden_ids.includes(s.id) || settings.hidden_ids.includes(s.title_ar)
  ).length;
  const emptySubcategoriesCount = subcategories.filter(
    (s) => (subcategoryStats[s.id]?.inStock || 0) === 0
  ).length;

  return (
    <div className="space-y-8" dir="rtl">
      {/* ── الرأس والوصف ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 text-rose-600 text-xs font-semibold mb-3">
              <i className="fa-solid fa-sliders" />
              التحكم في الظهور والعرض
            </div>
            <h2 className="text-2xl font-bold text-neutral-900 leading-tight">
              إدارة الأقسام والأجزاء الفرعية
            </h2>
            <p className="text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
              إذا نفدت منتجات قسم فرعي معين (أو ترغب في إخفائه مؤقتاً لأي سبب)، يمكنك إخفاؤه بضغطة زر واحدة حتى لا يظهر للزبائن في المتجر، وتستطيع إعادته للظهور في أي وقت.
            </p>
          </div>

          {/* أزرار الإجراءات السريعة */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={hideAllEmptySubcategories}
              disabled={savingKey !== null}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-xl text-xs sm:text-sm font-semibold transition-all disabled:opacity-50"
            >
              <i className="fa-solid fa-eye-slash" />
              إخفاء الأقسام الفارغة ({emptySubcategoriesCount})
            </button>
            <button
              type="button"
              onClick={showAllSubcategories}
              disabled={savingKey !== null}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold transition-all disabled:opacity-50"
            >
              <i className="fa-solid fa-eye" />
              إظهار الكل
            </button>
          </div>
        </div>

        {/* ── خيار الإخفاء التلقائي عند نفاد المخزون ── */}
        <div className="mt-6 pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-gradient-to-r from-amber-50/70 to-orange-50/50 border border-amber-200/80">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <i className="fa-solid fa-bolt text-lg" />
            </div>
            <div>
              <div className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                <span>الإخفاء التلقائي للأقسام الفرعية عند نفاد المنتجات</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-200/70 text-amber-900">
                  خيار ذكي
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                عند تفعيل هذا الخيار، أي قسم فرعي تنفد جميع منتجاته (0 متوفر) سيختفي تلقائياً من المتجر للمتسوقين، ويعود للظهور بمجرد توفر منتجات فيه.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleAutoHideEmpty}
            disabled={savingKey === "auto_hide"}
            className={`relative inline-flex h-7 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              settings.auto_hide_empty ? "bg-emerald-500" : "bg-slate-300"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                settings.auto_hide_empty ? "-translate-x-7" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* ── إحصائيات سريعة ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl text-center">
            <div className="text-xl font-bold text-neutral-900">{totalSubcategories}</div>
            <div className="text-xs text-slate-500 mt-0.5">إجمالي الأقسام الفرعية</div>
          </div>
          <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl text-center">
            <div className="text-xl font-bold text-emerald-700">
              {totalSubcategories - totalHiddenCount}
            </div>
            <div className="text-xs text-emerald-600 mt-0.5">ظاهرة حالياً في المتجر</div>
          </div>
          <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-center">
            <div className="text-xl font-bold text-rose-700">{totalHiddenCount}</div>
            <div className="text-xs text-rose-600 mt-0.5">مخفية يدوياً</div>
          </div>
          <div className="p-3.5 bg-amber-50 border border-amber-100 rounded-xl text-center">
            <div className="text-xl font-bold text-amber-700">{emptySubcategoriesCount}</div>
            <div className="text-xs text-amber-600 mt-0.5">أقسام نفدت منتجاتها</div>
          </div>
        </div>
      </div>

      {/* ── شريط البحث والتصفية ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <i className="fa-solid fa-magnifying-glass absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
            <input
              type="text"
              placeholder="ابحث عن قسم أو قسم فرعي..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-3 pr-9 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-neutral-900 transition-colors"
            />
          </div>

          {/* فلاتر الحالة */}
          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                statusFilter === "all"
                  ? "bg-neutral-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              الكل
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("visible")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                statusFilter === "visible"
                  ? "bg-emerald-600 text-white"
                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              }`}
            >
              الظاهرة فقط
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("hidden")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                statusFilter === "hidden"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-red-50 text-red-700 hover:bg-red-100"
              }`}
            >
              المخفية فقط
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("out_of_stock")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                statusFilter === "out_of_stock"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-orange-50 text-orange-700 hover:bg-orange-100"
              }`}
            >
              التي نفدت منتجاتها
            </button>
          </div>
        </div>

        {/* فلاتر الأقسام الرئيسية */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <span className="text-xs text-slate-500 font-semibold ml-2">الفئة:</span>
          <button
            type="button"
            onClick={() => setSelectedCatFilter("all")}
            className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
              selectedCatFilter === "all"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            جميع الفئات
          </button>
          {categories
            .filter((c) => c.slug !== "wheel_settings" && c.slug !== "subcategories_settings")
            .map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCatFilter(c.slug)}
                className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                  selectedCatFilter === c.slug
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {c.title_ar}
              </button>
            ))}
        </div>
      </div>

      {/* ── عرض الأقسام والأجزاء الفرعية ── */}
      <div className="space-y-6">
        {filteredCategories.map((cat) => {
          const isCategoryHidden = (settings.hidden_categories || []).includes(cat.slug);
          const catSubcategories = subcategories.filter((s) => s.category_slug === cat.slug);

          // تصفية الأقسام الفرعية حسب البحث والحالة
          const displayedSubcategories = catSubcategories.filter((sub) => {
            const stats = subcategoryStats[sub.id] || { total: 0, inStock: 0, outOfStock: 0 };
            const isHidden =
              settings.hidden_ids.includes(sub.id) || settings.hidden_ids.includes(sub.title_ar);

            if (searchQuery) {
              const q = searchQuery.toLowerCase().trim();
              const matchName = sub.title_ar.toLowerCase().includes(q);
              const matchCat = cat.title_ar.toLowerCase().includes(q);
              if (!matchName && !matchCat) return false;
            }

            if (statusFilter === "visible" && isHidden) return false;
            if (statusFilter === "hidden" && !isHidden) return false;
            if (statusFilter === "out_of_stock" && stats.inStock > 0) return false;

            return true;
          });

          if (displayedSubcategories.length === 0 && searchQuery) {
            return null;
          }

          return (
            <div
              key={cat.id}
              className={`bg-white border rounded-2xl overflow-hidden shadow-sm transition-all ${
                isCategoryHidden
                  ? "border-rose-200 bg-rose-50/20"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              {/* ترويسة القسم الرئيسي */}
              <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center font-bold text-sm">
                    {cat.title_ar.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-neutral-900">{cat.title_ar}</h3>
                      <span className="text-[11px] text-slate-400 font-mono tracking-wider">
                        {cat.title_en}
                      </span>
                      {isCategoryHidden && (
                        <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">
                          القسم كامل مخفي
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      يحتوي على {catSubcategories.length} أقسام فرعية
                    </div>
                  </div>
                </div>

                {/* زر إخفاء/إظهار القسم الرئيسي كاملاً */}
                <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                  <span className="text-xs font-semibold text-slate-600">
                    {isCategoryHidden ? "القسم مخفي" : "القسم ظاهر بالمتجر"}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    disabled={savingKey === `cat-${cat.slug}`}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      !isCategoryHidden ? "bg-emerald-500" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        !isCategoryHidden ? "-translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* بطاقات الأجزاء الفرعية */}
              <div className="p-5 sm:p-6">
                {displayedSubcategories.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    لا توجد أقسام فرعية مطابقة للفلتر المحدد
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {displayedSubcategories.map((sub) => {
                      const stats = subcategoryStats[sub.id] || {
                        total: 0,
                        inStock: 0,
                        outOfStock: 0,
                      };
                      const isHidden =
                        settings.hidden_ids.includes(sub.id) ||
                        settings.hidden_ids.includes(sub.title_ar);
                      const isAutoHiddenByEmpty =
                        settings.auto_hide_empty && stats.inStock === 0 && !isHidden;
                      const isEffectivelyHidden = isHidden || isAutoHiddenByEmpty;
                      const isSaving = savingKey === sub.id;

                      return (
                        <div
                          key={sub.id}
                          className={`relative p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between ${
                            isEffectivelyHidden
                              ? "bg-slate-50/80 border-slate-200 opacity-80"
                              : "bg-white border-slate-200 hover:border-slate-300 shadow-sm"
                          }`}
                        >
                          <div>
                            {/* العنوان وحالة الظهور */}
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div>
                                <h4 className="font-bold text-sm text-neutral-900 leading-snug">
                                  {sub.title_ar}
                                </h4>
                                <span className="text-[10px] text-slate-400">
                                  {cat.title_ar}
                                </span>
                              </div>

                              {/* زر السويتش الفوري */}
                              <button
                                type="button"
                                onClick={() => toggleSubcategory(sub)}
                                disabled={isSaving}
                                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                  !isEffectivelyHidden ? "bg-emerald-500" : "bg-slate-300"
                                }`}
                                title={!isEffectivelyHidden ? "ظاهر في المتجر - انقر للإخفاء" : "مخفي من المتجر - انقر للإظهار"}
                              >
                                <span
                                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                    !isEffectivelyHidden ? "-translate-x-5" : "translate-x-0"
                                  }`}
                                />
                              </button>
                            </div>

                            {/* شارة الحالة الحالية */}
                            <div className="flex flex-wrap items-center gap-1.5 mb-3">
                              {isHidden ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 text-[11px] font-semibold">
                                  <i className="fa-solid fa-eye-slash text-[9px]" />
                                  مخفي يدوياً من المتجر
                                </span>
                              ) : isAutoHiddenByEmpty ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[11px] font-semibold">
                                  <i className="fa-solid fa-bolt text-[9px]" />
                                  مخفي تلقائياً (نفاد المخزون)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-semibold">
                                  <i className="fa-solid fa-eye text-[9px]" />
                                  ظاهر في المتجر
                                </span>
                              )}

                              {stats.inStock === 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 text-red-600 text-[11px] font-bold">
                                  ⚠️ نفدت المنتجات
                                </span>
                              )}
                            </div>
                          </div>

                          {/* عداد المنتجات في هذا القسم الفرعي */}
                          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                            <div>
                              <span>إجمالي المنتجات: </span>
                              <strong className="text-neutral-800 font-semibold">
                                {stats.total}
                              </strong>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[11px]">
                                {stats.inStock} متوفر
                              </span>
                              {stats.outOfStock > 0 && (
                                <span className="text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded text-[11px]">
                                  {stats.outOfStock} نافد
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
