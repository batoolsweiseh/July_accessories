export type ProductPiece = {
  name: string;
  price: number;
  hasColors?: boolean; // خيارات ألوان (ذهبي / فضي)
};

export function parseProductPieces(description?: string | null): ProductPiece[] {
  if (!description) return [];

  let rawJson: string | null = null;
  // Match [pieces:[...]] with nested JSON array
  const doubleBracketMatch = description.match(/\[pieces:(\[[\s\S]*?\])\]/);
  if (doubleBracketMatch) {
    rawJson = doubleBracketMatch[1];
  } else {
    const singleBracketMatch = description.match(/\[pieces:([\s\S]*?)\]/);
    if (singleBracketMatch) {
      rawJson = singleBracketMatch[1];
    }
  }

  if (!rawJson) return [];

  let parsed: any = null;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    // If it was truncated by the old regex bug (missing closing bracket)
    try {
      if (!rawJson.endsWith("]")) {
        parsed = JSON.parse(rawJson + "]");
      }
    } catch {
      return [];
    }
  }

  if (Array.isArray(parsed)) {
    return parsed
      .filter((p) => p && typeof p.name === "string" && !isNaN(Number(p.price)))
      .map((p) => ({
        name: p.name.trim(),
        price: Number(p.price),
        hasColors: !!p.hasColors || p.colors === "all" || p.colors === "gold" || p.colors === "silver",
      }));
  }

  return [];
}

export function cleanDescriptionTags(description?: string | null): string {
  if (!description) return "";
  return description
    .replace(/\s*\[tag:(new|trending|colors)\]/g, "")
    .replace(/\s*\[pieces:\[[\s\S]*?\]\]/g, "")
    .replace(/\s*\[pieces:[\s\S]*?\]/g, "")
    .trim();
}

