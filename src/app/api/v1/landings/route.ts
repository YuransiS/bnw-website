import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';

export async function GET(req: Request) {
  try {
    const supabaseAdmin = createAdminClient();
    const { searchParams } = new URL(req.url);
    const projectSlug = searchParams.get('project_slug') || searchParams.get('project');

    let query = supabaseAdmin
      .from('project_landings')
      .select('*, projects!inner(slug, name)')
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (projectSlug) {
      query = query.eq('projects.slug', projectSlug);
    }

    const { data: landings, error } = await query;

    if (error) {
      // If table does not exist yet or error occurs, return empty list gracefully
      console.warn('[Landings GET Error]:', error.message);
      return NextResponse.json({ success: false, landings: [] });
    }

    return NextResponse.json({
      success: true,
      count: landings?.length || 0,
      landings: landings || []
    });
  } catch (error: any) {
    console.error('[Landings GET Server Error]:', error);
    return NextResponse.json({ success: false, error: error.message, landings: [] }, { status: 500 });
  }
}
