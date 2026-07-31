import type { PriceType } from './types';

/** „21.900 €" bzw. „7,50 €" — ganze Euro ohne Nachkommastellen. */
export function formatEuro(cents: number): string {
  const euros = cents / 100;
  const hasCents = cents % 100 !== 0;
  return `${euros.toLocaleString('de-DE', {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  })} €`;
}

export function formatPrice(
  priceCents: number | null,
  priceType: PriceType,
  isNetPrice: boolean,
): { main: string; suffix: string | null } {
  if (priceType === 'ON_REQUEST' || priceCents == null) {
    return { main: 'Preis auf Anfrage', suffix: null };
  }
  const parts: string[] = [];
  if (priceType === 'NEGOTIABLE') parts.push('VB');
  parts.push(isNetPrice ? 'netto' : 'brutto');
  return { main: formatEuro(priceCents), suffix: parts.join(' · ') };
}

/** „vor 3 Min.", „vor 2 Std.", „gestern", sonst Datum. */
export function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const minutes = Math.floor((Date.now() - then) / 60000);
  if (minutes < 1) return 'gerade eben';
  if (minutes < 60) return `vor ${minutes} Min.`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'gestern';
  if (days < 7) return `vor ${days} Tagen`;
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

export const CONDITION_LABELS: Record<string, string> = {
  NEW: 'Neu',
  LIKE_NEW: 'Neuwertig',
  USED: 'Gebraucht',
  DEFECT: 'Defekt',
};

export const LISTING_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Entwurf',
  ACTIVE: 'Aktiv',
  PAUSED: 'Pausiert',
  SOLD: 'Verkauft',
  EXPIRED: 'Abgelaufen',
  REMOVED: 'Entfernt',
};

export const OFFER_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Offen',
  ACCEPTED: 'Angenommen',
  DECLINED: 'Abgelehnt',
  WITHDRAWN: 'Zurückgezogen',
};
