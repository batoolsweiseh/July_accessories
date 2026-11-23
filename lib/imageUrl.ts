/**
 * يحوّل أي image_url إلى رابط proxy آمن
 * الصور من المشروع القديم (ibbrknipfisyfpgtxtks) تعبر عبر /api/img
 * الصور من المشروع الجديد تُرجَع مباشرة
 * إذا كانت URL فارغة أو null → placeholder
 */
export function getProxiedImageUrl(url: string | null | undefined): string {
  if (!url) return "/product-placeholder.png";

  // المشروع الجديد - مباشر
  if (url.includes("qcqwuulqajlrrblcslyf")) return url;

  // المشروع القديم أو أي URL خارجي - عبر proxy
  if (url.startsWith("http")) {
    return `/api/img?url=${encodeURIComponent(url)}`;
  }

  // مسار نسبي
  return url;
}
