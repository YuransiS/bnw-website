const fs = require('fs');
const parser = require('@babel/parser');

try {
  const code = fs.readFileSync('src/app/admin/LeadsDashboard.tsx', 'utf8');
  parser.parse(code, {
    sourceType: 'module',
    plugins: ['typescript', 'jsx'],
  });
  console.log('Parsed successfully!');
} catch (err) {
  console.error('Error Message:', err.message);
  console.error('Stack:', err.stack);
}
