const fs = require('fs');

const code = fs.readFileSync('src/app/admin/LeadsDashboard.tsx', 'utf8');

// Find all JSX tags
const openDivs = (code.match(/<div[ >]/g) || []).length;
const closeDivs = (code.match(/<\/div>/g) || []).length;

console.log(`Total <div tags: ${openDivs}`);
console.log(`Total </div> tags: ${closeDivs}`);

// Let's trace line-by-line for divs
const lines = code.split('\n');
let divStack = [];
let inComment = false;
let inBlockComment = false;
let inString = false;
let stringChar = '';

for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
  const line = lines[lineIdx];
  
  // Simple check for open/close divs on each line
  let i = 0;
  while (i < line.length) {
    const substr = line.substring(i);
    if (substr.startsWith('//')) break;
    if (substr.startsWith('/*')) {
      inBlockComment = true;
      i += 2;
      continue;
    }
    if (inBlockComment) {
      if (substr.startsWith('*/')) {
        inBlockComment = false;
        i += 2;
      } else {
        i++;
      }
      continue;
    }
    
    if (substr.startsWith('<div')) {
      divStack.push(lineIdx + 1);
      i += 4;
    } else if (substr.startsWith('</div>')) {
      divStack.pop();
      i += 6;
    } else {
      i++;
    }
  }
}

console.log('Unclosed <div tags opened at lines:', divStack);
