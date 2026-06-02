const fs = require('fs');

const code = fs.readFileSync('src/app/admin/LeadsDashboard.tsx', 'utf8');
const lines = code.split('\n');

let stack = [];
let inComment = false;
let inBlockComment = false;
let inString = false;
let stringChar = '';

for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
  const line = lines[lineIdx];
  let i = 0;
  
  while (i < line.length) {
    const substr = line.substring(i);
    
    if (inComment) break;
    if (inBlockComment) {
      if (substr.startsWith('*/')) {
        inBlockComment = false;
        i += 2;
      } else {
        i++;
      }
      continue;
    }
    if (inString) {
      if (substr.startsWith(stringChar) && line[i - 1] !== '\\') {
        inString = false;
      }
      i++;
      continue;
    }
    
    if (substr.startsWith('//')) {
      break;
    }
    if (substr.startsWith('/*')) {
      inBlockComment = true;
      i += 2;
      continue;
    }
    if (substr.startsWith('"') || substr.startsWith("'") || substr.startsWith('`')) {
      inString = true;
      stringChar = substr[0];
      i++;
      continue;
    }
    
    if (substr.startsWith('<div')) {
      stack.push({ type: 'open', line: lineIdx + 1 });
      i += 4;
    } else if (substr.startsWith('</div>')) {
      if (stack.length === 0) {
        console.log(`EXTRA </div> on line ${lineIdx + 1}`);
      } else {
        stack.pop();
      }
      i += 6;
    } else {
      i++;
    }
  }
  inComment = false;
}

console.log('Unclosed <div> tags opened at lines:');
console.log(stack);
