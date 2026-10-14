"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";

export default function LoginPage() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [redirectTarget, setRedirectTarget] = useState<string | null>(null);

  useState(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search).get("redirect");
      if (p) setRedirectTarget(p);
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });
      const data = await res.json();
      if (data.success) {
        window.dispatchEvent(new Event("july-auth-changed"));
        router.push(redirectTarget || "/");
      } else {
        setError(data.error || "خطأ غير معروف");
      }
    } catch (err: any) {
      setError(err.message || "خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-paper" dir="rtl">
        <div className="mx-auto max-w-md px-6 py-20">
          {/* العنوان */}
          <div className="mb-10 text-center">
            <h1 className="font-display text-4xl text-charcoal">تسجيل الدخول</h1>
            <p className="mt-3 text-sm text-charcoal/60">
              مرحباً بعودتك 💛 أدخلي بياناتك للمتابعة.
            </p>
          </div>

          {/* بطاقة الفورم */}
          <div className="rounded-3xl border border-steel/20 bg-white p-8 shadow-xl shadow-charcoal/5">
            {error && (
              <div className="mb-5 rounded-2xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-charcoal">
                  رقم الهاتف
                </label>
                <input
                  type="tel"
                  placeholder="05XXXXXXXX"
                  autoComplete="off"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  style={{ color: '#2C1E24' }}
                  className="w-full rounded-xl border border-steel/30 bg-paper px-4 py-3 text-sm outline-none transition focus:border-[#E0457D] focus:ring-2 focus:ring-[#E0457D]/10 placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-charcoal">
                  كلمة المرور
                </label>
                <input
                  type="password"
                  placeholder="أدخلي كلمة المرور"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-xl border border-steel/30 bg-paper px-4 py-3 text-sm text-charcoal outline-none transition focus:border-[#E0457D] focus:ring-2 focus:ring-[#E0457D]/10 placeholder:text-slate-400"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-charcoal py-3.5 text-sm font-semibold text-white transition hover:bg-charcoal/80 disabled:opacity-60"
              >
                {loading ? "جارٍ التحقق..." : "تسجيل الدخول"}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-charcoal/60">
              ليس لديكِ حساب؟{" "}
              <Link
                href={redirectTarget ? `/auth/signup?redirect=${encodeURIComponent(redirectTarget)}` : "/auth/signup"}
                className="font-semibold text-[#E0457D] hover:underline"
              >
                إنشاء حساب جديد
              </Link>
            </div>

            <div className="mt-4 text-center">
              <Link
                href="/"
                className="text-xs text-charcoal/40 hover:text-charcoal/60 underline"
              >
                متابعة كضيفة بدون تسجيل
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
