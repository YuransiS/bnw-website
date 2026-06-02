const fs = require('fs');

const code = fs.readFileSync('src/app/admin/LeadsDashboard.tsx', 'utf8');
const lines = code.split('\n');

for (let i = 1199; i < 1224; i++) {
  console.log(`Line ${i + 1}: ${lines[i]}`);
}
