import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const clean = line.trim();
  if (clean && !clean.startsWith('#')) {
    const idx = clean.indexOf('=');
    if (idx !== -1) {
      env[clean.substring(0, idx).trim()] = clean.substring(idx + 1).trim();
    }
  }
});

const DEFAULT_PROJECT_LANDINGS = {
  bw_main: [{ url: "https://bnw-prod.vercel.app/" }],
  victoria: [{ url: "https://victoria-mc.vercel.app/" }],
  sofia: [{ url: "https://sofifinsight.vercel.app/" }],
  svitlana: [{ url: "https://svitlanatape.vercel.app/" }],
  anastasia_sych: [{ url: "https://anastasia-sych.vercel.app/" }],
  economica: [{ url: "https://economica.vercel.app/" }],
  nesoniaa: [{ url: "https://nesoniaa.vercel.app/" }],
  clean_klinom: [{ url: "https://clean-klinom.vercel.app/" }],
  sergiy: [{ url: "https://sergiy-chernyavskyy.vercel.app/" }]
};

console.log('=== Live Ping-Pong Sweep across all Satellite Projects ===');
for (const [slug, landings] of Object.entries(DEFAULT_PROJECT_LANDINGS)) {
  const domain = landings[0].url.replace(/\/$/, "");
  const start = performance.now();
  let isLive = false;
  let statusText = '';

  try {
    const res = await fetch(domain, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
    const latency = Math.round(performance.now() - start);
    isLive = res.ok || res.status < 500;
    statusText = `HTTP ${res.status} (${latency}ms)`;
  } catch (err) {
    statusText = `Error: ${err.message}`;
  }

  console.log(` - [${isLive ? '🟢 LIVE' : '🔴 OFFLINE'}] ${slug.padEnd(16)} | Domain: ${domain.padEnd(42)} | Status: ${statusText}`);
}
