const fs = require('fs');
const path = require('path');

const reportPath = path.join(__dirname, 'landings_report.json');
if (!fs.existsSync(reportPath)) {
  console.log("No landings_report.json found!");
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
let md = "# Database Landings Audit Report\n\nThis document shows all target sheets, original sheets, and unique page URLs found in the `unified_orders` database for each project.\n\n";

for (const [pSlug, pData] of Object.entries(data)) {
  md += `## Project: ${pSlug} (${pData.name})\n\n`;
  
  md += `### Target Sheets\n`;
  const targetSheets = Object.entries(pData.target_sheets).sort((a,b) => b[1] - a[1]);
  if (targetSheets.length === 0) {
    md += "*None found*\n\n";
  } else {
    targetSheets.forEach(([sheet, count]) => {
      md += `- **"${sheet}"**: ${count} orders\n`;
    });
    md += "\n";
  }

  md += `### Original Sheets\n`;
  const originalSheets = Object.entries(pData.original_sheets).sort((a,b) => b[1] - a[1]);
  if (originalSheets.length === 0) {
    md += "*None found*\n\n";
  } else {
    originalSheets.forEach(([sheet, count]) => {
      md += `- **"${sheet}"**: ${count} orders\n`;
    });
    md += "\n";
  }

  md += `### Page URLs\n`;
  const pageUrls = Object.entries(pData.page_urls).sort((a,b) => b[1] - a[1]);
  if (pageUrls.length === 0) {
    md += "*None found*\n\n";
  } else {
    pageUrls.forEach(([url, count]) => {
      md += `- \`${url}\`: ${count} orders\n`;
    });
    md += "\n";
  }
  md += "---\n\n";
}

const outputPath = path.join(__dirname, 'full_audit_report.md');
fs.writeFileSync(outputPath, md, 'utf8');
console.log(`Saved report to ${outputPath}`);
