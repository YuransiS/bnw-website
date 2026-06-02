const fs = require('fs');
const code = fs.readFileSync('src/app/admin/actions.ts', 'utf8');
const lines = code.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('daily_traffic_and_costs')) {
    console.log(`Line ${idx + 1}: ${line}`);
  }
});
