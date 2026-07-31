import { prisma } from '../db.js';

/**
 * Markiert überfällige aktive Inserate als EXPIRED (INS-5).
 * Läuft periodisch im Server; die Suche filtert zusätzlich selbst,
 * damit Korrektheit nicht vom Sweep-Intervall abhängt.
 */
export async function expireOverdueListings(): Promise<number> {
  const result = await prisma.listing.updateMany({
    where: { status: 'ACTIVE', expiresAt: { lt: new Date() } },
    data: { status: 'EXPIRED' },
  });
  return result.count;
}
