import { db } from '../db';
import { siteVisits } from '@shared/schema';
import { sql, gte, and, isNotNull } from 'drizzle-orm';
import { notifyDailySummary } from './telegramNotifier';

let intervalId: NodeJS.Timeout | null = null;

export async function generateDailySummary(): Promise<void> {
  console.log('[DailySummary] Generating daily visit summary...');

  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Get all visits from the last 24 hours
    const visits = await db.select()
      .from(siteVisits)
      .where(gte(siteVisits.createdAt, oneDayAgo));

    const totalVisits = visits.length;
    const registeredVisits = visits.filter(v => v.userId !== null).length;
    const unregisteredVisits = totalVisits - registeredVisits;

    // Count unique IPs
    const uniqueIps = new Set(visits.map(v => v.ipAddress)).size;

    // Count VPN/Proxy visits
    const vpnProxyCount = visits.filter(v => v.isVpn || v.isProxy).length;

    // Count suspicious activity
    const suspiciousCount = visits.filter(v => {
      if (!v.securityFlags) return false;
      try {
        const flags = JSON.parse(v.securityFlags);
        return flags.length > 0;
      } catch {
        return false;
      }
    }).length;

    // Get top countries
    const countryCounts = new Map<string, number>();
    visits.forEach(v => {
      const country = v.country || 'Unknown';
      countryCounts.set(country, (countryCounts.get(country) || 0) + 1);
    });

    const topCountries = Array.from(countryCounts.entries())
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Send the summary
    await notifyDailySummary({
      totalVisits,
      registeredVisits,
      unregisteredVisits,
      uniqueIps,
      topCountries,
      vpnProxyCount,
      suspiciousCount,
    });

    console.log('[DailySummary] Daily summary sent successfully');
  } catch (error) {
    console.error('[DailySummary] Error generating daily summary:', error);
  }
}

export function startDailySummaryJob(): void {
  // Run every 24 hours
  const INTERVAL_MS = 24 * 60 * 60 * 1000;

  console.log('[DailySummary] Starting daily summary job (runs every 24 hours)');

  // Schedule the job
  intervalId = setInterval(generateDailySummary, INTERVAL_MS);

  // Also schedule first run at midnight
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const timeUntilMidnight = midnight.getTime() - now.getTime();

  setTimeout(() => {
    generateDailySummary();
    // Reset the interval to run at midnight each day
    if (intervalId) {
      clearInterval(intervalId);
    }
    intervalId = setInterval(generateDailySummary, INTERVAL_MS);
  }, timeUntilMidnight);

  console.log(`[DailySummary] First summary scheduled in ${Math.round(timeUntilMidnight / 1000 / 60)} minutes`);
}

export function stopDailySummaryJob(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('[DailySummary] Daily summary job stopped');
  }
}
