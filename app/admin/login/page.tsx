"use client";

import { useSearchParams } from "next/navigation";
import { loginAction } from "./actions";
import { Suspense } from "react";

function LoginForm() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const from = searchParams.get("from") || "/admin";

  return (
    <main
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-100"
      dir="rtl"
    >
      <div className="w-full max-w-sm mx-4">
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <h1
            style={{ fontFamily: "'Lalezar', serif" }}
            className="text-4xl text-neutral-900 tracking-wide"
          >
            July Accessories
          </h1>
          <p className="text-sm text-neutral-500 mt-1 font-medium">لوحة تحكم المشرف</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-8">
          <h2 className="text-lg font-bold text-neutral-800 mb-6 text-center">
            تسجيل الدخول
          </h2>

          <form action={loginAction} className="space-y-5">
            <input type="hidden" name="from" value={from} />

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-neutral-600">
                كلمة المرور
              </label>
              <input
                type="password"
                name="password"
                required
                autoFocus
                placeholder="أدخلي كلمة المرور"
                className="w-full border border-neutral-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all bg-white"
              />
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold px-4 py-2.5 rounded-xl text-center">
                كلمة المرور غير صحيحة. حاولي مجدداً.
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-neutral-900 hover:bg-neutral-700 text-white font-bold rounded-xl text-sm transition-all shadow-sm active:scale-95"
            >
              دخول
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-neutral-400 mt-5">
          هذه الصفحة مخصصة للمشرفين فقط
        </p>
      </div>
    </main>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
