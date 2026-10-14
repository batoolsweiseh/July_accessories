"use client";

import { useState } from "react";
import { LoyaltyReward, PurchaseCode } from "@/lib/loyalty";
import {
  saveLoyaltyRewardAction,
  deleteLoyaltyRewardAction,
  generateStorePurchaseCodeAction,
  deductCustomerPointsAction,
  lookupCustomerPointsAction,
  resetCustomerPointsAction,
} from "@/app/admin/actions";

interface LoyaltyAdminSectionProps {
  rewards: LoyaltyReward[];
  codes: PurchaseCode[];
  onRefresh: () => Promise<void>;
  onToast: (msg: string, type: "success" | "error") => void;
}

export default function LoyaltyAdminSection({
  rewards,
  codes,
  onRefresh,
  onToast,
}: LoyaltyAdminSectionProps) {
  // حالة نموذج إضافة/تعديل الجائزة
  const [editingReward, setEditingReward] = useState<LoyaltyReward | null>(null);
  const [title, setTitle] = useState("");
  const [pointsRequired, setPointsRequired] = useState("");
  const [description, setDescription] = useState("");
  const [monthTag, setMonthTag] = useState("جوائز هذا الشهر");
  const [isActive, setIsActive] = useState(true);
  const [savingReward, setSavingReward] = useState(false);

  // حالة توليد كود مشتريات جديد
  const [codePoints, setCodePoints] = useState("100");
  const [codeNote, setCodeNote] = useState("");
  const [generatingCode, setGeneratingCode] = useState(false);
  const [generatedCodeResult, setGeneratedCodeResult] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // حالة خصم نقاط زبونة عند تسليم الهدية في المحل
  const [deductPhone, setDeductPhone] = useState("");
  const [deductPoints, setDeductPoints] = useState("500");
  const [deductReason, setDeductReason] = useState("");
  const [deducting, setDeducting] = useState(false);
  const [deductResult, setDeductResult] = useState<{
    customerName: string;
    newPoints: number;
    claimCode: string;
  } | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [customerLookupData, setCustomerLookupData] = useState<{
    customerName: string;
    points: number;
  } | null>(null);
  const [resettingPoints, setResettingPoints] = useState(false);

  // حالة نافذة تأكيد الحذف الأنيقة (بدل confirm المتصفح القديم)
  const [deleteTargetReward, setDeleteTargetReward] = useState<LoyaltyReward | null>(null);
  const [deleting, setDeleting] = useState(false);

  // بدء التعديل على جائزة
  const startEdit = (rew: LoyaltyReward) => {
    setEditingReward(rew);
    setTitle(rew.title);
    setPointsRequired(String(rew.points_required));
    setDescription(rew.description);
    setMonthTag(rew.month_tag || "جوائز هذا الشهر");
    setIsActive(rew.is_active);
    window.scrollTo({ top: 300, behavior: "smooth" });
  };

  // إلغاء التعديل
  const cancelEdit = () => {
    setEditingReward(null);
    setTitle("");
    setPointsRequired("");
    setDescription("");
    setMonthTag("جوائز هذا الشهر");
    setIsActive(true);
  };

  // حفظ الجائزة (إضافة أو تعديل)
  const handleSaveReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !pointsRequired) {
      onToast("يرجى ملء اسم الجائزة وعدد النقاط المطلوبة", "error");
      return;
    }

    setSavingReward(true);
    try {
      const res = await saveLoyaltyRewardAction({
        id: editingReward?.id,
        title,
        points_required: Number(pointsRequired),
        description,
        month_tag: monthTag,
        is_active: isActive,
      });

      if (res.success) {
        onToast(editingReward ? "تم تحديث الجائزة بنجاح" : "تمت إضافة الجائزة بنجاح", "success");
        cancelEdit();
        await onRefresh();
      } else {
        onToast(res.error || "فشل حفظ الجائزة", "error");
      }
    } catch (err: any) {
      onToast(err.message || "حدث خطأ", "error");
    } finally {
      setSavingReward(false);
    }
  };

  // تنفيذ تأكيد الحذف
  const confirmDeleteReward = async () => {
    if (!deleteTargetReward) return;
    setDeleting(true);
    try {
      const res = await deleteLoyaltyRewardAction(deleteTargetReward.id);
      if (res.success) {
        onToast("تم حذف الجائزة بنجاح", "success");
        setDeleteTargetReward(null);
        await onRefresh();
      } else {
        onToast(res.error || "فشل الحذف", "error");
      }
    } catch (err: any) {
      onToast(err.message || "حدث خطأ أثناء الحذف", "error");
    } finally {
      setDeleting(false);
    }
  };

  // توليد كود مشتريات جديد
  const handleGenerateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const pts = Number(codePoints);
    if (!pts || pts <= 0) {
      onToast("يرجى إدخال عدد نقاط صحيح", "error");
      return;
    }

    setGeneratingCode(true);
    setGeneratedCodeResult(null);
    try {
      const res = await generateStorePurchaseCodeAction(pts, codeNote);
      if (res.success && res.code) {
        setGeneratedCodeResult(res.code.code);
        onToast(`تم توليد الكود بنجاح: ${res.code.code}`, "success");
        setCodeNote("");
        await onRefresh();
      } else {
        onToast(res.error || "فشل توليد الكود", "error");
      }
    } catch (err: any) {
      onToast(err.message || "حدث خطأ", "error");
    } finally {
      setGeneratingCode(false);
    }
  };

  // نسخ الكود للحافظة
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // خصم نقاط الزبونة عند تسليم الهدية في المحل
  const handleDeductPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deductPhone.trim() || !deductPoints) {
      onToast("يرجى إدخال رقم هاتف الزبونة وعدد النقاط المطلوب خصمها", "error");
      return;
    }

    setDeducting(true);
    setDeductResult(null);
    try {
      const res = await deductCustomerPointsAction(
        deductPhone,
        Number(deductPoints),
        deductReason || "تسليم هدية من المحل وخصم النقاط"
      );

      if (res.success && res.newPoints !== undefined) {
        setDeductResult({
          customerName: res.customerName || "الزبونة",
          newPoints: res.newPoints,
          claimCode: res.claimCode || "",
        });
        onToast(`تم خصم ${deductPoints} نقطة بنجاح! الرصيد الجديد: ${res.newPoints} نقطة.`, "success");
        setDeductPhone("");
        setDeductReason("");
        await onRefresh();
      } else {
        onToast(res.error || "فشل خصم النقاط", "error");
      }
    } catch (err: any) {
      onToast(err.message || "حدث خطأ أثناء خصم النقاط", "error");
    } finally {
      setDeducting(false);
    }
  };

  // فحص رصيد الزبونة برقم الهاتف
  const handleLookupCustomer = async () => {
    if (!deductPhone.trim()) {
      onToast("يرجى إدخال رقم هاتف الزبونة أولاً", "error");
      return;
    }
    setLookingUp(true);
    try {
      const res = await lookupCustomerPointsAction(deductPhone);
      if (res.success) {
        setCustomerLookupData({
          customerName: res.customerName,
          points: res.points,
        });
        onToast(`تم العثور على حساب ${res.customerName} (رصيدها: ${res.points} نقطة)`, "success");
      } else {
        setCustomerLookupData(null);
        onToast(res.error || "لم يتم العثور على حساب بهذا الرقم", "error");
      }
    } catch (err: any) {
      onToast(err.message || "حدث خطأ أثناء فحص الرصيد", "error");
    } finally {
      setLookingUp(false);
    }
  };

  // تصفير رصيد الزبونة بالكامل لـ 0
  const handleResetPointsToZero = async () => {
    if (!deductPhone.trim()) {
      onToast("يرجى إدخال رقم هاتف الزبونة أولاً", "error");
      return;
    }
    if (!confirm(`هل أنتِ متأكدة من تصفير رصيد الزبونة بالكامل وإرجاعه إلى 0 نقطة؟`)) {
      return;
    }

    setResettingPoints(true);
    setDeductResult(null);
    try {
      const res = await resetCustomerPointsAction(
        deductPhone,
        deductReason || "تسليم هدية وتصفير الرصيد لـ 0"
      );
      if (res.success && res.newPoints !== undefined) {
        setDeductResult({
          customerName: res.customerName || "الزبونة",
          newPoints: 0,
          claimCode: res.claimCode || "",
        });
        setCustomerLookupData(null);
        onToast(`تم تصفير رصيد الزبونة ${res.customerName} بنجاح إلى 0 نقطة!`, "success");
        setDeductPhone("");
        setDeductReason("");
        await onRefresh();
      } else {
        onToast(res.error || "فشل تصفير النقاط", "error");
      }
    } catch (err: any) {
      onToast(err.message || "حدث خطأ أثناء تصفير النقاط", "error");
    } finally {
      setResettingPoints(false);
    }
  };

  return (
    <div className="space-y-8" dir="rtl">

      {/* ── مقدمة القسم ── */}
      <div className="rounded-2xl border border-pink-100 bg-gradient-to-r from-pink-50 via-white to-pink-50/50 p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-neutral-900">
              إدارة جوائز النقاط وأكواد مشتريات المحل
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              حددي الجوائز المتاحة لكل عدد نقاط وغيريها في بداية كل شهر، وأنشئي أكواد مشتريات للمحل لإعطائها للزبائن.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-xl bg-pink-100/80 px-3 py-1.5 text-xs font-bold text-[#E0457D]">
              {rewards.filter((r) => r.is_active).length} جوائز نشطة حالياً
            </span>
          </div>
        </div>
      </div>

      {/* ── شبكة العمل: النموذج + قائمة الجوائز ── */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">

        {/* ── 1. نموذج إضافة / تعديل جائزة (4 أعمدة) ── */}
        <div className="lg:col-span-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <h3 className="text-lg font-bold text-neutral-900">
              {editingReward ? "تعديل الجائزة" : "إضافة جائزة جديدة"}
            </h3>
            {editingReward && (
              <button
                type="button"
                onClick={cancelEdit}
                className="text-xs text-slate-400 hover:text-slate-600 underline"
              >
                إلغاء التعديل
              </button>
            )}
          </div>

          <form onSubmit={handleSaveReward} className="space-y-4 text-sm">
            <div>
              <label className="block text-xs font-bold text-neutral-800 mb-1">
                اسم الجائزة / المكافأة *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: خاتم هدية مجاناً، أو قسيمة خصم 30 شيكل"
                required
                className="w-full rounded-xl border border-slate-200 p-2.5 outline-none focus:border-[#E0457D] focus:ring-1 focus:ring-[#E0457D]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-800 mb-1">
                النقاط المطلوبة للاستبدال *
              </label>
              <input
                type="number"
                min="1"
                value={pointsRequired}
                onChange={(e) => setPointsRequired(e.target.value)}
                placeholder="مثال: 100"
                required
                className="w-full rounded-xl border border-slate-200 p-2.5 outline-none focus:border-[#E0457D] focus:ring-1 focus:ring-[#E0457D]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-800 mb-1">
                وصف الجائزة وكيفية الحصول عليها
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="مثال: اختاري أي خاتم أنيق هدية مجانية من المحل أو مع طلبك القادم."
                className="w-full rounded-xl border border-slate-200 p-2.5 outline-none focus:border-[#E0457D] focus:ring-1 focus:ring-[#E0457D]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-800 mb-1">
                تصنيف الجائزة / الشهر
              </label>
              <input
                type="text"
                value={monthTag}
                onChange={(e) => setMonthTag(e.target.value)}
                placeholder="مثال: جوائز هذا الشهر، أو شهر أكتوبر"
                className="w-full rounded-xl border border-slate-200 p-2.5 outline-none focus:border-[#E0457D] focus:ring-1 focus:ring-[#E0457D]"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="isRewardActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded text-[#E0457D] focus:ring-[#E0457D]"
              />
              <label htmlFor="isRewardActive" className="text-xs font-bold text-neutral-800 cursor-pointer">
                تفعيل الجائزة وإظهارها للزبائن حالياً
              </label>
            </div>

            <button
              type="submit"
              disabled={savingReward}
              className="w-full rounded-xl bg-[#E0457D] py-3 text-sm font-bold text-white shadow-md shadow-[#E0457D]/20 transition hover:bg-[#c9366c] disabled:opacity-60"
            >
              {savingReward ? "جارٍ الحفظ..." : editingReward ? "حفظ التعديلات" : "إضافة الجائزة"}
            </button>
          </form>
        </div>

        {/* ── 2. جدول الجوائز الشهرية الحالية (8 أعمدة) ── */}
        <div className="lg:col-span-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <div>
              <h3 className="text-lg font-bold text-neutral-900">
                قائمة الجوائز المحددة ({rewards.length})
              </h3>
              <p className="text-xs text-slate-500">
                الجوائز تظهر للزبائن في صفحة "حسابي" مع شريط تقدم يوضح كم نقطة متبقية لهم.
              </p>
            </div>
          </div>

          {rewards.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-400">
              لا توجد جوائز مضافة بعد. أضيفي أول جائزة من النموذج المقابل.
            </div>
          ) : (
            <div className="space-y-3">
              {rewards.map((rew) => (
                <div
                  key={rew.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border p-4 transition ${
                    rew.is_active
                      ? "border-slate-200 bg-slate-50/50 hover:bg-slate-50"
                      : "border-slate-100 bg-slate-100/50 opacity-60"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-pink-100 text-[#E0457D] text-lg font-bold">
                      {rew.points_required}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-neutral-900 text-base">{rew.title}</h4>
                        <span className="rounded-md bg-pink-50 px-2 py-0.5 text-[11px] font-semibold text-[#E0457D] border border-pink-200/50">
                          {rew.points_required} نقطة
                        </span>
                        {rew.month_tag && (
                          <span className="rounded-md bg-slate-200/60 px-2 py-0.5 text-[10px] text-slate-600 font-medium">
                            {rew.month_tag}
                          </span>
                        )}
                        {!rew.is_active && (
                          <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] text-amber-700 font-bold">
                            معطلة
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                        {rew.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => startEdit(rew)}
                      className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50 transition shadow-sm"
                    >
                      تعديل
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTargetReward(rew)}
                      className="inline-flex items-center rounded-xl border border-rose-300 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 hover:border-rose-400 transition shadow-sm"
                    >
                      حذف
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ── 3. قسم توليد وإدارة أكواد مشتريات المحل ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 mb-6">
          <div>
            <h3 className="text-xl font-bold text-neutral-900">
              توليد أكواد مشتريات المحل (Store Purchase Codes)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              أنشئي كوداً جديداً بضغطة زر لطباعته في فاتورة الزبونة بالمحل أو إرساله لها لتضيف النقاط لحسابها.
            </p>
          </div>
        </div>

        {/* نموذج التوليد السريع */}
        <form onSubmit={handleGenerateCode} className="mb-6 rounded-xl bg-slate-50 border border-slate-200 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-3">
              <label className="block text-xs font-bold text-neutral-800 mb-1">
                النقاط التي يمنحها الكود
              </label>
              <input
                type="number"
                min="1"
                value={codePoints}
                onChange={(e) => setCodePoints(e.target.value)}
                placeholder="مثال: 100"
                className="w-full rounded-xl border border-slate-200 p-2.5 text-sm outline-none focus:border-[#E0457D] focus:ring-1 focus:ring-[#E0457D]"
              />
            </div>

            <div className="sm:col-span-6">
              <label className="block text-xs font-bold text-neutral-800 mb-1">
                ملاحظة أو رقم الفاتورة (اختياري)
              </label>
              <input
                type="text"
                value={codeNote}
                onChange={(e) => setCodeNote(e.target.value)}
                placeholder="مثال: فاتورة مشتريات رقم #1024 - فرع المحل"
                className="w-full rounded-xl border border-slate-200 p-2.5 text-sm outline-none focus:border-[#E0457D]"
              />
            </div>

            <div className="sm:col-span-3">
              <button
                type="submit"
                disabled={generatingCode}
                className="w-full rounded-xl bg-neutral-900 py-2.5 text-sm font-bold text-white hover:bg-neutral-800 transition disabled:opacity-50"
              >
                {generatingCode ? "جارٍ التوليد..." : "توليد كود جديد"}
              </button>
            </div>
          </div>

          {/* الكود المولد حديثاً */}
          {generatedCodeResult && (
            <div className="mt-4 flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-emerald-900 animate-fadeIn">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold">تم توليد الكود الجديد:</span>
                <span className="font-mono text-base font-black tracking-wider text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-200">
                  {generatedCodeResult}
                </span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(generatedCodeResult)}
                className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-700 transition"
              >
                {copiedCode === generatedCodeResult ? "تم النسخ" : "نسخ الكود"}
              </button>
            </div>
          )}
        </form>

        {/* جدول الأكواد الحالية */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
              <tr>
                <th className="p-3">الكود</th>
                <th className="p-3">النقاط</th>
                <th className="p-3">الملاحظة</th>
                <th className="p-3">الحالة</th>
                <th className="p-3">تاريخ الإنشاء</th>
                <th className="p-3 text-center">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {codes.slice(0, 15).map((cd) => (
                <tr key={cd.code} className="hover:bg-slate-50/50">
                  <td className="p-3 font-mono font-bold text-neutral-900 text-sm">
                    {cd.code}
                  </td>
                  <td className="p-3 font-bold text-[#E0457D]">
                    +{cd.points} نقطة
                  </td>
                  <td className="p-3 text-slate-600">
                    {cd.note || "كود مشتريات من المحل"}
                  </td>
                  <td className="p-3">
                    {cd.is_used ? (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                        مستخدم مسبقاً
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        جاهز للاستخدام
                      </span>
                    )}
                  </td>
                  <td className="p-3 font-mono text-slate-400">
                    {new Date(cd.created_at).toLocaleDateString("ar-EG")}
                  </td>
                  <td className="p-3 text-center">
                    <button
                      type="button"
                      onClick={() => copyToClipboard(cd.code)}
                      className="rounded bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-200"
                    >
                      {copiedCode === cd.code ? "تم النسخ ✓" : "نسخ"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 4. قسم تسليم الهدية في المحل وخصم/تصفير النقاط ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="border-b border-slate-100 pb-4 mb-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <i className="fa-solid fa-gift text-lg" />
            </span>
            <div>
              <h3 className="text-xl font-bold text-neutral-900">
                تسليم هدية لزبونة في المحل (خصم أو تصفير النقاط لـ 0)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                عند زيارة الزبونة لفرع المحل، افحصي رصيدها برقم هاتفها وقومي بتصفير رصيدها إلى 0 أو خصم نقاط الهدية مباشرة.
              </p>
            </div>
          </div>
        </div>

        {/* تنبيه نتيجة العملية والإيصال */}
        {deductResult && (
          <div className="mb-6 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 sm:p-5 text-sm text-emerald-950 animate-in fade-in">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
                <i className="fa-solid fa-check text-base" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-base text-emerald-900">
                  تم تسليم الهدية وتحديث رصيد الزبونة بنجاح!
                </p>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="bg-white/80 rounded-xl p-2.5 border border-emerald-100">
                    <span className="text-slate-500 block">اسم الزبونة:</span>
                    <strong className="text-neutral-900 text-sm">{deductResult.customerName}</strong>
                  </div>
                  <div className="bg-white/80 rounded-xl p-2.5 border border-emerald-100">
                    <span className="text-slate-500 block">الرصيد الجديد الحالي:</span>
                    <strong className="text-emerald-700 text-sm font-mono">{deductResult.newPoints} نقطة</strong>
                  </div>
                  <div className="bg-white/80 rounded-xl p-2.5 border border-emerald-100">
                    <span className="text-slate-500 block">كود إيصال التسليم:</span>
                    <strong className="text-slate-800 text-xs font-mono">{deductResult.claimCode}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 1. شريط إدخال الهاتف وفحص الرصيد */}
        <div className="rounded-2xl bg-slate-50 border border-slate-200/90 p-5 mb-6">
          <label className="block text-xs font-bold text-neutral-800 mb-2">
            خطوة 1: أدخلي رقم هاتف الزبونة المسجل بالموقع *
          </label>
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
            <div className="relative flex-1">
              <input
                type="text"
                dir="ltr"
                value={deductPhone}
                onChange={(e) => {
                  setDeductPhone(e.target.value);
                  if (customerLookupData) setCustomerLookupData(null);
                }}
                placeholder="مثال: 0599123456"
                className="w-full rounded-xl border border-slate-200 p-2.5 pl-10 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 bg-white"
              />
              <i className="fa-solid fa-phone absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
            </div>

            <button
              type="button"
              onClick={handleLookupCustomer}
              disabled={lookingUp || !deductPhone.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 text-sm font-bold shadow-sm transition disabled:opacity-50 shrink-0"
            >
              {lookingUp ? (
                <>
                  <i className="fa-solid fa-spinner animate-spin text-xs" />
                  <span>جارٍ الفحص...</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-magnifying-glass text-xs" />
                  <span>فحص رصيد الزبونة</span>
                </>
              )}
            </button>
          </div>

          {/* بطاقة معلومات الزبونة فور الفحص */}
          {customerLookupData && (
            <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/70 p-4 text-sm text-blue-950 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
                  <i className="fa-solid fa-user" />
                </div>
                <div>
                  <p className="font-bold text-blue-900">
                    الزبونة: {customerLookupData.customerName}
                  </p>
                  <p className="text-xs text-blue-700 mt-0.5">
                    الرصيد المتاح حالياً:{" "}
                    <span className="font-bold font-mono text-blue-950 text-sm">
                      {customerLookupData.points} نقطة
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold ${
                    customerLookupData.points > 0
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  <i className={`fa-solid ${customerLookupData.points > 0 ? "fa-gift" : "fa-circle-info"} text-[10px]`} />
                  <span>
                    {customerLookupData.points > 0
                      ? `مؤهلة لجوائز بقيمة حتى ${customerLookupData.points} نقطة`
                      : "رصيدها الحالي 0 نقطة"}
                  </span>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* خطوة 2: إجراءات تسليم الهدية (تصفير لـ 0 أو خصم محدد) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* الخيار الأول: تصفير الرصيد بالكامل لـ 0 */}
          <div className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50/60 to-white p-5 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                  <i className="fa-solid fa-star text-[10px]" />
                  الخيار الموصى به
                </span>
                <span className="font-mono text-xs font-bold text-emerald-700">الرصيد يصبح 0</span>
              </div>
              <h4 className="text-base font-bold text-neutral-900">
                تصفير رصيد الزبونة لـ 0 (تسليم الهدية)
              </h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                يتم إرجاع رصيد نقاط الزبونة إلى 0 نقطة مباشرة وتوثيق استلام الهدية في سجل حسابها بالموقع.
              </p>

              <div className="mt-4">
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  اسم الهدية المسلَّمة (ملاحظة للسجل)
                </label>
                <input
                  type="text"
                  value={deductReason}
                  onChange={(e) => setDeductReason(e.target.value)}
                  placeholder="مثال: ساعة يد أو خاتم هدية"
                  className="w-full rounded-xl border border-slate-200 p-2 text-xs outline-none focus:border-emerald-600 bg-white"
                />
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-emerald-100">
              <button
                type="button"
                onClick={handleResetPointsToZero}
                disabled={resettingPoints || !deductPhone.trim()}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white py-3 text-sm font-bold shadow-md shadow-emerald-600/20 active:scale-[0.99] transition disabled:opacity-50"
              >
                {resettingPoints ? (
                  <>
                    <i className="fa-solid fa-spinner animate-spin text-xs" />
                    <span>جارٍ تصفير الرصيد...</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-gift text-sm" />
                    <span>تصفير الرصيد لـ 0 وتسليم الهدية</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* الخيار الثاني: خصم عدد محدد فقط من النقاط */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 flex flex-col justify-between">
            <form onSubmit={handleDeductPoints} className="flex flex-col h-full justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="inline-flex items-center gap-1 rounded-lg bg-slate-200/80 px-2.5 py-1 text-xs font-semibold text-slate-700">
                    خصم جزئي
                  </span>
                  <span className="text-xs text-slate-500">يبقى الباقي برصيدها</span>
                </div>
                <h4 className="text-base font-bold text-neutral-900">
                  خصم نقاط محددة فقط
                </h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  يخصم عدد النقاط المكتوب ويبقى الرصيد المتبقي في حساب الزبونة بالموقع.
                </p>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      النقاط المطلوب خصمها
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={deductPoints}
                      onChange={(e) => setDeductPoints(e.target.value)}
                      placeholder="500"
                      className="w-full rounded-xl border border-slate-200 p-2 text-xs outline-none focus:border-emerald-600 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      اسم الجائزة
                    </label>
                    <input
                      type="text"
                      value={deductReason}
                      onChange={(e) => setDeductReason(e.target.value)}
                      placeholder="هدية 500 نقطة"
                      className="w-full rounded-xl border border-slate-200 p-2 text-xs outline-none focus:border-emerald-600 bg-white"
                    />
                  </div>
                </div>

                {/* أزرار سريعة لاختيار قيمة الجوائز المتاحة */}
                {rewards.length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-1.5 pt-2">
                    <span className="text-[11px] text-slate-400">نقاط سريعة:</span>
                    {rewards.slice(0, 4).map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => {
                          setDeductPoints(String(r.points_required));
                          setDeductReason(r.title);
                        }}
                        className="rounded-lg bg-white border border-slate-200 px-2 py-0.5 text-[11px] hover:border-emerald-500 hover:text-emerald-700 transition"
                      >
                        {r.points_required} ن
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-5 pt-3 border-t border-slate-200">
                <button
                  type="submit"
                  disabled={deducting || !deductPhone.trim() || !deductPoints}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 py-3 text-sm font-bold transition disabled:opacity-50"
                >
                  {deducting ? (
                    <>
                      <i className="fa-solid fa-spinner animate-spin text-xs" />
                      <span>جارٍ الخصم...</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-minus text-xs text-rose-500" />
                      <span>خصم {deductPoints} نقطة فقط</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>

      {/* ── مودال تأكيد الحذف المنظم والراقي ── */}
      {deleteTargetReward && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* خلفية معتمة ناعمة */}
          <div
            className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => !deleting && setDeleteTargetReward(null)}
          />

          {/* صندوق الحوار */}
          <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl transition-all" dir="rtl">
            <div className="flex flex-col items-center text-center">

              <h3 className="text-xl font-bold text-neutral-900 mb-2">
                تأكيد حذف الجائزة
              </h3>

              <p className="text-sm text-slate-500 leading-relaxed mb-6">
                هل أنتِ متأكدة من حذف جائزة{" "}
                <span className="font-bold text-neutral-900">«{deleteTargetReward.title}»</span>{" "}
                المطلوب لها{" "}
                <span className="font-bold text-[#E0457D]">({deleteTargetReward.points_required} نقطة)</span>؟
                <br />
                <span className="text-xs text-rose-500 mt-1 block">لن تظهر هذه الجائزة للزبائن بعد الحذف.</span>
              </p>

              {/* أزرار الإجراء */}
              <div className="flex w-full gap-3">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={confirmDeleteReward}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 py-3 text-sm font-bold text-white shadow-md shadow-red-600/25 active:scale-[0.98] transition disabled:opacity-50"
                >
                  {deleting ? "جارٍ الحذف..." : "حذف الجائزة"}
                </button>

                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => setDeleteTargetReward(null)}
                  className="flex-1 inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition active:scale-[0.98] disabled:opacity-50"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
