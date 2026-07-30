import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';

export async function POST(req: Request) {
  try {
    const supabaseAdmin = createAdminClient();
    const body = await req.json();
    const { project_slug, api_key, pages, metadata } = body;

    // 1. Basic validation
    if (!project_slug || !api_key || !Array.isArray(pages) || pages.length === 0) {
      return NextResponse.json(
        { error: 'Missing required parameters: project_slug, api_key, and pages array are mandatory.' },
        { status: 400 }
      );
    }

    // 2. Authenticate project
    const { data: project, error: authError } = await supabaseAdmin
      .from('projects')
      .select('id, name, slug')
      .eq('slug', project_slug)
      .eq('api_key_hash', api_key)
      .maybeSingle();

    if (authError || !project) {
      return NextResponse.json(
        { error: 'Authentication failed. Invalid project_slug or api_key.' },
        { status: 401 }
      );
    }

    const projectId = project.id;
    const registeredResults = [];

    // 3. Process each page definition
    for (const pageObj of pages) {
      const rawPath = pageObj.path || pageObj.url || '';
      if (!rawPath) continue;

      // Extract path slug from URL if full URL is passed
      let normalizedPath = rawPath;
      try {
        if (rawPath.startsWith('http://') || rawPath.startsWith('https://')) {
          const parsed = new URL(rawPath);
          normalizedPath = parsed.pathname;
        }
      } catch {
        normalizedPath = rawPath;
      }

      if (!normalizedPath.startsWith('/')) {
        normalizedPath = '/' + normalizedPath;
      }
      normalizedPath = normalizedPath.toLowerCase();

      const label = pageObj.label || normalizedPath;
      const url = pageObj.url || `https://${project_slug}.vercel.app${normalizedPath}`;
      const type = pageObj.type || 'free';
      const badgeColor = pageObj.badge_color || pageObj.badgeColor || 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';

      // Format input parameters
      const inputParams: Array<{ key: string; description?: string; observed_count?: number }> = Array.isArray(pageObj.parameters)
        ? pageObj.parameters.map((p: any) => typeof p === 'string' ? { key: p } : p)
        : [];

      // Fetch existing page to merge parameters
      const { data: existingPage } = await supabaseAdmin
        .from('project_landings')
        .select('*')
        .eq('project_id', projectId)
        .eq('path', normalizedPath)
        .maybeSingle();

      let mergedParams = existingPage?.parameters || [];
      if (!Array.isArray(mergedParams)) mergedParams = [];

      for (const item of inputParams) {
        if (!item.key) continue;
        const keyLower = String(item.key).trim().toLowerCase();
        const existingIdx = mergedParams.findIndex((p: any) => p.key === keyLower);
        if (existingIdx >= 0) {
          mergedParams[existingIdx] = {
            ...mergedParams[existingIdx],
            description: item.description || mergedParams[existingIdx].description || `Parameter ?${keyLower}`,
            observed_count: (mergedParams[existingIdx].observed_count || 1) + 1,
            last_seen_at: new Date().toISOString()
          };
        } else {
          mergedParams.push({
            key: keyLower,
            description: item.description || `Parameter ?${keyLower}`,
            observed_count: 1,
            last_seen_at: new Date().toISOString()
          });
        }
      }

      // Upsert page landing record
      const { data: upserted, error: upsertError } = await supabaseAdmin
        .from('project_landings')
        .upsert(
          {
            project_id: projectId,
            label: existingPage?.label || label,
            url,
            path: normalizedPath,
            type: existingPage?.type || type,
            badge_color: existingPage?.badge_color || badgeColor,
            parameters: mergedParams,
            is_active: true,
            last_ping_at: new Date().toISOString(),
            metadata: { ...(existingPage?.metadata || {}), ...(metadata || {}), ...(pageObj.metadata || {}) },
            updated_at: new Date().toISOString()
          },
          { onConflict: 'project_id,path' }
        )
        .select('*')
        .single();

      if (upsertError) {
        console.error(`[Landings API] Failed to upsert ${normalizedPath}:`, upsertError);
      } else {
        registeredResults.push(upserted);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully registered ${registeredResults.length} page(s).`,
      project_slug,
      pages: registeredResults
    });

  } catch (error: any) {
    console.error('[Landings API Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
