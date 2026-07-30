/**
 * B&W CRM Landing Pages, Offers (?o), Promos (?p) & Visitor Journey Tracking SDK
 * Helper for satellite sites (SvitlanaTapes, victoria-mc, economica, etc.)
 */

export interface RegisteredPageConfig {
  label: string;
  url: string;
  path?: string;
  type?: 'free' | 'paid' | 'quiz' | 'thank_you' | 'other';
  badgeColor?: string;
  parameters?: Array<{ key: string; description?: string }>;
  metadata?: Record<string, unknown>;
}

export interface RegisterPagesPayload {
  projectSlug: string;
  apiKey: string;
  pages: RegisteredPageConfig[];
  crmApiUrl?: string;
}

/**
 * Sends a list of existing pages and supported URL parameters (?p, ?o, etc.) to B&W CRM.
 */
export async function registerSiteLandings({
  projectSlug,
  apiKey,
  pages,
  crmApiUrl = 'https://bnw-prod.vercel.app'
}: RegisterPagesPayload) {
  try {
    const endpoint = `${crmApiUrl.replace(/\/$/, '')}/api/v1/landings/register`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectSlug, apiKey, pages })
    });
    return await res.json();
  } catch {
    return { error: 'Failed to register landings' };
  }
}

const STORAGE_KEY = 'bnw_visitor_uuid';

/**
 * Retrieves existing or generates new unique Visitor UUID stored in localStorage & Cookie.
 */
export function getOrCreateVisitorUuid(): string {
  if (typeof window === 'undefined') return '';

  let uuid = localStorage.getItem(STORAGE_KEY);
  if (!uuid) {
    uuid = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `v_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem(STORAGE_KEY, uuid);
  }

  // Set cookie for cross-subdomain / request tracking
  try {
    document.cookie = `${STORAGE_KEY}=${uuid}; path=/; max-age=31536000; SameSite=Lax`;
  } catch {
    // Ignore cookie errors
  }

  return uuid;
}

/**
 * Extracts current query parameters (?p=..., ?o=..., etc.) from browser location.
 */
export function extractPageParams(): { offerId: string; promoId: string; params: Array<{ key: string; value: string }> } {
  if (typeof window === 'undefined') return { offerId: '', promoId: '', params: [] };
  const searchParams = new URLSearchParams(window.location.search);
  const params: Array<{ key: string; value: string }> = [];
  let offerId = '';
  let promoId = '';

  searchParams.forEach((val, key) => {
    const k = key.toLowerCase();
    params.push({ key: k, value: val });
    if (k === 'o' || k === 'offer' || k === 'offer_id') offerId = val;
    if (k === 'p' || k === 'promo' || k === 'promo_id' || k === 'package') promoId = val;
  });

  return { offerId, promoId, params };
}

/**
 * Tracks a pageview & session touchpoint directly to B&W CRM.
 */
export async function trackPageView({
  projectSlug,
  apiKey,
  crmApiUrl = 'https://bnw-prod.vercel.app'
}: {
  projectSlug: string;
  apiKey: string;
  crmApiUrl?: string;
}) {
  if (typeof window === 'undefined') return;

  const visitorUuid = getOrCreateVisitorUuid();
  const { offerId, promoId } = extractPageParams();
  const searchParams = new URLSearchParams(window.location.search);

  const payload = {
    project_slug: projectSlug,
    api_key: apiKey,
    lead: {
      status: 'Клик',
      visitor_uuid: visitorUuid
    },
    marketing: {
      visitor_uuid: visitorUuid,
      page_path: window.location.pathname,
      page_url: window.location.href,
      offer_id: offerId,
      promo_id: promoId,
      utm_source: searchParams.get('utm_source') || null,
      utm_medium: searchParams.get('utm_medium') || null,
      utm_campaign: searchParams.get('utm_campaign') || null,
      utm_content: searchParams.get('utm_content') || null,
      utm_term: searchParams.get('utm_term') || null
    },
    metadata: {
      query_params: Object.fromEntries(searchParams.entries()),
      referrer: document.referrer || null,
      screen_width: window.innerWidth,
      screen_height: window.innerHeight
    }
  };

  try {
    const endpoint = `${crmApiUrl.replace(/\/$/, '')}/api/v1/leads/register`;
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true
    }).catch(() => {});
  } catch {
    // Non-blocking
  }
}
