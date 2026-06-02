const fs = require('fs');
const code = fs.readFileSync('src/app/admin/LeadsDashboard.tsx', 'utf8');
const lines = code.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('PIPELINE') || line.includes('statusPriority') || line.includes('normalizeStatus')) {
    console.log(`Line ${idx + 1}: ${line}`);
  }
});
