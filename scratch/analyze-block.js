const fs = require('fs');

const code = fs.readFileSync('src/app/admin/LeadsDashboard.tsx', 'utf8');
const lines = code.split('\n');

let braces = 0;
let parens = 0;
let inString = false;
let stringChar = '';
let inComment = false;
let inBlockComment = false;

for (let i = 1188; i < 1394; i++) {
  const line = lines[i];
  let lineBraces = 0;
  let lineParens = 0;

  for (let j = 0; j < line.length; j++) {
    const c = line[j];
    const next = line[j + 1];
    const prev = line[j - 1];

    if (inComment) continue;
    if (inBlockComment) {
      if (c === '*' && next === '/') {
        inBlockComment = false;
        j++;
      }
      continue;
    }
    if (inString) {
      if (c === stringChar && prev !== '\\') {
        inString = false;
      }
      continue;
    }

    if (c === '/' && next === '/') {
      inComment = true;
      j++;
      continue;
    }
    if (c === '/' && next === '*') {
      inBlockComment = true;
      j++;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      inString = true;
      stringChar = c;
      continue;
    }

    if (c === '{') {
      braces++;
      lineBraces++;
    }
    if (c === '}') {
      braces--;
      lineBraces--;
    }
    if (c === '(') {
      parens++;
      lineParens++;
    }
    if (c === ')') {
      parens--;
      lineParens--;
    }
  }
  inComment = false;

  console.log(`Line ${i + 1}: ${line.trim().substring(0, 40)}... Braces: ${braces} (diff ${lineBraces}), Parens: ${parens} (diff ${lineParens})`);
}
