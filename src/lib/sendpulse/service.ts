/**
 * SendPulse REST API Service Client
 * Handles token generation, caching, bot inspections, and subscriber statistics.
 */

const SENDPULSE_CREDENTIALS: Record<string, { clientId: string; clientSecret: string }> = {
  sergiy: {
    clientId: process.env.SENDPULSE_SERGIY_CLIENT_ID || 'sp_id_dcd767242d4f919193dba2016a06b6f6',
    clientSecret: process.env.SENDPULSE_SERGIY_CLIENT_SECRET || 'sp_sk_243da6c412d3132bfe69d159b32b2315'
  },
  nesoniaa: {
    clientId: process.env.SENDPULSE_NESONIAA_CLIENT_ID || 'sp_id_79ddb76b585da0315c846c0a9093dbea',
    clientSecret: process.env.SENDPULSE_NESONIAA_CLIENT_SECRET || 'sp_sk_5fec2d8ef1b42139d5e16fa47d886c3f'
  },
  default: {
    clientId: process.env.SENDPULSE_CLIENT_ID || 'sp_id_dcd767242d4f919193dba2016a06b6f6',
    clientSecret: process.env.SENDPULSE_CLIENT_SECRET || 'sp_sk_243da6c412d3132bfe69d159b32b2315'
  }
};

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

const tokenCache: Record<string, TokenCache> = {};

export async function getSendPulseAccessToken(projectSlug: string = 'sergiy'): Promise<string> {
  const creds = SENDPULSE_CREDENTIALS[projectSlug] || SENDPULSE_CREDENTIALS['default'];
  const now = Date.now();

  const cached = tokenCache[projectSlug];
  if (cached && cached.expiresAt > now + 60000) {
    return cached.accessToken;
  }

  const res = await fetch('https://api.sendpulse.com/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: creds.clientId,
      client_secret: creds.clientSecret
    })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(`SendPulse Auth Failed (${res.status}): ${errData.message || errData.error_description || 'Unknown error'}`);
  }

  const data = await res.json();
  const token = data.access_token;
  const expiresInMs = (data.expires_in || 3600) * 1000;

  tokenCache[projectSlug] = {
    accessToken: token,
    expiresAt: now + expiresInMs
  };

  return token;
}

export interface SendPulseBot {
  id: string;
  name: string;
  username: string;
  channel: 'TELEGRAM' | 'INSTAGRAM' | 'WHATSAPP';
  status: number;
  totalSubscribers: number;
  unreadChats: number;
  createdAt: string;
  photoUrl?: string;
}

export async function getProjectSendPulseBots(projectSlug: string = 'sergiy'): Promise<SendPulseBot[]> {
  try {
    const token = await getSendPulseAccessToken(projectSlug);
    const bots: SendPulseBot[] = [];

    // 1. Fetch Telegram Bots
    try {
      const tgRes = await fetch('https://api.sendpulse.com/telegram/bots', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (tgRes.ok) {
        const tgData = await tgRes.json();
        if (Array.isArray(tgData.data)) {
          tgData.data.forEach((b: any) => {
            bots.push({
              id: b.id,
              name: b.channel_data?.full_name || b.channel_data?.name || b.name || 'Telegram Bot',
              username: b.channel_data?.username || '',
              channel: 'TELEGRAM',
              status: b.status,
              totalSubscribers: b.inbox?.total || 0,
              unreadChats: b.inbox?.unread || 0,
              createdAt: b.created_at,
              photoUrl: b.channel_data?.photo
            });
          });
        }
      }
    } catch (tgErr) {
      console.error('[SendPulse] Failed to fetch Telegram bots:', tgErr);
    }

    // 2. Fetch Instagram Bots
    try {
      const igRes = await fetch('https://api.sendpulse.com/instagram/bots', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (igRes.ok) {
        const igData = await igRes.json();
        if (Array.isArray(igData.data)) {
          igData.data.forEach((b: any) => {
            bots.push({
              id: b.id,
              name: b.channel_data?.ig_user?.name || b.name || 'Instagram Bot',
              username: b.channel_data?.ig_user?.username || '',
              channel: 'INSTAGRAM',
              status: b.status,
              totalSubscribers: b.channel_data?.ig_user?.followers_count || b.inbox?.total || 0,
              unreadChats: b.inbox?.unread || 0,
              createdAt: b.created_at,
              photoUrl: b.channel_data?.ig_user?.profile_picture_url
            });
          });
        }
      }
    } catch (igErr) {
      console.error('[SendPulse] Failed to fetch Instagram bots:', igErr);
    }

    return bots;
  } catch (err: any) {
    console.error('[SendPulse] Service error fetching bots:', err);
    return [];
  }
}

export interface SendPulseDeepLinkParams {
  botUsername: string;
  flowId?: string | null;
  bwCid?: string | null;
  phone?: string | null;
  email?: string | null;
  name?: string | null;
  telegramId?: string | number | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
}

/**
 * Generate a SendPulse tg.pulse.is smart redirection link
 * Encodes all lead parameters (bw_cid, phone, email, UTM) directly into SendPulse contact variables.
 */
export function generateSendPulseDeepLink(params: SendPulseDeepLinkParams): string {
  const cleanBot = (params.botUsername || '').replace('@', '').trim();
  const url = new URL(`https://tg.pulse.is/${cleanBot}`);

  if (params.flowId) url.searchParams.set('start', params.flowId);
  if (params.bwCid) url.searchParams.set('bw_cid', params.bwCid);
  if (params.phone) url.searchParams.set('phone', params.phone);
  if (params.email) url.searchParams.set('email', params.email);
  if (params.name) url.searchParams.set('name', params.name);
  if (params.telegramId) url.searchParams.set('telegram_id', String(params.telegramId));
  if (params.utmSource) url.searchParams.set('utm_source', params.utmSource);
  if (params.utmMedium) url.searchParams.set('utm_medium', params.utmMedium);
  if (params.utmCampaign) url.searchParams.set('utm_campaign', params.utmCampaign);

  return url.toString();
}
