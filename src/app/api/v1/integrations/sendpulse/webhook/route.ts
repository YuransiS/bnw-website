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
    const rawFunnelId = url.searchParams.get('funnel_id') || url.searchParams.get('funnel') || null;
    let funnelId: string | null = rawFunnelId ? String(rawFunnelId).trim() : null;

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Body may be form-urlencoded or empty
    }

    const payload = typeof body === 'object' && body !== null ? body : {};
    const rootItem = payload['0'] || payload[0] || payload;
    const contact = rootItem.contact || payload.contact || {};
    const rawVariables = rootItem.variables || contact.variables || payload.variables || {};

    if (!funnelId && (payload.funnel_id || payload.funnel || rootItem.funnel_id || rawVariables.funnel_id)) {
      funnelId = String(payload.funnel_id || payload.funnel || rootItem.funnel_id || rawVariables.funnel_id).trim();
    }

    // 2. Extract step / milestone
    const step = (queryStep || payload.step || rootItem.step || payload.event || rootItem.event || payload.action || payload.trigger || 'bot_activity').toString().trim().toLowerCase();

    // 3. Extract identifier variables
    const rawBwCid = rootItem.bw_cid || contact.bw_cid || payload.bw_cid || payload.cid || rawVariables.bw_cid || rawVariables.cid || rawVariables.start_param || payload.start_param || null;
    let bwCid = rawBwCid ? String(rawBwCid).trim() : null;

    // Telegram ID
    const rawTgId = contact.telegram_id || contact.channel_data?.id || rootItem.telegram_id || rootItem.chat_id || payload.telegram_id || payload.contact?.telegram_id || payload.chat_id || payload.contact?.channel_data?.id || (payload.channel === 'TELEGRAM' ? payload.contact?.id : null);
    const telegramId = rawTgId && !isNaN(Number(rawTgId)) ? Number(rawTgId) : null;

    // Contact info
    const rawPhone = contact.phone || contact.phone_number || rawVariables.phone || rootItem.phone || payload.phone || payload.contact?.phone || payload.contact?.phone_number || null;
    let phone: string | null = null;
    if (rawPhone) {
      const cleanDigits = String(rawPhone).replace(/[^0-9]/g, '');
      if (cleanDigits.length >= 7) phone = cleanDigits;
    }

    const email = contact.email || rawVariables.email || rootItem.email || payload.email || payload.contact?.email || null;
    const telegramUsername = contact.username || contact.channel_data?.username || rootItem.username || rawVariables.username || payload.username || null;
    const botId = url.searchParams.get('bot') || url.searchParams.get('bot_username') || url.searchParams.get('bot_id') || payload.bot_id || rootItem.bot?.id || payload.contact?.bot_id || null;

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
        .select('id, customer_id, funnel_id')
        .eq('project_id', projectId)
        .or(`bw_cid.eq.${bwCid},order_id.eq.${bwCid}`)
        .limit(1)
        .maybeSingle();

      if (matchedOrder) {
        orderId = matchedOrder.id;
        customerId = matchedOrder.customer_id;
        if (!funnelId && matchedOrder.funnel_id) {
          funnelId = matchedOrder.funnel_id;
        }
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

    // Priority 4: Match by telegram username
    if (!customerId && telegramUsername) {
      const cleanTg = telegramUsername.replace(/^@/, '').toLowerCase().trim();
      const { data: matchedCustomer } = await supabaseAdmin
        .from('unified_customers')
        .select('id')
        .eq('project_id', projectId)
        .or(`telegram.ilike.@${cleanTg},telegram.ilike.${cleanTg}`)
        .limit(1)
        .maybeSingle();

      if (matchedCustomer) {
        customerId = matchedCustomer.id;
      }
    }

    // Priority 5: If still no customer found in CRM, auto-create customer & generate bw_cid
    if (!customerId) {
      const fallbackName = (contact?.name || contact?.first_name || (telegramUsername ? `@${telegramUsername.replace(/^@/, '')}` : 'Підписник Telegram')).trim();
      const { data: createdCust } = await supabaseAdmin
        .from('unified_customers')
        .insert({
          project_id: projectId,
          name: fallbackName,
          telegram: telegramUsername ? `@${telegramUsername.replace(/^@/, '')}` : null,
          telegram_id: telegramId ? Number(telegramId) : null,
          phone: phone || null,
          email: email || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (createdCust) {
        customerId = createdCust.id;
      }
    }

    if (customerId && !bwCid) {
      bwCid = `bw_${customerId.replace(/-/g, '').substring(0, 16)}`;
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

    // 6.1 Asynchronously push bw_cid back to SendPulse contact variable if contact ID is present
    if (contact?.id && bwCid && botId) {
      (async () => {
        try {
          const { getSendPulseAccessToken } = await import('@/lib/sendpulse/service');
          const token = await getSendPulseAccessToken(projectSlug || 'sergiy');
          await fetch('https://api.sendpulse.com/telegram/contacts/setVariable', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              bot_id: botId,
              contact_id: contact.id,
              variable_name: 'bw_cid',
              variable_value: bwCid
            })
          });
        } catch {}
      })().catch(() => {});
    }

    // 7. Insert bot funnel event
    const { data: eventRecord, error: insertError } = await supabaseAdmin
      .from('bot_funnel_events')
      .insert({
        project_id: projectId,
        funnel_id: funnelId,
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
      funnel_id: funnelId,
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
