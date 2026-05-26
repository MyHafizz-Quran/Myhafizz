// ─── Arabic display utility helpers ──────────────────────────────────────────
// Shared between Settings.jsx preview and VerseCard.jsx

export function getArabicFontClass(font) {
  switch (font) {
    case "amiri": return "font-[Amiri]";
    case "scheherazade": return "font-[Scheherazade_New]";
    case "noto": return "font-[Noto_Naskh_Arabic]";
    default: return "font-arabic";
  }
}

export function getArabicSizeClass(size) {
  switch (size) {
    case "small": return "text-xl";
    case "large": return "text-3xl";
    case "xlarge": return "text-4xl";
    default: return "text-2xl";
  }
}

export function getLineSpacingClass(spacing) {
  switch (spacing) {
    case "compact": return "leading-snug";
    case "airy": return "leading-loose";
    default: return "leading-relaxed";
  }
}

export function getTextContrastClass(contrast) {
  return contrast === "high"
    ? "text-gray-950 dark:text-white font-bold"
    : "text-foreground";
}
