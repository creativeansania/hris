/**
 * Utility for parsing and formatting client device information.
 * Converts cryptic User-Agent strings (e.g. Mozilla/5.0...) into clean,
 * human-readable summaries like "Android 10 • Chrome Mobile (PWA)" or "Windows 10/11 • Chrome".
 */

export interface ParsedDeviceInfo {
  os: string;
  browser: string;
  isPWA: boolean;
  isMobile: boolean;
  summary: string;
}

export function parseUserAgent(uaString?: string | null): ParsedDeviceInfo {
  if (!uaString || typeof uaString !== 'string' || !uaString.trim()) {
    return {
      os: 'Perangkat Tidak Dikenal',
      browser: 'Browser',
      isPWA: false,
      isMobile: false,
      summary: 'Perangkat Web',
    };
  }

  const ua = uaString.trim();

  // If already clean formatted (e.g. "Android 10 • Chrome Mobile (PWA)"), return directly
  if (ua.includes('•')) {
    const isPWA = ua.includes('(PWA)');
    const isMobile = /android|iphone|ipad|mobile/i.test(ua);
    return {
      os: ua.split('•')[0]?.trim() || 'Perangkat',
      browser: ua.split('•')[1]?.trim() || 'Browser',
      isPWA,
      isMobile,
      summary: ua,
    };
  }

  // Detect OS
  let os = 'Perangkat Tidak Dikenal';
  if (/android\s*([0-9.]+)?/i.test(ua)) {
    const match = ua.match(/android\s+([0-9.]+)/i);
    os = match ? `Android ${match[1]}` : 'Android';
  } else if (/iphone\s*os\s*([0-9_]+)/i.test(ua)) {
    const match = ua.match(/iphone\s*os\s*([0-9_]+)/i);
    os = match ? `iOS ${match[1].replace(/_/g, '.')}` : 'iOS (iPhone)';
  } else if (/ipad.*os\s*([0-9_]+)/i.test(ua)) {
    const match = ua.match(/os\s*([0-9_]+)/i);
    os = match ? `iPadOS ${match[1].replace(/_/g, '.')}` : 'iPadOS';
  } else if (/windows\s*nt\s*10\.0/i.test(ua)) {
    os = 'Windows 10/11';
  } else if (/windows\s*nt\s*([0-9.]+)/i.test(ua)) {
    os = 'Windows';
  } else if (/macintosh|mac\s*os\s*x/i.test(ua)) {
    os = 'macOS';
  } else if (/linux/i.test(ua)) {
    os = 'Linux';
  }

  // Detect Browser
  let browser = 'Browser';
  const isMobile = /mobile|android|iphone|ipad/i.test(ua);

  if (/edg\/([0-9.]+)/i.test(ua)) {
    browser = 'Edge';
  } else if (/samsungbrowser\/([0-9.]+)/i.test(ua)) {
    browser = 'Samsung Internet';
  } else if (/chrome\/([0-9.]+)/i.test(ua)) {
    browser = isMobile ? 'Chrome Mobile' : 'Chrome';
  } else if (/safari\/([0-9.]+)/i.test(ua) && !/chrome/i.test(ua)) {
    browser = isMobile ? 'Mobile Safari' : 'Safari';
  } else if (/firefox\/([0-9.]+)/i.test(ua)) {
    browser = isMobile ? 'Firefox Mobile' : 'Firefox';
  } else if (/opera|opr/i.test(ua)) {
    browser = 'Opera';
  }

  const isPWA = /standalone|pwa/i.test(ua);
  const modeTag = isPWA ? ' (PWA)' : '';
  const summary = `${os} • ${browser}${modeTag}`;

  return {
    os,
    browser,
    isPWA,
    isMobile,
    summary,
  };
}

/**
 * Returns a human-friendly string for display in UI tables and audit cards.
 */
export function formatDeviceInfo(rawInfo?: string | null): string {
  if (!rawInfo) return 'Perangkat Tidak Tercatat';
  return parseUserAgent(rawInfo).summary;
}

/**
 * Captures clean, structured device info from the client browser at runtime.
 */
export function getClientDeviceSummary(): string {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return 'Web Browser';
  }

  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true ||
    (typeof document !== 'undefined' && document.referrer.includes('android-app://'));

  const parsed = parseUserAgent(navigator.userAgent);
  const pwaTag = isStandalone ? ' (PWA)' : '';
  return `${parsed.os} • ${parsed.browser}${pwaTag}`;
}
