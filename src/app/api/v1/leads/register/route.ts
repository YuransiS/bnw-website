import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import { statusMapper } from '@/lib/statusMapper';

export async function POST(req: Request) {
  try {
    const supabaseAdmin = createAdminClient();
    const body = await req.json();
    const { project_slug, api_key, lead, marketing, metadata } = body;

    const isValidUuid = (uuid: string) => {
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
    };

    // 1. Валидация базовых полей запроса
    if (!project_slug || !api_key || !lead) {
      return NextResponse.json(
        { error: 'Missing required parameters: project_slug, api_key, and lead are mandatory.' },
        { status: 400 }
      );
    }

    // 2. Аутентификация проекта в реестре
    const { data: project, error: authError } = await supabaseAdmin
      .from('projects')
      .select('id, name, default_currency')
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

    const customCreatedAt = lead?.created_at || metadata?.created_at || null;
    const createdAtIso = customCreatedAt ? new Date(customCreatedAt).toISOString() : new Date().toISOString();

    // Intercept raw clicks ('Клик' or 'КликФормы') and insert directly into traffic_clicks
    const leadStatus = lead.status;
    if (leadStatus === 'Клик' || leadStatus === 'КликФормы') {
      const m = marketing || {};
      const utm_source = m.utm_source || null;
      const utm_medium = m.utm_medium || null;
      const utm_campaign = m.utm_campaign || null;
      const utm_content = m.utm_content || null;
      const utm_term = m.utm_term || null;
      const page_path = m.page_path || null;
      const page_url = m.page_url || null;
      const rawVisitorUuid = m.visitor_uuid || m.visitor_id || m.visitorId || metadata?.visitor_uuid || metadata?.visitor_id || metadata?.visitorId || lead?.visitor_uuid || lead?.visitor_id || lead?.visitorId || null;
      const visitor_uuid = rawVisitorUuid && isValidUuid(rawVisitorUuid) ? rawVisitorUuid : null;

      const parsedQueryParams = parseQueryParams(page_url || page_path);
      const offer_id = m.offer_id || m.o || parsedQueryParams.offer_id || null;
      const promo_id = m.promo_id || m.p || parsedQueryParams.promo_id || null;

      let clickId = null;
      try {
        const { data: clickData, error: clickError } = await supabaseAdmin
          .from('traffic_clicks')
          .insert({
            project_id: projectId,
            visitor_uuid,
            status: leadStatus,
            utm_source,
            utm_medium,
            utm_campaign,
            utm_content,
            utm_term,
            page_path,
            page_url,
            offer_id,
            promo_id,
            query_params: parsedQueryParams.query_params,
            metadata: {
              ...(metadata || {}),
              offer_id,
              promo_id,
              query_params: parsedQueryParams.query_params
            },
            created_at: createdAtIso
          })
          .select('id')
          .maybeSingle();

        if (clickError) {
          console.warn(`[Click Register Warning] Retrying without new columns:`, clickError.message);
          const { data: fbData } = await supabaseAdmin
            .from('traffic_clicks')
            .insert({
              project_id: projectId,
              visitor_uuid,
              status: leadStatus,
              utm_source,
              utm_medium,
              utm_campaign,
              utm_content,
              utm_term,
              page_path,
              page_url,
              metadata: {
                ...(metadata || {}),
                offer_id,
                promo_id,
                query_params: parsedQueryParams.query_params
              },
              created_at: createdAtIso
            })
            .select('id')
            .maybeSingle();
          clickId = fbData?.id;
        } else {
          clickId = clickData?.id;
        }
      } catch (err: any) {
        console.error(`[Click Register Error] Non-fatal click error:`, err?.message);
      }

      return NextResponse.json({
        success: true,
        message: 'Click registered successfully.',
        customer_id: null,
        order_id: clickId || 'click-logged'
      });
    }

    // 3. Выделение и нормализация контактных данных лида (E.164 & Clean CRM Standard)
    const name = lead.name || null;
    let rawPhone = lead.phone ? String(lead.phone).trim().replace(/\s+/g, '') : null;
    let phone: string | null = null;

    if (rawPhone) {
      const cleanDigits = rawPhone.replace(/[^0-9]/g, '');
      if (rawPhone.startsWith('+')) {
        phone = rawPhone;
      } else if (cleanDigits.length === 12 && cleanDigits.startsWith('380')) {
        phone = `+${cleanDigits}`;
      } else if (cleanDigits.length === 10 && cleanDigits.startsWith('0')) {
        phone = `+38${cleanDigits}`;
      } else if (cleanDigits.length === 9) {
        phone = `+380${cleanDigits}`;
      } else if (cleanDigits.length >= 10 && cleanDigits.length <= 14) {
        phone = `+${cleanDigits}`;
      } else if (cleanDigits.length >= 7) {
        phone = cleanDigits;
      }
    }

    let email = lead.email ? String(lead.email).trim().toLowerCase() : null;
    email = email && email.includes('@') && email.length >= 5 ? email : null;

    let telegram = lead.telegram ? String(lead.telegram).trim() : null;
    if (telegram) {
      if (telegram.startsWith('@')) {
        telegram = telegram.substring(1).trim();
      }
      if (telegram.length < 2 || ['none', 'null', 'undefined', 'test', 'user', 'tg'].includes(telegram.toLowerCase())) {
        telegram = null;
      }
    }

    if (!phone && !email && !telegram) {
      return NextResponse.json(
        { error: 'At least one contact identifier (phone, email, or telegram) must be provided.' },
        { status: 400 }
      );
    }

    // 4. Поиск существующего профиля клиента строго внутри этого проекта
    let customerId: string | null = null;
    
    // Формируем условия поиска (только валидные идентификаторы)
    const orConditions: string[] = [];
    if (phone && phone.length >= 7) orConditions.push(`phone.eq.${phone}`);
    if (email && email.includes("@") && email.length >= 5) orConditions.push(`email.eq.${email}`);
    const cleanTg = telegram ? telegram.replace("@", "").trim() : "";
    const isValidTg = cleanTg.length >= 3 && /^[a-zA-Z0-9_]+$/.test(cleanTg) && !cleanTg.toLowerCase().includes("user") && !cleanTg.toLowerCase().includes("none") && !cleanTg.toLowerCase().includes("test");
    if (isValidTg) orConditions.push(`telegram.ilike.${cleanTg}`);

    if (orConditions.length > 0) {
      const { data: existingCustomer, error: searchError } = await supabaseAdmin
        .from('unified_customers')
        .select('id')
        .eq('project_id', projectId)
        .or(orConditions.join(','))
        .limit(1)
        .maybeSingle();

      if (searchError) {
        console.error('Error searching customer:', searchError);
      } else if (existingCustomer) {
        customerId = existingCustomer.id;
      }
    }

    // 5. Создание или обновление профиля клиента
    if (!customerId) {
      const { data: newCustomer, error: createError } = await supabaseAdmin
        .from('unified_customers')
        .insert({
          project_id: projectId,
          name,
          phone,
          email,
          telegram,
          created_at: createdAtIso,
          updated_at: createdAtIso
        })
        .select('id')
        .single();

      if (createError) {
        throw new Error(`Failed to create unified customer: ${createError.message}`);
      }
      customerId = newCustomer.id;
    } else {
      // Обновляем профиль при поступлении более свежих данных
      const { error: updateError } = await supabaseAdmin
        .from('unified_customers')
        .update({
          name: name || undefined,
          phone: phone || undefined,
          email: email || undefined,
          telegram: telegram || undefined,
          updated_at: new Date().toISOString()
        })
        .eq('id', customerId);

      if (updateError) {
        console.error('Warning: Failed to update customer profile:', updateError);
      }
    }

    // 6. Подготовка маркетинговых полей
    const m = marketing || {};
    const utm_source = m.utm_source || null;
    const utm_medium = m.utm_medium || null;
    const utm_campaign = m.utm_campaign || null;
    const utm_content = m.utm_content || null;
    const utm_term = m.utm_term || null;
    const campaign_id = m.campaign_id || null;
    const adset_id = m.adset_id || null;
    const ad_id = m.ad_id || null;
    const fbclid = m.fbclid || null;
    const gclid = m.gclid || null;
    const fbp = m.fbp || null;
    const fbc = m.fbc || null;
    const ip_address = m.ip_address || null;
    const user_agent = m.user_agent || null;
    const page_path = m.page_path || null;
    const page_url = m.page_url || null;
    const rawVisitorUuid = m.visitor_uuid || m.visitor_id || m.visitorId || metadata?.visitor_uuid || metadata?.visitor_id || metadata?.visitorId || lead?.visitor_uuid || lead?.visitor_id || lead?.visitorId || null;
    const visitor_uuid = rawVisitorUuid && isValidUuid(rawVisitorUuid) ? rawVisitorUuid : null;

    // Guarantee currency is resolved and explicitly set in metadata
    const meta = metadata || {};
    const rawCurr = lead.currency || meta.currency || meta.raw_row?.currency || meta.lead?.currency || project.default_currency || 'UAH';
    const resolvedCurrency = String(rawCurr).trim().toUpperCase();
    meta.currency = resolvedCurrency;

    // Auto-classify product_type
    const amount = Number(lead.amount || 0);
    const rawProductType = lead.product_type || meta.product_type || null;
    let resolvedProductType = rawProductType;
    if (!resolvedProductType) {
      const pagePathLower = String(page_path || "").toLowerCase();
      const isTripwire = 
        ['sofia', 'valeria'].includes(project_slug) ||
        lead.status === "Купив(-ла) Трипвайер" ||
        pagePathLower.includes("minicourse") ||
        pagePathLower.includes("tripwire") ||
        pagePathLower.includes("practicum") ||
        pagePathLower.includes("intensive") ||
        (resolvedCurrency === 'UAH' && amount > 0 && amount <= 2500) ||
        (resolvedCurrency === 'USD' && amount > 0 && amount <= 60);

      if (amount <= 0) {
        resolvedProductType = 'lead';
      } else if (isTripwire) {
        resolvedProductType = 'tripwire';
      } else {
        resolvedProductType = 'course';
      }
    }
    meta.product_type = resolvedProductType;

    // Fetch today's NBU rates and store in metadata for exact conversion
    try {
      const { getExchangeRates } = await import('@/lib/exchange-rate');
      const todayRates = await getExchangeRates();
      const currencyLower = resolvedCurrency.toLowerCase();

      meta.usd_rate = todayRates.usdRate;
      meta.eur_to_usd = todayRates.eurToUsd;

      let usdAmount = amount;
      let uahAmount = amount;

      if (currencyLower === 'uah' || currencyLower === '₴') {
        usdAmount = amount / todayRates.usdRate;
        uahAmount = amount;
      } else if (currencyLower === 'eur' || currencyLower === '€') {
        usdAmount = amount * todayRates.eurToUsd;
        uahAmount = amount * todayRates.eurRate;
      } else {
        usdAmount = amount;
        uahAmount = amount * todayRates.usdRate;
      }

      meta.usd_amount = Number(usdAmount.toFixed(2));
      meta.uah_amount = Number(uahAmount.toFixed(2));
    } catch (rateErr) {
      console.error('Failed to resolve exchange rates for registering lead:', rateErr);
    }

    // Resolve matching funnel_id based on campaign_ids and landing_slugs
    let resolvedFunnelId: string | null = null;
    try {
      const { data: projectFunnels } = await supabaseAdmin
        .from('funnels')
        .select('id, campaign_ids, landing_slugs')
        .eq('project_id', projectId);

      if (projectFunnels && projectFunnels.length > 0) {
        const leadCampaign = String(utm_campaign || "").trim().toLowerCase();
        const leadLanding = String(meta.target_sheet || meta.lead?.target_sheet || "").trim().toLowerCase();

        for (const funnel of projectFunnels) {
          const campaignMatch = Array.isArray(funnel.campaign_ids) && funnel.campaign_ids.some((id: string) => leadCampaign.includes(id.toLowerCase()));
          const landingMatch = Array.isArray(funnel.landing_slugs) && funnel.landing_slugs.some((slug: string) => leadLanding.includes(slug.toLowerCase()));
          if (campaignMatch || landingMatch) {
            resolvedFunnelId = funnel.id;
            break;
          }
        }
      }
    } catch (funnelErr) {
      console.error('Failed to map funnel for registering lead:', funnelErr);
    }

    // 7. Создание или обновление лид-события/заказа
    let orderIdToReturn = null;
    let existingOrder = null;

    if (lead.order_id) {
      const { data: ord, error: selectErr } = await supabaseAdmin
        .from('unified_orders')
        .select('id')
        .eq('project_id', projectId)
        .eq('order_id', lead.order_id)
        .limit(1)
        .maybeSingle();

      if (!selectErr && ord) {
        existingOrder = ord;
      }
    }

    const orderQueryParams = parseQueryParams(page_url || page_path);
    const resolvedOfferId = (marketing?.offer_id || marketing?.o || lead?.offer_id || lead?.o || orderQueryParams.offer_id || null);
    const resolvedPromoId = (marketing?.promo_id || marketing?.p || lead?.promo_id || lead?.p || orderQueryParams.promo_id || null);

    const validCustomerId = customerId || '';
    const cleanCustomerSuffix = validCustomerId.replace(/-/g, '').substring(0, 16);
    const bw_cid = validCustomerId ? `bw_${cleanCustomerSuffix}` : null;

    if (existingOrder) {
      // Update existing order status, amount, and metadata
      const { data: updatedOrder, error: orderError } = await supabaseAdmin
        .from('unified_orders')
        .update({
          amount: lead.amount !== undefined ? lead.amount : undefined,
          status: lead.status ? statusMapper.normalize(lead.status) : undefined,
          utm_source: utm_source || undefined,
          utm_medium: utm_medium || undefined,
          utm_campaign: utm_campaign || undefined,
          utm_content: utm_content || undefined,
          utm_term: utm_term || undefined,
          page_path: page_path || undefined,
          page_url: page_url || undefined,
          offer_id: resolvedOfferId || undefined,
          promo_id: resolvedPromoId || undefined,
          query_params: orderQueryParams.query_params,
          visitor_uuid: visitor_uuid || undefined,
          metadata: meta,
          bw_cid: bw_cid || undefined,
          funnel_id: resolvedFunnelId || undefined
        })
        .eq('id', existingOrder.id)
        .select('id')
        .single();

      if (orderError) {
        throw new Error(`Failed to update order: ${orderError.message}`);
      }
      orderIdToReturn = updatedOrder.id;
      console.log(`Successfully updated existing order ${lead.order_id} (UUID: ${orderIdToReturn})`);
    } else {
      // Insert new order
      const { data: newOrder, error: orderError } = await supabaseAdmin
        .from('unified_orders')
        .insert({
          customer_id: customerId,
          project_id: projectId,
          amount: lead.amount || 0.00,
          status: statusMapper.normalize(lead.status),
          order_id: lead.order_id || null,
          utm_source,
          utm_medium,
          utm_campaign,
          utm_content,
          utm_term,
          campaign_id,
          adset_id,
          ad_id,
          fbclid,
          gclid,
          fbp,
          fbc,
          ip_address,
          user_agent,
          page_path,
          page_url,
          offer_id: resolvedOfferId,
          promo_id: resolvedPromoId,
          query_params: orderQueryParams.query_params,
          visitor_uuid,
          metadata: meta,
          bw_cid,
          funnel_id: resolvedFunnelId,
          created_at: createdAtIso
        })
        .select('id')
        .single();

      if (orderError) {
        throw new Error(`Failed to log order: ${orderError.message}`);
      }
      orderIdToReturn = newOrder.id;
    }

    // Auto-discover/update landing query parameters (?p, ?o, etc.)
    autoRegisterLandingParams(supabaseAdmin, projectId, page_url, page_path);

    // Resolve SendPulse Smart Deep Link (via tg.pulse.is)
    let sendpulseDeepLink: string | null = null;
    const customBot = marketing?.bot_username || meta?.bot_username || null;
    const customFlowId = marketing?.flow_id || meta?.flow_id || null;

    let targetBot = customBot;
    let targetFlow = customFlowId;

    if (!targetBot) {
      if (project_slug === 'sergiy') {
        targetBot = 'cherniyavskyibot';
        targetFlow = targetFlow || '6a7ec1362bcd49dc270d239a';
      } else if (project_slug === 'nesoniaa') {
        targetBot = 'nesoniaaibot';
        targetFlow = targetFlow || '6a86d7b517aebba1b80a29d6';
      }
    }

    if (targetBot) {
      try {
        const { generateSendPulseDeepLink } = await import('@/lib/sendpulse/service');
        sendpulseDeepLink = generateSendPulseDeepLink({
          botUsername: targetBot,
          flowId: targetFlow,
          bwCid: bw_cid,
          phone,
          email,
          name,
          utmSource: utm_source,
          utmMedium: utm_medium,
          utmCampaign: utm_campaign
        });
      } catch (linkErr) {
        console.warn('Could not generate SendPulse link:', linkErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Lead registered successfully.',
      customer_id: customerId,
      order_id: orderIdToReturn,
      bw_cid,
      sendpulse_deep_link: sendpulseDeepLink,
      telegram_deep_link: sendpulseDeepLink || (targetBot && bw_cid ? `https://t.me/${targetBot}?start=${bw_cid}` : null)
    });

  } catch (error: any) {
    console.error('API Gateway Lead Registration Error:', error);
    return NextResponse.json(
      { error: 'Internal server error.', details: error.message },
      { status: 500 }
    );
  }
}

async function autoRegisterLandingParams(supabaseAdmin: any, projectId: string, pageUrl?: string | null, pagePath?: string | null) {
  if (!pageUrl && !pagePath) return;
  try {
    const urlStr = pageUrl || pagePath || '';
    let parsedUrl: URL | null = null;
    if (urlStr.startsWith('http://') || urlStr.startsWith('https://')) {
      parsedUrl = new URL(urlStr);
    } else if (pageUrl && (pageUrl.startsWith('http://') || pageUrl.startsWith('https://'))) {
      parsedUrl = new URL(pageUrl);
    }

    const path = parsedUrl ? parsedUrl.pathname.toLowerCase() : (pagePath ? pagePath.toLowerCase() : '/');
    const queryParams: Array<{ key: string }> = [];

    if (parsedUrl && parsedUrl.searchParams) {
      parsedUrl.searchParams.forEach((_, key) => {
        const kLower = key.toLowerCase();
        if (kLower && !['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid'].includes(kLower)) {
          queryParams.push({ key: kLower });
        }
      });
    }

    const { data: existing } = await supabaseAdmin
      .from('project_landings')
      .select('*')
      .eq('project_id', projectId)
      .eq('path', path)
      .maybeSingle();

    let mergedParams = existing?.parameters || [];
    if (!Array.isArray(mergedParams)) mergedParams = [];

    let updated = false;
    for (const q of queryParams) {
      const idx = mergedParams.findIndex((p: any) => p.key === q.key);
      if (idx >= 0) {
        mergedParams[idx].observed_count = (mergedParams[idx].observed_count || 1) + 1;
        mergedParams[idx].last_seen_at = new Date().toISOString();
        updated = true;
      } else {
        mergedParams.push({
          key: q.key,
          description: `Parameter ?${q.key}`,
          observed_count: 1,
          last_seen_at: new Date().toISOString()
        });
        updated = true;
      }
    }

    if (updated || (!existing && queryParams.length > 0)) {
      await supabaseAdmin.from('project_landings').upsert(
        {
          project_id: projectId,
          label: existing?.label || path,
          url: pageUrl || existing?.url || path,
          path,
          type: existing?.type || 'free',
          parameters: mergedParams,
          last_ping_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        { onConflict: 'project_id,path' }
      );
    }
  } catch (err) {
    console.warn('[Auto-Register Landing Params Warning]:', err);
  }
}

function parseQueryParams(pageUrl?: string | null) {
  const result: { offer_id: string; promo_id: string; query_params: Record<string, string> } = {
    offer_id: '',
    promo_id: '',
    query_params: {}
  };
  if (!pageUrl) return result;
  try {
    let urlObj: URL | null = null;
    if (pageUrl.startsWith('http://') || pageUrl.startsWith('https://')) {
      urlObj = new URL(pageUrl);
    } else {
      urlObj = new URL(pageUrl, 'https://placeholder.domain');
    }
    urlObj.searchParams.forEach((val, key) => {
      const kLower = key.toLowerCase();
      result.query_params[kLower] = val;
      if (kLower === 'o' || kLower === 'offer' || kLower === 'offer_id') {
        result.offer_id = val;
      }
      if (kLower === 'p' || kLower === 'promo' || kLower === 'promo_id' || kLower === 'package') {
        result.promo_id = val;
      }
    });
  } catch (e) {
    // Ignore parse errors
  }
  return result;
}


