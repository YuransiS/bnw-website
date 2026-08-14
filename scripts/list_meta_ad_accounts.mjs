import fs from 'fs';

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

const token = env.META_ACCESS_TOKEN;
const url = `https://graph.facebook.com/v25.0/me/adaccounts?fields=name,account_id,id,account_status,currency,amount_spent&limit=50&access_token=${token}`;

const res = await fetch(url);
const data = await res.json();
console.log('--- ALL META AD ACCOUNTS ---');
console.log(data);
