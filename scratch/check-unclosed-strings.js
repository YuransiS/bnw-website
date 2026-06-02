const fs = require('fs');

const code = fs.readFileSync('src/app/admin/LeadsDashboard.tsx', 'utf8');
const lines = code.split('\n');

let inString = false;
let stringChar = '';
let openLine = 0;

for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
  const line = lines[lineIdx];
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    const prev = line[i - 1];

    if (inString) {
      if (c === stringChar && prev !== '\\') {
        inString = false;
      }
    } else {
      if (c === '"' || c === "'" || c === '`') {
        inString = true;
        stringChar = c;
        openLine = lineIdx + 1;
      }
    }
  }
}

if (inString) {
  console.log(`Unclosed string starting with ${stringChar} opened at line ${openLine}`);
} else {
  console.log('No unclosed strings found!');
}
