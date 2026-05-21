const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let original = content;
      
      // Add min-h-0 if both flex-1 and overflow-y-auto are present in the same className string
      content = content.replace(/className="([^"]*)"/g, (match, classStr) => {
        if (classStr.includes('flex-1') && classStr.includes('overflow-y-auto') && !classStr.includes('min-h-0')) {
          return `className="${classStr} min-h-0"`;
        }
        return match;
      });

      if (content !== original) {
        console.log('Fixed', fullPath);
        fs.writeFileSync(fullPath, content);
      }
    }
  }
}

processDir(path.join(__dirname, 'src/components/screens'));
processDir(path.join(__dirname, 'src/app'));
