interface GeoLocationResult {
  ip: string;
  country: string | null;
  countryCode: string | null;
  city: string | null;
  isp: string | null;
  isVpn: boolean;
  isProxy: boolean;
  timezone: string | null;
}

interface IpApiResponse {
  status: string;
  country?: string;
  countryCode?: string;
  city?: string;
  isp?: string;
  proxy?: boolean;
  hosting?: boolean;
  timezone?: string;
  query?: string;
}

const geoCache = new Map<string, { data: GeoLocationResult; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function getIpGeolocation(ip: string): Promise<GeoLocationResult> {
  // Return cached result if available and not expired
  const cached = geoCache.get(ip);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  // Skip lookup for localhost/private IPs
  if (isPrivateIp(ip)) {
    const result: GeoLocationResult = {
      ip,
      country: 'Local',
      countryCode: 'LO',
      city: 'Localhost',
      isp: 'Private Network',
      isVpn: false,
      isProxy: false,
      timezone: null,
    };
    return result;
  }

  try {
    // Using ip-api.com (free, 45 req/min limit)
    const response = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,country,countryCode,city,isp,proxy,hosting,timezone,query`
    );

    if (!response.ok) {
      console.error(`[GeoIP] API request failed: ${response.status}`);
      return getDefaultResult(ip);
    }

    const data: IpApiResponse = await response.json();

    if (data.status !== 'success') {
      console.error(`[GeoIP] Lookup failed for ${ip}`);
      return getDefaultResult(ip);
    }

    const result: GeoLocationResult = {
      ip: data.query || ip,
      country: data.country || null,
      countryCode: data.countryCode || null,
      city: data.city || null,
      isp: data.isp || null,
      isVpn: data.hosting || false, // hosting = datacenter IP (likely VPN)
      isProxy: data.proxy || false,
      timezone: data.timezone || null,
    };

    // Cache the result
    geoCache.set(ip, { data: result, timestamp: Date.now() });

    return result;
  } catch (error) {
    console.error(`[GeoIP] Error looking up ${ip}:`, error);
    return getDefaultResult(ip);
  }
}

function getDefaultResult(ip: string): GeoLocationResult {
  return {
    ip,
    country: 'Unknown',
    countryCode: null,
    city: null,
    isp: null,
    isVpn: false,
    isProxy: false,
    timezone: null,
  };
}

function isPrivateIp(ip: string): boolean {
  if (!ip || ip === '::1' || ip === '127.0.0.1' || ip === 'localhost') {
    return true;
  }
  
  // Check for private IP ranges
  const privateRanges = [
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
    /^169\.254\./,
    /^fc00:/,
    /^fe80:/,
  ];

  return privateRanges.some(range => range.test(ip));
}

export function parseUserAgent(userAgent: string): { browser: string; os: string; deviceType: string } {
  let browser = 'Unknown';
  let os = 'Unknown';
  let deviceType = 'desktop';

  // Detect browser
  if (userAgent.includes('Firefox/')) {
    browser = 'Firefox';
  } else if (userAgent.includes('Edg/')) {
    browser = 'Edge';
  } else if (userAgent.includes('Chrome/')) {
    browser = 'Chrome';
  } else if (userAgent.includes('Safari/') && !userAgent.includes('Chrome')) {
    browser = 'Safari';
  } else if (userAgent.includes('Opera') || userAgent.includes('OPR/')) {
    browser = 'Opera';
  }

  // Detect OS
  if (userAgent.includes('Windows NT')) {
    os = 'Windows';
  } else if (userAgent.includes('Mac OS X')) {
    os = 'macOS';
  } else if (userAgent.includes('Linux')) {
    os = 'Linux';
  } else if (userAgent.includes('Android')) {
    os = 'Android';
  } else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    os = 'iOS';
  }

  // Detect device type
  if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
    deviceType = 'mobile';
  } else if (userAgent.includes('Tablet') || userAgent.includes('iPad')) {
    deviceType = 'tablet';
  }

  return { browser, os, deviceType };
}

export function getClientIp(req: any): string {
  // Handle various proxy headers (Cloudflare, Nginx, etc.)
  const xForwardedFor = req.headers['x-forwarded-for'];
  const xRealIp = req.headers['x-real-ip'];
  const cfConnectingIp = req.headers['cf-connecting-ip'];

  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  if (xForwardedFor) {
    const ips = xForwardedFor.split(',').map((ip: string) => ip.trim());
    return ips[0];
  }

  if (xRealIp) {
    return xRealIp;
  }

  return req.ip || req.connection?.remoteAddress || 'unknown';
}
