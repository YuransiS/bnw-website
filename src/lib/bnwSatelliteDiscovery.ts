import { NextResponse } from 'next/server';

export interface DiscoveryPageItem {
  label: string;
  path: string;
  url?: string;
  type?: 'free' | 'paid' | 'quiz' | 'thank_you' | 'other';
  badgeColor?: string;
  parameters?: Array<{ key: string; description?: string }>;
}

export interface SatelliteDiscoveryConfig {
  projectSlug: string;
  projectName: string;
  domain: string;
  version?: string;
  apiKey?: string;
  pages: DiscoveryPageItem[];
}

/**
 * Standard Discovery HTTP Handler for satellite websites (Next.js App Router)
 * Place inside `src/app/api/v1/discovery/route.ts` on any satellite website:
 *
 * export const GET = createDiscoveryHandler({
 *   projectSlug: 'anastasia_sych',
 *   projectName: 'Anastasia Sych',
 *   domain: 'https://anastasia-sych.vercel.app',
 *   pages: [ ... ]
 * });
 */
export function createDiscoveryHandler(config: SatelliteDiscoveryConfig) {
  return async function GET(req: Request) {
    try {
      const formattedPages = config.pages.map((p) => ({
        label: p.label,
        path: p.path.startsWith('/') ? p.path : '/' + p.path,
        url: p.url || `${config.domain.replace(/\/$/, '')}${p.path.startsWith('/') ? p.path : '/' + p.path}`,
        type: p.type || 'free',
        badgeColor: p.badgeColor || 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
        parameters: p.parameters || []
      }));

      return NextResponse.json({
        status: 'ok',
        project_slug: config.projectSlug,
        project_name: config.projectName,
        domain: config.domain,
        version: config.version || '1.0.0',
        ping_timestamp: new Date().toISOString(),
        pages_count: formattedPages.length,
        pages: formattedPages
      });
    } catch (error: any) {
      return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
    }
  };
}

/**
 * Sends a self-announcement / heartbeat from satellite website to central CRM
 */
export async function sendSatelliteHeartbeat(
  config: SatelliteDiscoveryConfig,
  crmUrl = 'https://bnw-prod.vercel.app'
) {
  try {
    const res = await fetch(`${crmUrl.replace(/\/$/, '')}/api/v1/projects/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_slug: config.projectSlug,
        project_name: config.projectName,
        api_key: config.apiKey,
        domain: config.domain,
        pages: config.pages
      })
    });
    return await res.json();
  } catch (err: any) {
    return { error: `Failed to send heartbeat to CRM: ${err.message}` };
  }
}
