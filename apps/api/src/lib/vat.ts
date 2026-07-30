/**
 * Format-Validierung von EU-USt-IdNrn. (kein VIES-Abgleich — der passiert
 * manuell im Backoffice bzw. später per VIES-API, siehe FEATURES.md).
 */
const PATTERNS: Record<string, RegExp> = {
  AT: /^ATU\d{8}$/,
  BE: /^BE[01]\d{9}$/,
  CH: /^CHE\d{9}(MWST)?$/,
  DE: /^DE\d{9}$/,
  DK: /^DK\d{8}$/,
  ES: /^ES[A-Z0-9]\d{7}[A-Z0-9]$/,
  FR: /^FR[A-Z0-9]{2}\d{9}$/,
  IT: /^IT\d{11}$/,
  NL: /^NL\d{9}B\d{2}$/,
  PL: /^PL\d{10}$/,
};

const GENERIC = /^[A-Z]{2}[A-Z0-9]{2,12}$/;

export function normalizeVatId(input: string): string {
  return input.replace(/[\s.-]/g, '').toUpperCase();
}

export function isValidVatId(input: string): boolean {
  const vat = normalizeVatId(input);
  const prefix = vat.slice(0, 2);
  const pattern = PATTERNS[prefix];
  if (pattern) return pattern.test(vat);
  return GENERIC.test(vat);
}
