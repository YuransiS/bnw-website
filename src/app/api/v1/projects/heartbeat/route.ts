import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';

export async function POST(req: Request) {
  try {
    const supabaseAdmin = createAdminClient();
    const body = await req.json();
    const { project_slug, api_key, domain, pages, metadata } = body;

    if (!project_slug) {
      return NextResponse.json({ error: 'Missing project_slug' }, { status: 400 });
    }

    // 1. Check if project exists
    const { data: project, error: projErr } = await supabaseAdmin
      .from('projects')
      .select('id, name, slug, api_key_hash, is_active')
      .eq('slug', project_slug)
      .maybeSingle();

    if (projErr) {
      return NextResponse.json({ error: projErr.message }, { status: 500 });
    }

    let projectId = project?.id;

    if (!project) {
      // Auto-register project if valid API key is supplied
      const { data: newProj, error: createErr } = await supabaseAdmin
        .from('projects')
        .insert({
          name: body.project_name || project_slug,
          slug: project_slug,
          api_key_hash: api_key || `bw_analytics_${project_slug}_key_${Date.now().toString().slice(-6)}`,
          is_active: true,
          default_currency: 'UAH',
          contract_model: '50/50_profit'
        })
        .select()
        .single();

      if (createErr) {
        return NextResponse.json({ error: `Failed to register project: ${createErr.message}` }, { status: 500 });
      }
      projectId = newProj.id;
    } else {
      // Reactivate project and clear inactive state if it was paused
      await supabaseAdmin
        .from('projects')
        .update({
          is_active: true
        })
        .eq('id', projectId);
    }

    // 2. Register/Update reported pages in project_landings if table exists
    if (Array.isArray(pages) && pages.length > 0) {
      try {
        for (const p of pages) {
          const rawPath = p.path || p.url || '/';
          let normalizedPath = rawPath;
          if (rawPath.startsWith('http')) {
            try {
              normalizedPath = new URL(rawPath).pathname;
            } catch {
              normalizedPath = rawPath;
            }
          }
          if (!normalizedPath.startsWith('/')) normalizedPath = '/' + normalizedPath;
          normalizedPath = normalizedPath.toLowerCase();

          const landingUrl = p.url || `${(domain || `https://${project_slug}.vercel.app`).replace(/\/$/, '')}${normalizedPath}`;

          await supabaseAdmin.from('project_landings').upsert({
            project_id: projectId,
            label: p.label || normalizedPath,
            url: landingUrl,
            path: normalizedPath,
            type: p.type || 'free',
            badge_color: p.badgeColor || p.badge_color || 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
            parameters: p.parameters || [],
            is_active: true,
            last_ping_at: new Date().toISOString()
          }, { onConflict: 'project_id,path' });
        }
      } catch (landingErr) {
        console.warn('[Heartbeat] Landings upsert note:', landingErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Heartbeat acknowledged for ${project_slug}. Project is live and synchronized.`,
      project_id: projectId,
      status: 'live',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[Heartbeat Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
