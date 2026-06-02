const fs = require('fs');

const code = fs.readFileSync('src/app/admin/LeadsDashboard.tsx', 'utf8');
const lines = code.split('\n');

const unclosedLines = [1190, 1192, 1203];

unclosedLines.forEach((l) => {
  console.log(`Line ${l}: ${lines[l - 1]}`);
});
