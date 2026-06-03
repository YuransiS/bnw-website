const fs = require('fs');
const path = require('path');

const pathsToSearch = [
  path.join(process.env.APPDATA, 'Code', 'User'),
  path.join(process.env.APPDATA, 'Antigravity IDE', 'User'),
  path.join(process.env.APPDATA, 'antigravity-ide'),
  path.join(process.env.USERPROFILE, '.config'),
];

function searchInFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    if (content.includes('SUPABASE_SERVICE_ROLE_KEY') || content.includes('NEXT_PUBLIC_SUPABASE_URL')) {
      console.log("Found references in file:", filePath);
      // Safely print matching lines without leaking sensitive keys fully if not needed
      content.split('\n').forEach((line, idx) => {
        if (line.includes('SUPABASE_SERVICE_ROLE_KEY') || line.includes('NEXT_PUBLIC_SUPABASE_URL')) {
          console.log(`  Line ${idx+1}: ${line.trim().substring(0, 100)}...`);
        }
      });
    }
  } catch (e) {
    // Ignore read errors
  }
}

function walkDir(dir) {
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      let stats;
      try {
        stats = fs.statSync(fullPath);
      } catch (e) {
        continue;
      }
      if (stats.isDirectory()) {
        walkDir(fullPath);
      } else {
        searchInFile(fullPath);
      }
    }
  } catch (e) {
    // Ignore permissions
  }
}

pathsToSearch.forEach(p => {
  if (fs.existsSync(p)) {
    console.log("Scanning directory:", p);
    walkDir(p);
  }
});

console.log("Scan complete.");
