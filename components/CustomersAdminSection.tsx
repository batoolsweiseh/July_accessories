"use client";

import { useState, useMemo } from "react";
import { CustomerUser, LoyaltyHistoryItem } from "@/lib/loyalty";
import { adjustCustomerPointsAction } from "@/app/admin/actions";

interface CustomersAdminSectionProps {
  customers: CustomerUser[];
  onRefresh: () => Promise<void>;
  onToast: (msg: string, type: "success" | "error") => void;
}

export default function CustomersAdminSection({
  customers,
  onRefresh,
  onToast,
}: CustomersAdminSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "with_points" | "used_codes">("all");

  // مودال تعديل النقاط (إضافة / خصم)
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerUser | null>(null);
  const [adjustMode, setAdjustMode] = useState<"add" | "deduct">("add");
  const [pointsInput, setPointsInput] = useState<string>("50");
  const [reasonInput, setReasonInput] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // مودال عرض سجل الحركات
  const [historyCustomer, setHistoryCustomer] = useState<CustomerUser | null>(null);

  // تصفية العملاء
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.used_codes.some((code) => code.toLowerCase().includes(q));

      if (!matchSearch) return false;

      if (filterType === "with_points") return c.points > 0;
      if (filterType === "used_codes") return c.used_codes.length > 0;
      return true;
    });
  }, [customers, searchQuery, filterType]);

  // إحصائيات سريعة
  const totalPoints = useMemo(() => {
    return customers.reduce((sum, c) => sum + (c.points || 0), 0);
  }, [customers]);

  const totalUsersWithPoints = useMemo(() => {
    return customers.filter((c) => c.points > 0).length;
  }, [customers]);

  // فتح مودال إضافة أو خصم النقاط
  const openAdjustModal = (customer: CustomerUser, mode: "add" | "deduct") => {
    setSelectedCustomer(customer);
    setAdjustMode(mode);
    setPointsInput("50");
    setReasonInput(mode === "add" ? "مكافأة إدارية / ولاء" : "استلام هدية من المحل");
  };

  // إرسال عملية تعديل النقاط
  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    const numPoints = Math.abs(Number(pointsInput));
    if (!numPoints || isNaN(numPoints) || numPoints <= 0) {
      onToast("يرجى إدخال عدد نقاط صحيح أكبر من صفر", "error");
      return;
    }

    if (adjustMode === "deduct" && numPoints > selectedCustomer.points) {
      onToast(
        `لا يمكن خصم ${numPoints} نقطة لأن رصيد المستخدم الحالي (${selectedCustomer.points} نقطة) أقل من المطلوب.`,
        "error"
      );
      return;
    }

    const delta = adjustMode === "add" ? numPoints : -numPoints;

    setIsSubmitting(true);
    try {
      const res = await adjustCustomerPointsAction(
        selectedCustomer.id,
        delta,
        reasonInput.trim() || (adjustMode === "add" ? "إضافة نقاط إدارية" : "خصم نقاط إداري")
      );

      if (res.success && "newPoints" in res) {
        onToast(
          `تم ${adjustMode === "add" ? "إضافة" : "خصم"} ${numPoints} نقطة بنجاح لحساب ${selectedCustomer.name}! الرصيد الجديد: ${res.newPoints} نقطة.`,
          "success"
        );
        setSelectedCustomer(null);
        await onRefresh();
      } else {
        const errMsg = "error" in res ? String(res.error) : "فشل تعديل النقاط";
        onToast(errMsg, "error");
      }
    } catch (err: any) {
      onToast(err.message || "حدث خطأ غير متوقع", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // حساب الرصيد المتوقع بعد التعديل
  const expectedPoints = useMemo(() => {
    if (!selectedCustomer) return 0;
    const num = Math.abs(Number(pointsInput)) || 0;
    if (adjustMode === "add") return selectedCustomer.points + num;
    return Math.max(0, selectedCustomer.points - num);
  }, [selectedCustomer, pointsInput, adjustMode]);

  return (
    <div className="space-y-6" dir="rtl">
      {/* ── شريط الإحصائيات والمقدمة ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">إجمالي الحسابات المسجلة</p>
              <h4 className="mt-1 font-mono text-2xl font-bold text-neutral-900">{customers.length}</h4>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <i className="fa-solid fa-users text-lg" />
            </div>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">تظهر الحسابات الجديدة فور تسجيلها تلقائياً</p>
        </div>

        <div className="rounded-2xl border border-pink-100 bg-gradient-to-br from-pink-50/50 to-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[#E0457D]">إجمالي النقاط الموزعة</p>
              <h4 className="mt-1 font-mono text-2xl font-bold text-[#E0457D]">{totalPoints.toLocaleString()}</h4>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-pink-100 text-[#E0457D]">
              <i className="fa-solid fa-gem text-lg" />
            </div>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">مجموع أرصدة جميع العملاء الحالية</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">عملاء يمتلكون نقاط</p>
              <h4 className="mt-1 font-mono text-2xl font-bold text-emerald-700">{totalUsersWithPoints}</h4>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <i className="fa-solid fa-gift text-lg" />
            </div>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">يمكنهم استبدالها بجوائز وهدايا المحل</p>
        </div>
      </div>

      {/* ── أدوات البحث والتصفية ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث بالاسم، رقم الهاتف، الإيميل، أو كود الخصم..."
            className="w-full rounded-xl border border-slate-200 py-2.5 pr-10 pl-4 text-sm outline-none focus:border-[#E0457D] focus:ring-1 focus:ring-[#E0457D]"
          />
          <i className="fa-solid fa-magnifying-glass absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto text-xs">
          <button
            type="button"
            onClick={() => setFilterType("all")}
            className={`rounded-lg px-3 py-2 font-semibold transition ${
              filterType === "all" ? "bg-neutral-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            الكل ({customers.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("with_points")}
            className={`rounded-lg px-3 py-2 font-semibold transition ${
              filterType === "with_points" ? "bg-neutral-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            لديهم نقاط ({totalUsersWithPoints})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("used_codes")}
            className={`rounded-lg px-3 py-2 font-semibold transition ${
              filterType === "used_codes" ? "bg-neutral-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            استخدموا أكواد
          </button>
        </div>
      </div>

      {/* ── جدول المستخدمين والنقاط ── */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-neutral-900 text-base flex items-center gap-2">
            <i className="fa-solid fa-address-book text-[#E0457D]" />
            قائمة المستخدمين المسجلين ({filteredCustomers.length})
          </h3>
          <span className="text-xs text-slate-400">مرتبة من الأحدث تسجيلاً</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
              <tr>
                <th className="p-3.5">المستخدم</th>
                <th className="p-3.5">رقم الهاتف</th>
                <th className="p-3.5">تاريخ الإنشاء</th>
                <th className="p-3.5 text-center">رصيد النقاط</th>
                <th className="p-3.5">الأكواد المستخدمة</th>
                <th className="p-3.5 text-center">التحكم بالنقاط والسجل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    لا يوجد مستخدمون يطابقون خيارات البحث.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => (
                  <tr key={cust.id} className="hover:bg-slate-50/60 transition">
                    <td className="p-3.5">
                      <div className="font-bold text-neutral-900 text-sm">{cust.name}</div>
                      <div className="text-[11px] font-mono text-slate-400">{cust.email}</div>
                    </td>

                    <td className="p-3.5 font-mono text-slate-700">
                      <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-xs">
                        <i className="fa-solid fa-phone text-[10px] text-slate-400" />
                        {cust.phone || "—"}
                      </span>
                    </td>

                    <td className="p-3.5 font-mono text-slate-500">
                      {new Date(cust.created_at).toLocaleDateString("ar-EG", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>

                    <td className="p-3.5 text-center">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-pink-50 border border-pink-200/80 px-3 py-1 font-mono font-bold text-sm text-[#E0457D]">
                        <i className="fa-solid fa-gem text-xs" />
                        {cust.points} نقطة
                      </span>
                    </td>

                    <td className="p-3.5">
                      {cust.used_codes && cust.used_codes.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {cust.used_codes.map((code) => (
                            <span
                              key={code}
                              className="font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200"
                            >
                              {code}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">لم يستخدم أكواد بعد</span>
                      )}
                    </td>

                    <td className="p-3.5">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openAdjustModal(cust, "add")}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition shadow-sm"
                          title="إضافة نقاط لحساب العميل"
                        >
                          <i className="fa-solid fa-plus text-[10px]" />
                          إضافة
                        </button>

                        <button
                          type="button"
                          onClick={() => openAdjustModal(cust, "deduct")}
                          className="inline-flex items-center gap-1 rounded-lg bg-rose-50 border border-rose-200 px-2.5 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100 transition shadow-sm"
                          title="خصم نقاط من حساب العميل"
                        >
                          <i className="fa-solid fa-minus text-[10px]" />
                          خصم
                        </button>

                        <button
                          type="button"
                          onClick={() => setHistoryCustomer(cust)}
                          className="inline-flex items-center gap-1 rounded-lg bg-slate-100 border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200 transition"
                          title="عرض سجل حركات النقاط"
                        >
                          <i className="fa-solid fa-clock-rotate-left text-[10px]" />
                          السجل ({cust.history.length})
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── مودال التحكم بالنقاط (إضافة / خصم) ── */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-bold text-lg text-neutral-900">
                {adjustMode === "add" ? "إضافة نقاط لمستخدم" : "خصم نقاط من مستخدم"}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            {/* تفاصيل العميل الحالي */}
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 mb-4 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">اسم المستخدم:</span>
                <strong className="text-neutral-900">{selectedCustomer.name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">رقم الهاتف:</span>
                <span className="font-mono text-slate-800">{selectedCustomer.phone}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-slate-200/60">
                <span className="text-slate-500 font-semibold">رصيد النقاط الحالي:</span>
                <span className="font-mono font-bold text-sm text-[#E0457D]">
                  {selectedCustomer.points} نقطة
                </span>
              </div>
            </div>

            <form onSubmit={handleAdjustSubmit} className="space-y-4 text-xs">
              {/* اختيار نوع العملية */}
              <div>
                <label className="block font-bold text-neutral-800 mb-1.5">نوع العملية</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustMode("add")}
                    className={`rounded-xl py-2 font-bold transition flex items-center justify-center gap-1.5 border ${
                      adjustMode === "add"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <i className="fa-solid fa-plus text-xs" />
                    إضافة نقاط (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustMode("deduct")}
                    className={`rounded-xl py-2 font-bold transition flex items-center justify-center gap-1.5 border ${
                      adjustMode === "deduct"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <i className="fa-solid fa-minus text-xs" />
                    خصم نقاط (-)
                  </button>
                </div>
              </div>

              {/* عدد النقاط */}
              <div>
                <label className="block font-bold text-neutral-800 mb-1">
                  عدد النقاط المراد {adjustMode === "add" ? "إضافتها" : "خصمها"} *
                </label>
                <input
                  type="number"
                  min="1"
                  value={pointsInput}
                  onChange={(e) => setPointsInput(e.target.value)}
                  required
                  placeholder="مثال: 50"
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-sm font-mono outline-none focus:border-[#E0457D] focus:ring-1 focus:ring-[#E0457D]"
                />
                {/* أزرار سريعة */}
                <div className="flex gap-1.5 mt-2">
                  {[20, 50, 100, 200, 500].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setPointsInput(String(val))}
                      className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-600 hover:bg-slate-200"
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>

              {/* سبب العملية / الملاحظة الإدارية */}
              <div>
                <label className="block font-bold text-neutral-800 mb-1">
                  سبب العملية أو ملاحظة إدارية *
                </label>
                <input
                  type="text"
                  value={reasonInput}
                  onChange={(e) => setReasonInput(e.target.value)}
                  required
                  placeholder="مثال: هدية تسوق، استلام من الفرع، تعويض زبونة..."
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-sm outline-none focus:border-[#E0457D]"
                />
              </div>

              {/* معاينة الرصيد قبل وبعد العملية */}
              <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-blue-900 space-y-1">
                <div className="flex justify-between items-center">
                  <span>الرصيد قبل العملية:</span>
                  <strong className="font-mono">{selectedCustomer.points} نقطة</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span>التغيير:</span>
                  <strong className={`font-mono ${adjustMode === "add" ? "text-emerald-700" : "text-rose-700"}`}>
                    {adjustMode === "add" ? `+${pointsInput || 0}` : `-${pointsInput || 0}`} نقطة
                  </strong>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-blue-200 font-bold">
                  <span>الرصيد المتوقع بعد العملية:</span>
                  <strong className="font-mono text-sm text-blue-950">{expectedPoints} نقطة</strong>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 rounded-xl py-2.5 font-bold text-white shadow-sm transition disabled:opacity-50 bg-emerald-600 hover:bg-emerald-700"
                >
                  {isSubmitting ? "جارٍ التنفيذ..." : `تأكيد ${adjustMode === "add" ? "إضافة" : "خصم"} النقاط`}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCustomer(null)}
                  className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 font-bold text-slate-700 hover:bg-slate-200 transition"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── مودال عرض سجل الحركات الكامل للمستخدم ── */}
      {historyCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl border border-slate-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4 shrink-0">
              <div>
                <h3 className="font-bold text-lg text-neutral-900">
                  سجل حركات النقاط — {historyCustomer.name}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  رقم الهاتف: {historyCustomer.phone} | الرصيد الحالي:{" "}
                  <strong className="text-[#E0457D] font-bold">{historyCustomer.points} نقطة</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryCustomer(null)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                <i className="fa-solid fa-xmark text-lg" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-2 pr-1">
              {historyCustomer.history && historyCustomer.history.length > 0 ? (
                historyCustomer.history.map((tx, idx) => (
                  <div
                    key={tx.id || idx}
                    className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                            tx.points > 0 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {tx.points > 0 ? `+${tx.points}` : tx.points} نقطة
                        </span>
                        <strong className="text-neutral-900">{tx.title}</strong>
                        {tx.code && (
                          <span className="font-mono bg-white border border-slate-200 px-1.5 py-0.5 rounded text-[10px] text-slate-600">
                            الكود: {tx.code}
                          </span>
                        )}
                      </div>
                      {tx.note && <p className="text-slate-600">{tx.note}</p>}
                    </div>

                    <div className="text-left sm:text-right text-[11px] font-mono text-slate-400 shrink-0">
                      <div>
                        {new Date(tx.created_at).toLocaleDateString("ar-EG", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                      {tx.balance_before !== undefined && tx.balance_after !== undefined && (
                        <div className="text-slate-500 font-semibold mt-0.5">
                          الرصيد: {tx.balance_before} ➔ {tx.balance_after}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-400">لا توجد حركات سابقة لهذا المستخدم بعد.</div>
              )}
            </div>

            <div className="border-t border-slate-100 pt-3 mt-4 text-left shrink-0">
              <button
                type="button"
                onClick={() => setHistoryCustomer(null)}
                className="rounded-xl bg-slate-100 hover:bg-slate-200 px-4 py-2 text-xs font-bold text-slate-700 transition"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
