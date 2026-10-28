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
    const { name, phone, password } = body;

    if (!phone || !password || !name) {
      return NextResponse.json(
        { success: false, error: "يرجى ملء جميع الحقول المطلوبة (الاسم، رقم الهاتف، كلمة المرور)" },
        { status: 400 }
      );
    }

    const cleanPhone = String(phone).trim();
    const cleanName = String(name).trim();
    const email = phoneToEmail(cleanPhone);

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: "كلمة المرور يجب أن تتكون من 6 أحرف أو أرقام على الأقل" },
        { status: 400 }
      );
    }

    // إنشاء المستخدم في Supabase Auth
    const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: cleanName,
        phone: cleanPhone,
        points: 0,
        loyalty_history: [],
      },
    });

    if (createError) {
      const msg = createError.message.toLowerCase();
      if (msg.includes("already registered") || msg.includes("already exists")) {
        return NextResponse.json(
          { success: false, error: "رقم الهاتف هذا مسجّل بالفعل. يمكنك تسجيل الدخول مباشرة." },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { success: false, error: createError.message || "فشل إنشاء الحساب، يرجى المحاولة لاحقاً" },
        { status: 400 }
      );
    }

    // مزامنة الملف الشخصي مع جدول user_profiles إن وجد
    if (createData?.user) {
      try {
        await supabaseAdmin.from("user_profiles").upsert({
          id: createData.user.id,
          full_name: cleanName,
          phone: cleanPhone,
          email,
          points: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: "id" });
      } catch { /* في حال عدم وجود الجدول */ }
    }

    // تسجيل الدخول فوراً لتوليد Session Token
    const { data: signInData } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    const user = createData.user;
    const token = signInData?.session?.access_token || "";

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: cleanName,
        phone: cleanPhone,
      },
      token,
    });

    if (token) {
      response.cookies.set("customer_session", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
    }

    return response;
  } catch (err: any) {
    console.error("Register error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "حدث خطأ غير متوقع في الخادم" },
      { status: 500 }
    );
  }
}
