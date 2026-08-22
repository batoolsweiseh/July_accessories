export type ProductPiece = {
  name: string;
  price: number;
  hasColors?: boolean; // خيارات ألوان (ذهبي / فضي)
};

export function parseProductPieces(description?: string | null): ProductPiece[] {
  if (!description) return [];
  const match = description.match(/\[pieces:(.*?)\]/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[1]);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((p) => p && typeof p.name === "string" && !isNaN(Number(p.price)))
        .map((p) => ({
          name: p.name.trim(),
          price: Number(p.price),
          hasColors: !!p.hasColors || p.colors === "all" || p.colors === "gold" || p.colors === "silver",
        }));
    }
  } catch {
    return [];
  }
  return [];
}

export function cleanDescriptionTags(description?: string | null): string {
  if (!description) return "";
  return description
    .replace(/\s*\[tag:(new|trending|colors)\]/g, "")
    .replace(/\s*\[pieces:.*?\]/g, "")
    .trim();
}
