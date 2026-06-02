const fs = require('fs');
const code = fs.readFileSync('src/app/admin/LeadsDashboard.tsx', 'utf8');
const lines = code.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('singleProjectStats') || line.includes('rawTraffic') || line.includes('rawCosts')) {
    console.log(`Line ${idx + 1}: ${line}`);
  }
});
