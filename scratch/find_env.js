const fs = require('fs');
const path = require('path');

function searchDir(dir, depth = 0) {
  if (depth > 5) return;
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
        const lowerFile = file.toLowerCase();
        if (lowerFile.startsWith('.') || lowerFile === 'node_modules' || lowerFile === 'appdata' || lowerFile === 'microsoft' || lowerFile === 'temp' || lowerFile === 'cache') {
          continue;
        }
        searchDir(fullPath, depth + 1);
      } else {
        if (file === '.env' || file === '.env.local' || file === '.env.production') {
          console.log("Found env file:", fullPath);
          try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            console.log("Keys in file:");
            content.split('\n').forEach(line => {
              const parts = line.split('=');
              if (parts.length >= 2) {
                console.log(`  - ${parts[0].trim()}`);
              }
            });
          } catch (e) {
            console.error("  - Could not read content:", e.message);
          }
        }
      }
    }
  } catch (e) {
    // Ignore permissions errors
  }
}

console.log("Searching in C:\\Users\\yura3...");
searchDir("C:\\Users\\yura3");
console.log("Search finished.");
