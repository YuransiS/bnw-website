const fs = require('fs');
const path = require('path');

const reportPath = path.join(__dirname, 'landings_report.json');
if (!fs.existsSync(reportPath)) {
  console.log("No landings_report.json found!");
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

for (const [pSlug, pData] of Object.entries(data)) {
  console.log(`\n========================================`);
  console.log(`PROJECT: ${pSlug} (${pData.name})`);
  console.log(`========================================`);
  
  console.log(`\n--- TARGET SHEETS ---`);
  const targetSheets = Object.entries(pData.target_sheets).sort((a,b) => b[1] - a[1]);
  targetSheets.forEach(([sheet, count]) => {
    console.log(`  - "${sheet}": ${count}`);
  });

  console.log(`\n--- ORIGINAL SHEETS ---`);
  const originalSheets = Object.entries(pData.original_sheets).sort((a,b) => b[1] - a[1]);
  originalSheets.forEach(([sheet, count]) => {
    console.log(`  - "${sheet}": ${count}`);
  });

  console.log(`\n--- PAGE URLS (Top 25) ---`);
  const pageUrls = Object.entries(pData.page_urls).sort((a,b) => b[1] - a[1]);
  pageUrls.slice(0, 25).forEach(([url, count]) => {
    console.log(`  - "${url}": ${count}`);
  });
  if (pageUrls.length > 25) {
    console.log(`  ... and ${pageUrls.length - 25} more urls`);
  }
}
