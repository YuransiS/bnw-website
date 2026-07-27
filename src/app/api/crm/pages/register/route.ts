import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';

export async function POST(req: Request) {
  try {
    const supabaseAdmin = createAdminClient();
    const body = await req.json();
    const { project_slug, api_key, pages } = body;

    // 1. Basic validation
    if (!project_slug || !api_key || !Array.isArray(pages)) {
      return NextResponse.json(
        { error: 'Missing required parameters: project_slug, api_key, and pages (array) are mandatory.' },
        { status: 400 }
      );
    }

    // 2. Authenticate project
    const { data: project, error: authError } = await supabaseAdmin
      .from('projects')
      .select('id, name')
      .eq('slug', project_slug)
      .eq('api_key_hash', api_key)
      .maybeSingle();

    if (authError || !project) {
      return NextResponse.json(
        { error: 'Authentication failed. Invalid project_slug or api_key.' },
        { status: 401 }
      );
    }

    if (pages.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pages provided. No sync actions performed.'
      });
    }

    // 3. Prepare upsert records
    const upsertRows = pages.map((p: any) => {
      let pagePath = String(p.path || '').trim();
      // Ensure leading slash
      if (pagePath && !pagePath.startsWith('/')) {
        pagePath = '/' + pagePath;
      }
      return {
        project_id: project.id,
        path: pagePath,
        title: p.title ? String(p.title).trim() : null,
        source: 'direct_register',
        last_seen_at: new Date().toISOString()
      };
    }).filter(r => r.path);

    if (upsertRows.length === 0) {
      return NextResponse.json(
        { error: 'No valid page paths found inside pages array.' },
        { status: 400 }
      );
    }

    // 4. Perform upsert operation
    const { error: upsertError } = await supabaseAdmin
      .from('discovered_pages')
      .upsert(upsertRows, { onConflict: 'project_id,path' });

    if (upsertError) {
      throw new Error(`Failed to upsert discovered pages: ${upsertError.message}`);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully synchronized ${upsertRows.length} pages for project '${project.name}'.`
    });

  } catch (err: any) {
    console.error('CRITICAL: Error in crm/pages/register route:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
