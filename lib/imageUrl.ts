/**
 * يحوّل أي image_url إلى رابط proxy آمن ومحمي
 * الصور تعبر عبر /api/img ليتم تخزينها في Vercel Edge Cache
 * هذا يحمي Supabase تماماً من استهلاك الـ Egress حتى لا يتوقف المشروع أبداً
 */
export function getProxiedImageUrl(url: string | null | undefined): string {
  if (!url) return "/product-placeholder.png";

  // أي رابط Supabase أو رابط خارجي يمر عبر الـ Proxy المحمي لتقليل استهلاك السيرفر
  if (url.startsWith("http")) {
    return `/api/img?url=${encodeURIComponent(url)}`;
  }

  // مسار نسبي
  return url;
}
