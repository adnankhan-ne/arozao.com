/**
 * AROZAO Validation Helpers
 * Validates and normalizes Bangladeshi phone numbers and email formats.
 */

/**
 * Normalizes and validates a Bangladeshi mobile phone number.
 * - Converts Bengali digits to English digits
 * - Strips whitespace, hyphens, and +88 country code
 * - Validates standard BD 11-digit mobile operator prefixes (013, 014, 015, 016, 017, 018, 019)
 *
 * @param input Raw phone number string from user input
 * @returns 11-digit normalized string "01XXXXXXXXX" if valid, otherwise null.
 */
export function normalizeBdPhone(input: string | null | undefined): string | null {
  if (!input || typeof input !== "string") return null;

  // Remove spaces, hyphens, parentheses, and convert Bengali numerals to English digits
  const digits = input
    .replace(/[০-৯]/g, (d) => "০১২৩৪৫৬৭৮৯".indexOf(d).toString())
    .replace(/[\s\-()]/g, "");

  const match = digits.match(/^(?:\+?88)?(01[3-9]\d{8})$/);
  return match ? match[1] : null; // Returns 01XXXXXXXXX if valid, otherwise null
}

/**
 * Validates standard email address format.
 */
export function isValidEmail(input: string | null | undefined): boolean {
  if (!input || typeof input !== "string") return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.trim());
}
