import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';

export async function GET(req: Request) {
  return NextResponse.json({
    status: 'active',
    service: 'SendPulse Chatbot Webhook Gateway',
    timestamp: new Date().toISOString()
  });
}

export async function POST(req: Request) {
  try {
    const supabaseAdmin = createAdminClient();
    const url = new URL(req.url);

    // 1. Extract query params
    const projectSlug = url.searchParams.get('project') || url.searchParams.get('project_slug') || 'sergiy';
    const queryStep = url.searchParams.get('step') || url.searchParams.get('event') || null;

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Body may be form-urlencoded or empty
    }

    const payload = typeof body === 'object' && body !== null ? body : {};

    // 2. Extract step / milestone
    const step = (queryStep || payload.step || payload.event || payload.action || payload.trigger || 'bot_activity').toString().trim().toLowerCase();

    // 3. Extract identifier variables
    const rawVariables = payload.variables || payload.contact?.variables || {};
    const rawBwCid = payload.bw_cid || payload.cid || rawVariables.bw_cid || rawVariables.cid || rawVariables.start_param || payload.start_param || null;
    const bwCid = rawBwCid ? String(rawBwCid).trim() : null;

    // Telegram ID
    const rawTgId = payload.telegram_id || payload.contact?.telegram_id || payload.chat_id || payload.contact?.channel_data?.id || (payload.channel === 'TELEGRAM' ? payload.contact?.id : null);
    const telegramId = rawTgId && !isNaN(Number(rawTgId)) ? Number(rawTgId) : null;

    // Contact info
    const rawPhone = payload.phone || payload.contact?.phone || payload.contact?.phone_number || rawVariables.phone || null;
    let phone: string | null = null;
    if (rawPhone) {
      const cleanDigits = String(rawPhone).replace(/[^0-9]/g, '');
      if (cleanDigits.length >= 7) phone = cleanDigits;
    }

    const email = payload.email || payload.contact?.email || rawVariables.email || null;
    const botId = url.searchParams.get('bot') || url.searchParams.get('bot_username') || url.searchParams.get('bot_id') || payload.bot_id || payload.contact?.bot_id || null;

    // 4. Resolve Project ID
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('slug', projectSlug)
      .maybeSingle();

    if (!project) {
      return NextResponse.json({ error: `Project '${projectSlug}' not found` }, { status: 404 });
    }

    const projectId = project.id;

    // 5. Match customer in unified_customers
    let customerId: string | null = null;
    let orderId: string | null = null;

    // Priority 1: Match by bw_cid
    if (bwCid) {
      // Check if bw_cid is in unified_orders
      const { data: matchedOrder } = await supabaseAdmin
        .from('unified_orders')
        .select('id, customer_id')
        .eq('project_id', projectId)
        .or(`bw_cid.eq.${bwCid},order_id.eq.${bwCid}`)
        .limit(1)
        .maybeSingle();

      if (matchedOrder) {
        orderId = matchedOrder.id;
        customerId = matchedOrder.customer_id;
      }
    }

    // Priority 2: Match by telegram_id
    if (!customerId && telegramId) {
      const { data: matchedCustomer } = await supabaseAdmin
        .from('unified_customers')
        .select('id')
        .eq('project_id', projectId)
        .eq('telegram_id', telegramId)
        .limit(1)
        .maybeSingle();

      if (matchedCustomer) {
        customerId = matchedCustomer.id;
      }
    }

    // Priority 3: Match by Phone or Email
    if (!customerId && (phone || email)) {
      const orConds: string[] = [];
      if (phone) orConds.push(`phone.ilike.%${phone}%`);
      if (email && email.includes('@')) orConds.push(`email.eq.${email.toLowerCase().trim()}`);

      if (orConds.length > 0) {
        const { data: matchedCustomer } = await supabaseAdmin
          .from('unified_customers')
          .select('id')
          .eq('project_id', projectId)
          .or(orConds.join(','))
          .limit(1)
          .maybeSingle();

        if (matchedCustomer) {
          customerId = matchedCustomer.id;
        }
      }
    }

    // 6. If customer is found and telegram_id was missing on profile, stitch it
    if (customerId && telegramId) {
      await supabaseAdmin
        .from('unified_customers')
        .update({
          telegram_id: telegramId,
          updated_at: new Date().toISOString()
        })
        .eq('id', customerId)
        .is('telegram_id', null);
    }

    // 7. Insert bot funnel event
    const { data: eventRecord, error: insertError } = await supabaseAdmin
      .from('bot_funnel_events')
      .insert({
        project_id: projectId,
        customer_id: customerId,
        order_id: orderId,
        bw_cid: bwCid,
        telegram_id: telegramId,
        bot_id: botId,
        step,
        payload: {
          ...payload,
          client_ip: req.headers.get('x-forwarded-for') || null,
          user_agent: req.headers.get('user-agent') || null
        },
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('[SendPulse Webhook Insert Error]:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      event_id: eventRecord.id,
      step,
      bw_cid: bwCid,
      telegram_id: telegramId,
      customer_id: customerId,
      matched: Boolean(customerId)
    });

  } catch (error: any) {
    console.error('[SendPulse Webhook Error]:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
