"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";

interface UserProfile {
  id: string;
  name: string;
  phone: string;
  points: number;
}

interface LoyaltyHistoryItem {
  id: string;
  code?: string;
  points: number;
  type: string;
  title: string;
  created_at: string;
}

interface LoyaltyReward {
  id: string;
  title: string;
  points_required: number;
  description: string;
  month_tag?: string;
  is_active: boolean;
  icon?: string;
  image?: string;
}

export default function MyAccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // حالة النقاط والسجل والجوائز
  const [points, setPoints] = useState<number>(0);
  const [history, setHistory] = useState<LoyaltyHistoryItem[]>([]);
  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
  const [pointsLoading, setPointsLoading] = useState(false);

  // حالة إدخال الكود
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // فحص تسجيل الدخول وجلب البيانات
  const loadUserData = async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const data = await res.json();
      if (!data.authenticated || !data.user) {
        // إذا لم يكن مسجلاً الدخول، وجّهه لصفحة تسجيل الدخول مع حفظ مسار العودة
        router.push("/auth/login?redirect=/account");
        return;
      }
      setUser(data.user);
      setPoints(typeof data.user.points === "number" ? data.user.points : 0);
      // جلب تفاصيل النقاط والسجل من الخادم
      await loadPointsData();
    } catch (err) {
      console.error("Error loading account data:", err);
      router.push("/auth/login?redirect=/account");
    } finally {
      setLoading(false);
    }
  };

  const loadPointsData = async () => {
    setPointsLoading(true);
    try {
      const [ptsRes, rewRes] = await Promise.all([
        fetch("/api/account/points", { cache: "no-store" }),
        fetch("/api/loyalty/rewards", { cache: "no-store" }),
      ]);
      const data = await ptsRes.json();
      if (data.success) {
        setPoints(typeof data.points === "number" ? data.points : 0);
        if (Array.isArray(data.history)) {
          setHistory(data.history);
        }
      }
      const rewData = await rewRes.json();
      if (rewData.success && Array.isArray(rewData.rewards)) {
        setRewards(rewData.rewards);
      }
    } catch (err) {
      console.error("Error fetching points or rewards:", err);
    } finally {
      setPointsLoading(false);
    }
  };

  useEffect(() => {
    loadUserData();
  }, []);

  // إرسال كود مشتريات المحل للتحقق منه وإضافة النقاط
  const handleRedeemCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      setErrorMessage("يرجى إدخال كود مشتريات المحل أولاً.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/account/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: cleanCode }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccessMessage(
          `🎉 رائع! تمت إضافة ${data.pointsAdded} نقطة بنجاح إلى رصيدك! رصيدك الحالي: ${data.totalPoints} نقطة.`
        );
        setPoints(data.totalPoints);
        if (Array.isArray(data.history)) {
          setHistory(data.history);
        }
        setCode("");
        // إشعار الهيدر بأي تحديث
        window.dispatchEvent(new Event("july-auth-changed"));
      } else {
        setErrorMessage(data.error || "كود غير صالح، يرجى التحقق والمحاولة مرة أخرى.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "حدث خطأ أثناء الاتصال بالخادم. يرجى المحاولة لاحقاً.");
    } finally {
      setSubmitting(false);
    }
  };

  // تسجيل الخروج
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.dispatchEvent(new Event("july-auth-changed"));
      router.push("/");
    } catch (err) {
      console.error("Logout error:", err);
      router.push("/");
    }
  };

  // شاشة التحميل الأولية
  if (loading) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-paper flex items-center justify-center p-6" dir="rtl">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="h-12 w-12 rounded-full border-3 border-[#E0457D]/30 border-t-[#E0457D] animate-spin" />
            <p className="font-display text-xl text-charcoal">جارٍ فتح حسابك الشخصي...</p>
          </div>
        </main>
      </>
    );
  }

  // حساب المكافأة القادمة الأقرب لرصيد العميل
  const nextReward =
    rewards
      .filter((r) => r.is_active && r.points_required > points)
      .sort((a, b) => a.points_required - b.points_required)[0] || null;

  const getRewardCountBadge = (count: number) => {
    if (count === 1) return "مكافأة واحدة بانتظارك";
    if (count === 2) return "مكافأتان بانتظارك";
    if (count >= 3 && count <= 10) return `${count} مكافآت بانتظارك`;
    return `${count} مكافأة بانتظارك`;
  };

  const getRewardImage = (rew: LoyaltyReward) => {
    if (rew.image) return rew.image;
    const t = (rew.title || "").toLowerCase();
    if (t.includes("ساعة") || t.includes("watch")) return "/images/saat-markah-stati.png";
    if (t.includes("خاتم") || t.includes("ring")) return "/images/khatam-markah.png";
    if (t.includes("أساور") || t.includes("اساور") || t.includes("سوار")) return "/images/asawer.png";
    if (t.includes("طقم") || t.includes("سلسال") || t.includes("سناسل")) return "/images/atqam-nawaem.png";
    return null;
  };

  if (!user) {
    return null;
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-paper pb-24 pt-6" dir="rtl">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          
          {/* ── شريط الترحيب والملف الشخصي ── */}
          <div className="relative overflow-hidden rounded-3xl border border-steel/20 bg-white p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#E0457D]/20 to-[#E0457D]/5 text-[#E0457D] border border-[#E0457D]/30 shadow-inner">
                  <i className="fa-solid fa-crown text-2xl" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="font-display text-2xl sm:text-3xl text-charcoal">
                      أهلاً بك، {user.name || "عميلتنا العزيزة"}
                    </h1>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-charcoal/60">
                    <span className="flex items-center gap-1.5 font-mono">
                      <i className="fa-solid fa-phone text-xs text-[#E0457D]" />
                      {user.phone}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 sm:pt-0">
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 rounded-xl border border-steel/30 bg-paper-2 px-4 py-2.5 text-sm font-semibold text-charcoal hover:bg-steel/10 transition-colors"
                >
                  <i className="fa-solid fa-arrow-right-from-bracket text-xs text-charcoal/60" />
                  تسجيل الخروج
                </button>
              </div>
            </div>
          </div>

          {/* ── شبكة الأقسام الرئيسية ── */}
          <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">

            {/* ── العمود الأيمن (7 أعمدة): بطاقة النقاط وإدخال كود المحل ── */}
            <div className="space-y-8 lg:col-span-7">

              {/* ── 1. قسم بطاقة ولاء July الرقمية (VIP Loyalty Pass) ── */}
              <div className="relative overflow-hidden rounded-3xl border border-pink-200/80 bg-gradient-to-br from-white via-[#FFF8FA] to-[#FFF0F6] p-6 sm:p-8 shadow-sm">
                {/* توهجات جمالية ناعمة */}
                <div className="pointer-events-none absolute -left-12 -top-12 h-48 w-48 rounded-full bg-[#E0457D]/10 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-12 -right-12 h-44 w-44 rounded-full bg-pink-200/40 blur-3xl" />

                <div className="relative">
                  {/* رأس بطاقة الولاء */}
                  <div className="flex items-center justify-between border-b border-pink-100/80 pb-4">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#E0457D] to-[#c9366c] text-white shadow-md shadow-[#E0457D]/20">
                        <i className="fa-solid fa-crown text-base" />
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="font-display text-xl sm:text-2xl text-neutral-900">
                            رصيد نقاط الولاء
                          </h2>
                          <span className="rounded-full bg-pink-100/80 px-2.5 py-0.5 text-[11px] font-bold text-[#E0457D]">
                            عضوية تميّز July
                          </span>
                        </div>
                        <p className="text-xs text-neutral-500 mt-0.5">
                          برنامج مكافآت زبائن متجر July للأكسسوارات
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={loadPointsData}
                      disabled={pointsLoading}
                      title="تحديث الرصيد"
                      className="inline-flex items-center gap-1.5 rounded-full border border-pink-200 bg-white/90 px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-white hover:text-[#E0457D] transition shadow-xs disabled:opacity-50"
                    >
                      <i className={`fa-solid fa-arrows-rotate text-xs ${pointsLoading ? "animate-spin text-[#E0457D]" : ""}`} />
                      <span className="hidden sm:inline">تحديث</span>
                    </button>
                  </div>

                  {/* إجمالي الرصيد */}
                  <div className="my-6">
                    <div className="flex flex-wrap items-baseline gap-2.5">
                      <span className="font-mono text-5xl sm:text-6xl font-black tracking-tight text-neutral-900">
                        {points}
                      </span>
                      <span className="text-xl sm:text-2xl font-bold text-[#E0457D]">
                        نقطة ولاء
                      </span>
                    </div>

                    {/* رسالة توضيحية */}
                    <p className="mt-3 text-sm text-neutral-600 leading-relaxed text-right">
                      {points === 0
                        ? "هذا هو إجمالي رصيدك المتاح حالياً. ابدئي رحلتك واكسبي نقاطاً مع كل عملية شراء لاستبدالها بهدايا فاخرة وخصومات حصرية."
                        : "رصيدك الحالي مربوط بحسابك مباشرة وجاهز للاستبدال بالمكافآت الحصرية المدرجة أدناه فور اكتمال النقاط المطلوبة."}
                    </p>

                    {/* شريط التقدم للهدف القادم (Goal Gradient Effect) */}
                    {nextReward && (
                      <div className="mt-4 rounded-2xl bg-white/90 border border-pink-200/60 p-3.5 shadow-xs">
                        <div className="flex items-center justify-between text-xs font-medium mb-1.5">
                          <span className="text-neutral-700 flex items-center gap-1.5">
                            <i className="fa-solid fa-bullseye text-[#E0457D]" />
                            هدفكِ القادم: <strong className="text-neutral-900">{nextReward.title}</strong>
                          </span>
                          <span className="font-mono text-[#E0457D] font-bold">
                            متبقي {Math.max(0, nextReward.points_required - points)} نقطة
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-pink-100">
                          <div
                            className="h-full rounded-full bg-gradient-to-l from-[#E0457D] to-pink-400 transition-all duration-500"
                            style={{
                              width: `${Math.min(100, Math.round((points / nextReward.points_required) * 100))}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* أزرار الإجراء والتحفيز (Call-To-Action / Empty State UX) */}
                  <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                    <Link
                      href="/#products"
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#E0457D] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#E0457D]/25 hover:bg-[#c9366c] active:scale-[0.99] transition text-center"
                    >
                      <i className="fa-solid fa-bag-shopping text-sm" />
                      <span>تسوقي الآن واكسبي نقاطاً</span>
                    </Link>
                    <a
                      href="#redeem-section"
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-pink-200 bg-white px-5 py-3.5 text-sm font-semibold text-neutral-800 hover:bg-pink-50/60 hover:border-pink-300 transition text-center"
                    >
                      <i className="fa-solid fa-ticket text-xs text-[#E0457D]" />
                      <span>إضافة كود من فاتورة المحل</span>
                    </a>
                  </div>

                  {/* شريط مزايا ومصداقية النقاط */}
                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-2.5 border-t border-pink-100/80 pt-5 text-xs text-neutral-600">
                    <div className="flex items-center gap-2 rounded-xl bg-white/70 border border-pink-100/60 px-3 py-2">
                      <i className="fa-solid fa-shield-halved text-[#E0457D] text-sm shrink-0" />
                      <span className="font-medium">نقاط مربوطة برقمك ولا تنتهي</span>
                    </div>
                    <div className="flex items-center gap-2 rounded-xl bg-white/70 border border-pink-100/60 px-3 py-2">
                      <i className="fa-solid fa-gift text-[#E0457D] text-sm shrink-0" />
                      <span className="font-medium">استبدال فوري بدون تعقيد</span>
                    </div>
                    <div className="flex items-center gap-2 rounded-xl bg-white/70 border border-pink-100/60 px-3 py-2">
                      <i className="fa-solid fa-store text-[#E0457D] text-sm shrink-0" />
                      <span className="font-medium">سارية بالفروع وأونلاين</span>
                    </div>
                  </div>
                </div>
              </div>


              {/* ── 2. قسم جوائز ومكافآت النقاط ── */}
              {rewards.length > 0 && (
                <div className="rounded-3xl border border-steel/20 bg-white p-6 sm:p-8 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-steel/10 pb-4 mb-6 gap-3">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#E0457D]/15 to-[#E0457D]/5 text-[#E0457D] border border-[#E0457D]/20 shadow-xs">
                        <i className="fa-solid fa-gift text-lg" />
                      </span>
                      <div>
                        <h3 className="font-display text-xl sm:text-2xl text-neutral-900">
                          جوائز ومكافآت النقاط
                        </h3>
                        <p className="text-xs text-neutral-500 mt-0.5">
                          اجمعي النقاط واحصلي على جائزتك المفضلة كهدية مجانية من المحل
                        </p>
                      </div>
                    </div>
                    <span className="self-start sm:self-auto rounded-full bg-pink-50 border border-pink-200/80 px-3.5 py-1 text-xs font-semibold text-[#E0457D]">
                      {getRewardCountBadge(rewards.length)}
                    </span>
                  </div>

                  <div className="space-y-4">
                    {rewards.map((rew) => {
                      const isUnlocked = points >= rew.points_required;
                      const progressPercent = Math.min(100, Math.round((points / rew.points_required) * 100));
                      const remaining = Math.max(0, rew.points_required - points);
                      const rewardImg = getRewardImage(rew);

                      return (
                        <div
                          key={rew.id}
                          className={`rounded-2xl border p-4 sm:p-5 transition ${
                            isUnlocked
                              ? "border-emerald-300 bg-emerald-50/50 shadow-sm shadow-emerald-600/5 ring-1 ring-emerald-400/20"
                              : "border-steel/20 bg-paper hover:border-pink-200 hover:shadow-xs"
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-start gap-4">
                              {/* صورة المنتج الحقيقية أو الأيقونة الفاخرة */}
                              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-pink-100 bg-white p-1.5 shadow-xs flex items-center justify-center">
                                {rewardImg ? (
                                  <img
                                    src={rewardImg}
                                    alt={rew.title}
                                    className="h-full w-full object-contain transition-transform hover:scale-105"
                                  />
                                ) : (
                                  <div
                                    className={`flex h-full w-full items-center justify-center rounded-xl ${
                                      isUnlocked
                                        ? "bg-emerald-100 text-emerald-700"
                                        : "bg-[#E0457D]/10 text-[#E0457D]"
                                    }`}
                                  >
                                    <i className={`fa-solid ${rew.icon || "fa-gem"} text-2xl`} />
                                  </div>
                                )}
                                {/* شارة القفل أو الفتح */}
                                <div
                                  className={`absolute bottom-1 left-1 flex h-6 w-6 items-center justify-center rounded-full text-[10px] shadow-xs ${
                                    isUnlocked
                                      ? "bg-emerald-600 text-white"
                                      : "bg-neutral-800/80 text-white backdrop-blur-xs"
                                  }`}
                                  title={isUnlocked ? "مفتوحة للاستلام" : "مغلقة حتى اكتمال النقاط"}
                                >
                                  <i className={`fa-solid ${isUnlocked ? "fa-check" : "fa-lock"}`} />
                                </div>
                              </div>

                              {/* تفاصيل الجائزة */}
                              <div className="flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="font-display text-lg text-neutral-900">{rew.title}</h4>
                                  {rew.month_tag && (
                                    <span className="inline-flex items-center gap-1 rounded-md bg-pink-50 border border-pink-200/80 px-2 py-0.5 text-[11px] font-semibold text-[#E0457D]">
                                      <i className="fa-solid fa-tag text-[9px]" />
                                      <span>{rew.month_tag.replace("1VIP", "VIP 1")}</span>
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-neutral-600 mt-1 leading-relaxed text-right">
                                  {rew.description}
                                </p>
                              </div>
                            </div>

                            {/* شارة النقاط المطلوبة الأنيقة المتناسقة */}
                            <div className="sm:self-center shrink-0">
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 font-mono text-xs font-bold shadow-xs ${
                                  isUnlocked
                                    ? "bg-emerald-600 text-white"
                                    : "bg-[#E0457D]/10 text-[#E0457D] border border-[#E0457D]/25"
                                }`}
                              >
                                <i className={`fa-solid ${isUnlocked ? "fa-gift" : "fa-gem"} text-[10px]`} />
                                <span>{rew.points_required} نقطة</span>
                              </span>
                            </div>
                          </div>

                          {/* شريط التقدم وحالة الاستحقاق */}
                          <div className="mt-4 pt-3.5 border-t border-steel/10">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs mb-2.5 font-medium gap-2">
                              {isUnlocked ? (
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full gap-2">
                                  <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                                    <i className="fa-solid fa-circle-check text-sm" />
                                    رصيدكِ مكتمل ومؤهل لاستلام هذه الجائزة!
                                  </span>
                                  <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-100/90 text-emerald-800 font-semibold px-3.5 py-1.5 text-xs border border-emerald-200 shadow-2xs">
                                    <i className="fa-solid fa-store text-xs text-emerald-700" />
                                    <span>تُسلَّم في فرع المحل بإبراز رقم هاتفكِ</span>
                                  </span>
                                </div>
                              ) : (
                                <span className="text-neutral-600 flex items-center gap-1.5">
                                  <i className="fa-solid fa-lock text-[11px] text-neutral-400" />
                                  <span>
                                    لديكِ <strong className="text-neutral-900 font-mono">{points}</strong> من{" "}
                                    <strong className="text-neutral-900 font-mono">{rew.points_required}</strong> نقطة (متبقي{" "}
                                    <strong className="text-[#E0457D] font-mono">{remaining}</strong> نقطة)
                                  </span>
                                </span>
                              )}
                              {!isUnlocked && (
                                <span className="font-mono text-neutral-500 font-semibold">{progressPercent}%</span>
                              )}
                            </div>

                            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 border border-slate-200/60">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  isUnlocked
                                    ? "bg-emerald-500"
                                    : "bg-gradient-to-l from-[#E0457D] to-pink-400"
                                }`}
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* بطاقة إرشادية لاستلام الجوائز */}
                  <div className="mt-6 rounded-2xl bg-gradient-to-r from-pink-50/70 to-paper border border-pink-200/70 p-4 text-xs text-neutral-700 flex items-start gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#E0457D]/10 text-[#E0457D] shrink-0 mt-0.5">
                      <i className="fa-solid fa-circle-info text-xs" />
                    </span>
                    <div className="leading-relaxed text-right">
                      <strong className="text-neutral-900 block mb-0.5">طريقة استلام هداياكِ بكل سهولة:</strong>
                      عند زيارة فرع محل <strong>July</strong> أظهري رقم هاتفكِ المسجل لاستلام هديتكِ فوراً، أو اكتبي ملاحظة في طلبكِ القادم عبر الموقع لاستلام الهدية مع طلبيتكِ.
                    </div>
                  </div>
                </div>
              )}

              {/* ── 3. قسم إدخال كود مشتريات المحل ── */}
              <div id="redeem-section" className="rounded-3xl border border-steel/20 bg-white p-6 sm:p-8 shadow-sm scroll-mt-24">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#E0457D]/10 text-[#E0457D]">
                    <i className="fa-solid fa-ticket text-base" />
                  </span>
                  <div>
                    <h3 className="font-display text-xl sm:text-2xl text-charcoal">
                      أضف نقاطك من مشتريات المحل
                    </h3>
                    <p className="text-xs text-charcoal/50">
                      شراء مباشر من الفرع؟ حوّلي فاتورتك إلى نقاط فورا
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-sm text-charcoal/70 leading-relaxed">
                  هل قمتِ بالشراء من فرع محل <strong>July للأكسسوارات</strong>؟ أدخلي الكود المطبوع على فاتورتك أو قسيمة الشراء لإضافة النقاط إلى حسابك مباشرة.
                </p>

                {/* رسالة نجاح */}
                {successMessage && (
                  <div className="mt-5 flex items-start gap-3 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800 animate-fadeIn">
                    <i className="fa-solid fa-circle-check mt-0.5 text-base text-emerald-600 shrink-0" />
                    <div className="flex-1 font-medium">{successMessage}</div>
                  </div>
                )}

                {/* رسالة خطأ */}
                {errorMessage && (
                  <div className="mt-5 flex items-start gap-3 rounded-2xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-800 animate-fadeIn">
                    <i className="fa-solid fa-circle-exclamation mt-0.5 text-base text-rose-600 shrink-0" />
                    <div className="flex-1 font-medium">{errorMessage}</div>
                  </div>
                )}

                {/* استمارة إدخال الكود */}
                <form onSubmit={handleRedeemCode} className="mt-6 space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-charcoal">
                      كود الخصم / نقاط المشتريات
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        dir="ltr"
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                        placeholder="مثال: JULY-100 أو VIP50"
                        disabled={submitting}
                        className="w-full rounded-2xl border border-steel/30 bg-paper px-4 py-3.5 text-base font-mono uppercase tracking-wider text-charcoal outline-none transition focus:border-[#E0457D] focus:ring-2 focus:ring-[#E0457D]/10 disabled:opacity-60"
                      />
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xs font-mono text-charcoal/30">
                        CODE
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs text-charcoal/50">
                      أدخلي الكود الذي حصلتِ عليه لإضافة النقاط إلى رصيدك فوراً (صالح للاستخدام مرة واحدة بحسابك).
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || !code.trim()}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#E0457D] py-3.5 text-base font-semibold text-white shadow-lg shadow-[#E0457D]/25 transition hover:bg-[#c9366c] active:scale-[0.99] disabled:opacity-50 disabled:shadow-none"
                  >
                    {submitting ? (
                      <>
                        <i className="fa-solid fa-spinner animate-spin" />
                        <span>جارٍ التحقق من الكود وإضافة النقاط...</span>
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-plus text-xs" />
                        <span>إضافة النقاط</span>
                      </>
                    )}
                  </button>
                </form>

                {/* نص توضيحي للأمان */}
                <div className="mt-6 rounded-2xl border border-steel/15 bg-paper p-4 text-xs text-charcoal/60 space-y-1">
                  <p className="font-semibold text-charcoal flex items-center gap-1.5">
                    <i className="fa-solid fa-lock text-[#E0457D]" />
                    شروط وقواعد النقاط:
                  </p>
                  <ul className="list-disc list-inside space-y-1 pr-1">
                    <li>يتم التحقق من صلاحية الكود وإضافة النقاط بطريقة آمنة من الخادم.</li>
                    <li>لا يمكن تكرار استخدام الكود نفسه أكثر من مرة لنفس الحساب.</li>
                    <li>يتم توثيق كل حركة في سجل نقاطك وتبقى محفوظة دائماً بحسابك.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* ── العمود الأيسر (5 أعمدة): سجل حركات النقاط ومعلومات الحساب ── */}
            <div className="space-y-8 lg:col-span-5">

              {/* ── 3. سجل حركات النقاط (Points History) ── */}
              <div className="rounded-3xl border border-steel/20 bg-white p-6 sm:p-7 shadow-sm">
                <div className="flex items-center justify-between border-b border-steel/10 pb-4">
                  <div className="flex items-center gap-2">
                    <i className="fa-solid fa-clock-rotate-left text-sm text-[#E0457D]" />
                    <h3 className="font-display text-xl text-charcoal">سجل النقاط</h3>
                  </div>
                  <span className="text-xs font-semibold text-charcoal/50">
                    {history.length} عمليات
                  </span>
                </div>

                <div className="mt-4 max-h-96 overflow-y-auto space-y-3 pr-1">
                  {history.length > 0 ? (
                    history.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className="flex items-center justify-between rounded-2xl border border-steel/15 bg-paper p-3.5 transition hover:bg-paper-2"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                              item.points < 0
                                ? "bg-rose-100 text-rose-600"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            <i
                              className={`fa-solid ${
                                item.points < 0 ? "fa-gift" : "fa-arrow-down-long"
                              } text-xs`}
                            />
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-charcoal">
                              {item.title || (item.points < 0 ? "استبدال هدية" : "مشتريات من المحل")}
                            </p>
                            <p className="text-xs font-mono text-charcoal/50">
                              {item.code ? `كود: ${item.code}` : "نقاط ولاء"} •{" "}
                              {new Date(item.created_at).toLocaleDateString("ar-EG", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`font-mono text-sm font-bold ${
                            item.points < 0 ? "text-rose-600" : "text-emerald-600"
                          }`}
                        >
                          {item.points > 0 ? `+${item.points}` : `${item.points}`}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-steel/25 bg-paper p-8 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-steel/10 text-charcoal/40 mb-3">
                        <i className="fa-solid fa-receipt text-lg" />
                      </div>
                      <p className="font-semibold text-sm text-charcoal">لا توجد حركات سابقة</p>
                      <p className="mt-1 text-xs text-charcoal/50 leading-relaxed">
                        عند إدخال كود مشتريات من المحل، سيظهر سجل النقاط وتاريخ الإضافة هنا.
                      </p>
                    </div>
                  )}
                </div>
              </div>


            </div>

          </div>

        </div>
      </main>
    </>
  );
}
