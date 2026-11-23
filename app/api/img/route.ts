import { NextResponse } from "next/server";

/**
 * /api/img?url=<encoded_url>
 * Image proxy: يجلب الصورة من المشروع القديم أو يرجع placeholder عند 402/فشل
 * يحفظ الصور في cache لتقليل الطلبات
 */
export const runtime = "edge";

const PLACEHOLDER_REDIRECT = "/product-placeholder.png";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get("url");

  if (!imageUrl) {
    return NextResponse.redirect(new URL(PLACEHOLDER_REDIRECT, request.url));
  }

  // إذا كانت الصورة من المشروع الجديد، أرجعها مباشرة
  if (imageUrl.includes("qcqwuulqajlrrblcslyf")) {
    return NextResponse.redirect(imageUrl);
  }

  try {
    const res = await fetch(imageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
      // cache الصور لمدة 24 ساعة
      next: { revalidate: 86400 },
    });

    if (!res.ok || res.status === 402 || res.status === 403) {
      return NextResponse.redirect(new URL(PLACEHOLDER_REDIRECT, request.url));
    }

    const contentType = res.headers.get("content-type") || "image/jpeg";
    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "X-Proxied": "1",
      },
    });
  } catch {
    return NextResponse.redirect(new URL(PLACEHOLDER_REDIRECT, request.url));
  }
}
