/** WCAG 2.1 contrast ratio, computed rather than eyeballed. */

/** @param {string} hex "#RRGGBB" */
export function hexToRgb(hex) {
  const n = parseInt(hex.replace("#", ""), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

const linear = (channel) => {
  const s = channel / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};

/** @param {string} hex "#RRGGBB" */
export function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/**
 * @param {string} a "#RRGGBB"
 * @param {string} b "#RRGGBB"
 * @returns {number} contrast ratio from 1 to 21
 */
export function contrastRatio(a, b) {
  const [la, lb] = [relativeLuminance(a), relativeLuminance(b)];
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * @param {number} ratio
 * @param {"normal" | "large"} [size]
 */
export const meetsAA = (ratio, size = "normal") => ratio >= (size === "large" ? 3 : 4.5);
