import { NextResponse } from 'next/server';

const PROJECT_DOMAINS: Record<string, string> = {
  victoria: 'https://victoria-mc.vercel.app',
  sofia: 'https://sofifinsight.vercel.app',
  valeria: 'https://pix-ai-ua.vercel.app',
  svitlana: 'https://svitlanatape.vercel.app',
  clean_klinom: 'https://clean-klinom.vercel.app',
  vova_win: 'https://vova-win.club',
};

export async function POST(request: Request) {
  try {
    const { projectSlug, amount, currency, tariffName, customerName, customerPhone, uuid } = await request.json();

    if (!projectSlug) {
      return NextResponse.json({ error: 'Missing projectSlug' }, { status: 400 });
    }

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

    const targetUrl = `${domain}/api/admin/generate-link`;
    console.log(`Forwarding payment generation for ${projectSlug} to: ${targetUrl}`);

    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount,
        currency,
        tariffName,
        customerName,
        customerPhone,
        uuid
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`Failed to forward link generation to project ${projectSlug}:`, errorText);
      return NextResponse.json({ error: `Project API returned error: ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Generate Link Proxy Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
