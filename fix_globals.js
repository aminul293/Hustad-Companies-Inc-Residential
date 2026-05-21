const fs = require('fs');

const cssPath = __dirname + '/src/app/globals.css';
let content = fs.readFileSync(cssPath, 'utf8');
if (content.includes('@apply flex-1 overflow-y-auto') && !content.includes('min-h-0')) {
  content = content.replace(/@apply flex-1 overflow-y-auto/g, '@apply flex-1 min-h-0 overflow-y-auto');
  fs.writeFileSync(cssPath, content);
  console.log('Fixed globals.css');
}

const reviewPath = __dirname + '/src/app/review/[token]/page.tsx';
let reviewContent = fs.readFileSync(reviewPath, 'utf8');
let reviewOriginal = reviewContent;
reviewContent = reviewContent.replace(/className="([^"]*)"/g, (match, classStr) => {
  if (classStr.includes('flex-1') && classStr.includes('overflow-y-auto') && !classStr.includes('min-h-0')) {
    return `className="${classStr} min-h-0"`;
  }
  return match;
});
if (reviewContent !== reviewOriginal) {
  fs.writeFileSync(reviewPath, reviewContent);
  console.log('Fixed review page.tsx');
}

