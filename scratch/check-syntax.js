const fs = require('fs');
const parser = require('@babel/parser');

try {
  const code = fs.readFileSync('src/app/admin/LeadsDashboard.tsx', 'utf8');
  parser.parse(code, {
    sourceType: 'module',
    plugins: ['typescript', 'jsx'],
  });
  console.log('No syntax errors found!');
} catch (err) {
  console.error('Syntax Error details:');
  console.error(err.message);
  if (err.loc) {
    console.error(`Line: ${err.loc.line}, Column: ${err.loc.column}`);
  }
}
