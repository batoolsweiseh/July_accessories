import { NextResponse, NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("customer_session")?.value;
    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 200 });
    }
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      return NextResponse.json({ authenticated: false }, { status: 200 });
    }
    const meta = user.user_metadata || {};
    const points = typeof meta.points === "number" ? Math.max(0, meta.points) : 0;
    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        name: meta.full_name || meta.name || "",
        phone: meta.phone || "",
        points: points,
      },
    }, { status: 200 });
  } catch (err: any) {
    console.error("Auth me error:", err);
    return NextResponse.json({ authenticated: false, error: err.message }, { status: 500 });
  }
}
