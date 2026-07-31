import { describe, expect, it } from 'vitest';
import { formatEuro, formatPrice } from '../src/format';

describe('formatEuro', () => {
  it('APP-3: ganze Euro ohne Nachkommastellen', () => {
    expect(formatEuro(2190000)).toBe('21.900 €');
  });
  it('APP-3: Centbeträge mit zwei Nachkommastellen und Komma', () => {
    expect(formatEuro(750)).toBe('7,50 €');
  });
});

describe('formatPrice', () => {
  it('INS-3: VB + netto als Suffix', () => {
    expect(formatPrice(2190000, 'NEGOTIABLE', true)).toEqual({
      main: '21.900 €',
      suffix: 'VB · netto',
    });
  });
  it('INS-3: Festpreis brutto', () => {
    expect(formatPrice(100000, 'FIXED', false)).toEqual({ main: '1.000 €', suffix: 'brutto' });
  });
  it('INS-3: „Preis auf Anfrage" ohne Suffix', () => {
    expect(formatPrice(null, 'ON_REQUEST', true)).toEqual({ main: 'Preis auf Anfrage', suffix: null });
    expect(formatPrice(null, 'NEGOTIABLE', true).main).toBe('Preis auf Anfrage');
  });
});
