import { describe, expect, it } from 'vitest';
import { formatEuro, formatPrice, formatRelative, formatTime } from '../src/format';

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

describe('formatRelative (APP-3)', () => {
  const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

  it('unter einer Minute → „gerade eben"', () => {
    expect(formatRelative(ago(20_000))).toBe('gerade eben');
  });
  it('Minuten und Stunden', () => {
    expect(formatRelative(ago(5 * 60_000))).toBe('vor 5 Min.');
    expect(formatRelative(ago(3 * 3_600_000))).toBe('vor 3 Std.');
  });
  it('gestern und Tage', () => {
    expect(formatRelative(ago(26 * 3_600_000))).toBe('gestern');
    expect(formatRelative(ago(3 * 24 * 3_600_000))).toBe('vor 3 Tagen');
  });
  it('ab einer Woche → Datum', () => {
    expect(formatRelative('2026-01-15T10:00:00Z')).toBe('15.01.2026');
  });
});

describe('formatTime', () => {
  it('APP-6: Uhrzeit im 24h-Format', () => {
    const date = new Date();
    date.setHours(14, 5, 0, 0);
    expect(formatTime(date.toISOString())).toBe('14:05');
  });
});
