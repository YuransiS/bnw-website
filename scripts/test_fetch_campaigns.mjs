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
const testAccount = 'act_181400377513509'; // Sofia Matviyko

const url = `https://graph.facebook.com/v25.0/${testAccount}/campaigns?fields=id,name,status,effective_status,objective,created_time&limit=20&access_token=${token}`;
const res = await fetch(url);
const data = await res.json();
console.log('--- CAMPAIGNS FOR', testAccount, '---');
console.log(data);
