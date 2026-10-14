import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

/** تحويل رقم الهاتف إلى بريد إلكتروني داخلي يستخدمه Supabase */
function phoneToEmail(phone: string): string {
  const clean = phone.replace(/\s+/g, "").replace(/[^0-9+]/g, "");
  return `${clean}@july-store.local`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone, password } = body;

    if (!phone || !password) {
      return NextResponse.json(
        { success: false, error: "يرجى إدخال رقم الهاتف وكلمة المرور" },
        { status: 400 }
      );
    }

    const cleanPhone = String(phone).trim();
    const email = phoneToEmail(cleanPhone);

    // التحقق من بيانات الدخول عبر Supabase Auth
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user || !data.session) {
      return NextResponse.json(
        { success: false, error: "رقم الهاتف أو كلمة المرور غير صحيحة" },
        { status: 401 }
      );
    }

    const user = data.user;
    const meta = user.user_metadata || {};

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: meta.full_name || meta.name || "",
        phone: meta.phone || cleanPhone,
      },
      token: data.session.access_token,
    });

    response.cookies.set("customer_session", data.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch (err: any) {
    console.error("Login error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "حدث خطأ غير متوقع في الخادم" },
      { status: 500 }
    );
  }
}
