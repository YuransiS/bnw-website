import { NextResponse } from 'next/server';
import crypto from 'crypto';

const PROJECT_DOMAINS: Record<string, string> = {
  victoria: 'https://victoria-mc.vercel.app',
  sofia: 'https://sofifinsight.vercel.app',
  valeria: 'https://pix-ai-ua.vercel.app',
  svitlana: 'https://svitlanatape.vercel.app',
  clean_klinom: 'https://clean-klinom.vercel.app',
  vova_win: 'https://vova-win.club',
};

function getSecretKeyForProject(slug: string): string {
  const envKey = `WFP_SECRET_KEY_${slug.toUpperCase()}`;
  const key = process.env[envKey] || process.env.WFP_SECRET_KEY || 'default_secret';
  return key.replace(/['"]/g, '').trim();
}

export async function POST(request: Request) {
  try {
    const { projectSlug, amount, currency, tariffName, customerName, customerPhone, uuid } = await request.json();

    if (!projectSlug) {
      return NextResponse.json({ error: 'Missing projectSlug' }, { status: 400 });
    }

    const secretKey = getSecretKeyForProject(projectSlug);

    const payloadObj = {
      a: amount,
      c: currency || 'UAH',
      t: tariffName || 'Оплата послуг',
      n: customerName || '',
      p: customerPhone || '',
      u: uuid || ''
    };

    const payloadStr = JSON.stringify(payloadObj);
    const pBase64 = Buffer.from(payloadStr).toString('base64');

    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(pBase64)
      .digest('hex');

    let domain = PROJECT_DOMAINS[projectSlug] || PROJECT_DOMAINS.victoria;
    const requestHost = request.headers.get('host') || '';
    
    // Support local testing when running locally
    if (requestHost.includes('localhost')) {
      if (projectSlug === 'svitlana') domain = 'http://localhost:3000';
      else if (projectSlug === 'valeria') domain = 'http://localhost:3001';
      else if (projectSlug === 'sofia') domain = 'http://localhost:3002';
      else if (projectSlug === 'clean_klinom') domain = 'http://localhost:3003';
      else if (projectSlug === 'victoria') domain = 'http://localhost:3004';
    }

    const checkoutUrl = `${domain}/checkout?p=${encodeURIComponent(pBase64)}&sig=${signature}`;

    return NextResponse.json({ url: checkoutUrl });
  } catch (error) {
    console.error('Generate Link Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
