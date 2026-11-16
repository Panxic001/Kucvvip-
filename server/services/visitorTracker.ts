import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { siteVisits, userIpHistory, highRiskCountries, users } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getIpGeolocation, parseUserAgent, getClientIp } from './ipGeolocation';
import { notifyVisitorAlert } from './telegramNotifier';

interface AuthRequest extends Request {
  userId?: number;
}

const HIGH_RISK_COUNTRIES_DEFAULT = [
  'RU', 'CN', 'KP', 'IR', 'NG', 'VN', 'IN', 'PK', 'BD', 'UA'
];

const recentVisits = new Map<string, number>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute

export async function trackVisitor(req: AuthRequest, res: Response, next: NextFunction) {
  // Skip tracking for static assets and health checks
  const path = req.path;
  if (
    path.startsWith('/assets') ||
    path.startsWith('/@') ||
    path.includes('.') ||
    path === '/favicon.ico' ||
    path === '/health'
  ) {
    return next();
  }

  // Rate limit tracking to prevent spam
  const ip = getClientIp(req);
  const trackingKey = `${ip}:${req.userId || 'anon'}`;
  const lastVisit = recentVisits.get(trackingKey);
  
  if (lastVisit && Date.now() - lastVisit < RATE_LIMIT_WINDOW) {
    return next();
  }
  recentVisits.set(trackingKey, Date.now());

  // Process tracking asynchronously to not block response
  setImmediate(async () => {
    try {
      await processVisitorTracking(req, ip);
    } catch (error) {
      console.error('[VisitorTracker] Error tracking visitor:', error);
    }
  });

  next();
}

async function processVisitorTracking(req: AuthRequest, ip: string) {
  const userAgent = req.headers['user-agent'] || '';
  const { browser, os, deviceType } = parseUserAgent(userAgent);
  const geoData = await getIpGeolocation(ip);

  const securityFlags: string[] = [];
  let user = null;

  // Get user info if logged in
  if (req.userId) {
    const userResult = await db.select().from(users).where(eq(users.id, req.userId)).limit(1);
    user = userResult[0] || null;
  }

  // Check for VPN/Proxy
  if (geoData.isVpn || geoData.isProxy) {
    securityFlags.push('VPN_PROXY_DETECTED');
  }

  // Check for high-risk country
  const isHighRisk = await checkHighRiskCountry(geoData.countryCode);
  if (isHighRisk) {
    securityFlags.push('HIGH_RISK_COUNTRY');
  }

  // If user is logged in, check for suspicious activity
  if (req.userId && user) {
    // Check for multiple IPs
    const multipleIpFlag = await checkMultipleIps(req.userId, ip);
    if (multipleIpFlag) {
      securityFlags.push('MULTIPLE_IP_ACTIVITY');
    }

    // Check for new country login
    const newCountryFlag = await checkNewCountryLogin(req.userId, geoData.countryCode, geoData.country);
    if (newCountryFlag) {
      securityFlags.push(`NEW_COUNTRY_LOGIN:${newCountryFlag}`);
    }

    // Update IP history
    await updateUserIpHistory(req.userId, ip, geoData);
  }

  // Log the visit
  await db.insert(siteVisits).values({
    userId: req.userId || null,
    ipAddress: ip,
    country: geoData.country,
    city: geoData.city,
    isp: geoData.isp,
    deviceType,
    browser,
    os,
    userAgent,
    pageVisited: req.path,
    isVpn: geoData.isVpn,
    isProxy: geoData.isProxy,
    securityFlags: securityFlags.length > 0 ? JSON.stringify(securityFlags) : null,
    telegramAlertSent: false,
  });

  // Send Telegram alert
  await notifyVisitorAlert({
    isRegistered: !!user,
    userId: user?.id,
    fullName: user?.fullName || user?.username,
    email: user?.email,
    phone: user?.mobileNumber,
    accountCreatedAt: user?.createdAt,
    ip,
    country: geoData.country,
    city: geoData.city,
    isp: geoData.isp,
    deviceType,
    browser,
    os,
    pageVisited: req.path,
    isVpn: geoData.isVpn,
    isProxy: geoData.isProxy,
    securityFlags,
  });
}

async function checkHighRiskCountry(countryCode: string | null): Promise<boolean> {
  if (!countryCode) return false;

  // Check database for high-risk countries
  const dbResult = await db.select()
    .from(highRiskCountries)
    .where(eq(highRiskCountries.countryCode, countryCode))
    .limit(1);

  if (dbResult.length > 0) {
    return true;
  }

  // Check default list
  return HIGH_RISK_COUNTRIES_DEFAULT.includes(countryCode);
}

async function checkMultipleIps(userId: number, currentIp: string): Promise<boolean> {
  // Get IP history from the last 24 hours
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  const ipHistory = await db.select()
    .from(userIpHistory)
    .where(eq(userIpHistory.userId, userId));

  // Filter to recent IPs (last 24 hours)
  const recentIps = ipHistory.filter(h => 
    h.lastSeenAt && new Date(h.lastSeenAt) > oneDayAgo
  );

  // Check if current IP is different from recent ones
  const uniqueIps = new Set(recentIps.map(h => h.ipAddress));
  uniqueIps.add(currentIp);

  return uniqueIps.size > 2; // Flag if more than 2 different IPs in 24 hours
}

async function checkNewCountryLogin(userId: number, currentCountryCode: string | null, currentCountry: string | null): Promise<string | null> {
  if (!currentCountryCode) return null;

  // Get previous country from IP history
  const previousHistory = await db.select()
    .from(userIpHistory)
    .where(eq(userIpHistory.userId, userId))
    .orderBy(desc(userIpHistory.lastSeenAt))
    .limit(1);

  if (previousHistory.length === 0) {
    return null; // First login, no previous country
  }

  const previousCountry = previousHistory[0].country;
  if (previousCountry && previousCountry !== currentCountry) {
    return `${previousCountry} → ${currentCountry}`;
  }

  return null;
}

async function updateUserIpHistory(userId: number, ip: string, geoData: any) {
  const existing = await db.select()
    .from(userIpHistory)
    .where(and(
      eq(userIpHistory.userId, userId),
      eq(userIpHistory.ipAddress, ip)
    ))
    .limit(1);

  if (existing.length > 0) {
    // Update existing record
    await db.update(userIpHistory)
      .set({
        lastSeenAt: new Date(),
        visitCount: (existing[0].visitCount || 0) + 1,
        country: geoData.country,
        city: geoData.city,
        isVpn: geoData.isVpn,
      })
      .where(eq(userIpHistory.id, existing[0].id));
  } else {
    // Insert new record
    await db.insert(userIpHistory).values({
      userId,
      ipAddress: ip,
      country: geoData.country,
      city: geoData.city,
      isVpn: geoData.isVpn,
    });
  }
}

// Clean up old rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  Array.from(recentVisits.entries()).forEach(([key, timestamp]) => {
    if (now - timestamp > RATE_LIMIT_WINDOW * 2) {
      recentVisits.delete(key);
    }
  });
}, RATE_LIMIT_WINDOW);
