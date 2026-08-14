import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import { DEFAULT_PROJECT_LANDINGS } from '@/lib/projectLandings';

export const maxDuration = 120;
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get('secret');
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    const customHeader = req.headers.get('x-cron-secret');

    const expectedSecret = process.env.CRON_SECRET;
    const isAuthorized =
      !expectedSecret ||
      secret === expectedSecret ||
      customHeader === expectedSecret ||
      authHeader === `Bearer ${expectedSecret}` ||
      authHeader === expectedSecret ||
      process.env.NODE_ENV === 'development';

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = createAdminClient();
    const { data: projects, error: projErr } = await supabaseAdmin
      .from('projects')
      .select('id, name, slug, is_active');

    if (projErr) throw projErr;

    const results: Array<{
      slug: string;
      name: string;
      status: 'live' | 'unresponsive' | 'error';
      latencyMs: number;
      discoveredPages: number;
      message: string;
    }> = [];

    for (const proj of projects || []) {
      const slug = proj.slug;
      const defaultLandings = DEFAULT_PROJECT_LANDINGS[slug] || [];
      const rootLandingUrl = defaultLandings[0]?.url || `https://${slug.replace(/_/g, '-')}.vercel.app`;
      const domain = rootLandingUrl.replace(/\/$/, '');

      const start = performance.now();
      let isLive = false;
      let discoveredPages = 0;
      let message = '';

      // 1. Try Discovery API
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        let res = await fetch(`${domain}/api/v1/discovery`, {
          signal: controller.signal,
          headers: { 'User-Agent': 'BnW-CRM-Discovery/1.0' }
        });

        if (!res.ok && res.status === 404) {
          // Fallback to /api/discovery
          res = await fetch(`${domain}/api/discovery`, {
            signal: controller.signal,
            headers: { 'User-Agent': 'BnW-CRM-Discovery/1.0' }
          });
        }

        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          isLive = true;
          if (Array.isArray(data.pages)) {
            discoveredPages = data.pages.length;
          }
          message = `Discovery OK (HTTP ${res.status})`;
        } else {
          // Check if root website responds at all
          const pingRes = await fetch(domain, { method: 'HEAD', signal: AbortSignal.timeout(4000) });
          if (pingRes.ok || pingRes.status < 500) {
            isLive = true;
            message = `Domain alive (HTTP ${pingRes.status}, no discovery endpoint yet)`;
          } else {
            message = `HTTP ${pingRes.status}`;
          }
        }
      } catch (err: any) {
        // Fallback root ping
        try {
          const pingRes = await fetch(domain, { method: 'HEAD', signal: AbortSignal.timeout(4000) });
          if (pingRes.ok || pingRes.status < 500) {
            isLive = true;
            message = `Domain alive (HTTP ${pingRes.status})`;
          } else {
            message = `Ping failed: ${err.name === 'AbortError' ? 'Timeout' : err.message}`;
          }
        } catch (subErr: any) {
          message = `Failed: ${err.name === 'AbortError' ? 'Timeout' : err.message}`;
        }
      }

      const latencyMs = Math.round(performance.now() - start);

      results.push({
        slug,
        name: proj.name,
        status: isLive ? 'live' : 'unresponsive',
        latencyMs,
        discoveredPages,
        message
      });
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      totalProjects: results.length,
      liveCount: results.filter(r => r.status === 'live').length,
      unresponsiveCount: results.filter(r => r.status === 'unresponsive').length,
      results
    });
  } catch (error: any) {
    console.error('[Ping Projects Cron Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
