import { describe, expect, it } from 'vitest';
import { isValidVatId, normalizeVatId } from '../src/lib/vat.js';

describe('normalizeVatId', () => {
  it('entfernt Leerzeichen, Punkte und Bindestriche und schreibt groß', () => {
    expect(normalizeVatId('de 123.456-789')).toBe('DE123456789');
  });
});

describe('isValidVatId', () => {
  it('akzeptiert gültige deutsche USt-IdNrn.', () => {
    expect(isValidVatId('DE123456789')).toBe(true);
    expect(isValidVatId('de 123 456 789')).toBe(true);
  });

  it('lehnt falsche Längen ab', () => {
    expect(isValidVatId('DE12345678')).toBe(false);
    expect(isValidVatId('DE1234567890')).toBe(false);
  });

  it('prüft weitere EU-Formate', () => {
    expect(isValidVatId('ATU12345678')).toBe(true);
    expect(isValidVatId('NL123456789B01')).toBe(true);
    expect(isValidVatId('PL1234567890')).toBe(true);
    expect(isValidVatId('ATU1234567')).toBe(false);
  });

  it('fällt für unbekannte Präfixe auf generisches Muster zurück', () => {
    expect(isValidVatId('SE123456789012')).toBe(true);
    expect(isValidVatId('123456')).toBe(false);
  });
});
