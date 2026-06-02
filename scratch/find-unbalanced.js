const fs = require('fs');

const code = fs.readFileSync('src/app/admin/LeadsDashboard.tsx', 'utf8');

const lines = code.split('\n');
let braces = 0;
let parens = 0;
let brackets = 0;
let inString = false;
let stringChar = '';
let inComment = false;
let inBlockComment = false;

const braceHistory = [];
const parenHistory = [];

for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
  const line = lines[lineIdx];
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    const next = line[i + 1];
    const prev = line[i - 1];

    if (inComment) {
      continue; // comment lasts till end of line
    }
    if (inBlockComment) {
      if (c === '*' && next === '/') {
        inBlockComment = false;
        i++;
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
      i++;
      continue;
    }
    if (c === '/' && next === '*') {
      inBlockComment = true;
      i++;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      inString = true;
      stringChar = c;
      continue;
    }

    if (c === '{') {
      braces++;
      braceHistory.push(lineIdx + 1);
    }
    if (c === '}') {
      braces--;
      braceHistory.pop();
    }
    if (c === '(') {
      parens++;
      parenHistory.push(lineIdx + 1);
    }
    if (c === ')') {
      parens--;
      parenHistory.pop();
    }
  }
  inComment = false; // Reset line comment at end of line
}

console.log('Unclosed { opened at lines:', braceHistory);
console.log('Unclosed ( opened at lines:', parenHistory);
