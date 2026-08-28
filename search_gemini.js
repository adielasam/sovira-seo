const fs = require('fs');
const path = require('path');

const searchPattern = /gemini(-|)3\.5(-|)flash/i;
const searchString = 'gemini-3.5-flash';

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (!['node_modules', '.git', '.next'].includes(file)) {
        walkDir(fullPath);
      }
    } else {
      if (['.ts', '.tsx', '.js', '.jsx', '.json'].includes(path.extname(fullPath))) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          if (content.match(/gemini-[a-z0-9.-]+/i)) {
             console.log('Match found in:', fullPath);
             const lines = content.split('\n');
             lines.forEach((line, i) => {
               if (line.match(/gemini-[a-z0-9.-]+/i)) {
                 console.log(`  Line ${i + 1}: ${line.trim()}`);
               }
             });
          }
        } catch (e) {
          // Ignore read errors
        }
      }
    }
  }
}

walkDir('.');
