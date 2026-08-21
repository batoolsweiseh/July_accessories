/**
 * فحص ما إذا كان المنتج من فئات الساعات، الإكسسوارات، أو أطقم الإكسسوارات
 * والتي تتطلب اختيار اللون (فضي أو ذهبي) عند الطلب، باستثناء الحقائب/الشنط.
 */
export function supportsColorChoice(categoryOrSlug?: string): boolean {
  if (!categoryOrSlug) return true;
  const s = String(categoryOrSlug).toLowerCase().trim();
  if (
    s.includes("bag") ||
    s.includes("حقائب") ||
    s.includes("شنط") ||
    s.includes("حقيبة")
  ) {
    return false;
  }
  return true;
}

export type ProductColor = "ذهبي" | "فضي";
