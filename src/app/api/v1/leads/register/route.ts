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
          metadata: metadata || {},
          created_at: createdAtIso
        })
        .select('id')
        .single();

      if (clickError) {
        throw new Error(`Failed to insert traffic click: ${clickError.message}`);
      }

      return NextResponse.json({
        success: true,
        message: 'Click registered successfully.',
        customer_id: null,
        order_id: clickData.id
      });
    }

    // 3. Выделение и нормализация контактных данных лида
    const name = lead.name || null;
    let phone = lead.phone ? String(lead.phone).trim() : null;
    let email = lead.email ? String(lead.email).trim().toLowerCase() : null;
    let telegram = lead.telegram ? String(lead.telegram).trim() : null;

    phone = phone ? phone.replace(/\s+/g, '') : null;
    email = email || null;
    telegram = telegram || null;

    if (!phone && !email && !telegram) {
      return NextResponse.json(
        { error: 'At least one contact identifier (phone, email, or telegram) must be provided.' },
        { status: 400 }
      );
    }

    // 4. Поиск существующего профиля клиента строго внутри этого проекта
    let customerId: string | null = null;
    
    // Формируем условия поиска
    const orConditions: string[] = [];
    if (phone) orConditions.push(`phone.eq.${phone}`);
    if (email) orConditions.push(`email.eq.${email}`);
    if (telegram) orConditions.push(`telegram.ilike.${telegram}`);

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

    // Ensure currency is resolved and set in metadata
    const meta = metadata || {};
    const reqCurrency = lead.currency || meta.currency || null;
    if (reqCurrency) {
      meta.currency = reqCurrency;
    }

    // Fetch today's NBU rates and store in metadata for exact conversion
    try {
      const { getExchangeRates } = await import('@/lib/exchange-rate');
      const todayRates = await getExchangeRates();
      const amount = Number(lead.amount || 0);
      const currency = String(reqCurrency || 'uah').toLowerCase().trim();

      meta.usd_rate = todayRates.usdRate;
      meta.eur_to_usd = todayRates.eurToUsd;

      let usdAmount = amount;
      let uahAmount = amount;

      if (currency === 'uah' || currency === '₴') {
        usdAmount = amount / todayRates.usdRate;
        uahAmount = amount;
      } else if (currency === 'eur' || currency === '€') {
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
          visitor_uuid: visitor_uuid || undefined,
          metadata: meta
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
          visitor_uuid,
          metadata: meta,
          created_at: createdAtIso
        })
        .select('id')
        .single();

      if (orderError) {
        throw new Error(`Failed to log order: ${orderError.message}`);
      }
      orderIdToReturn = newOrder.id;
    }

    return NextResponse.json({
      success: true,
      message: 'Lead registered successfully.',
      customer_id: customerId,
      order_id: orderIdToReturn
    });

  } catch (error: any) {
    console.error('API Gateway Lead Registration Error:', error);
    return NextResponse.json(
      { error: 'Internal server error.', details: error.message },
      { status: 500 }
    );
  }
}
