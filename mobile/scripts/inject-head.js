const fs = require('fs');
const path = require('path');

const base = (process.env.WEB_BASE_PATH || '').replace(/\/$/, '');
const dist = path.join(__dirname, '..', 'dist', 'index.html');
let html = fs.readFileSync(dist, 'utf8');

const iconLink = /<link rel="icon"[^>]*\/>/;
const replacement = [
  `<link rel="icon" href="${base}/favicon.ico"/>`,
  `<link rel="apple-touch-icon" href="${base}/apple-touch-icon.png"/>`,
  `<link rel="manifest" href="${base}/manifest.json"/>`,
  `<meta name="theme-color" content="#d9541e"/>`,
  `<meta name="apple-mobile-web-app-capable" content="yes"/>`,
  `<meta name="mobile-web-app-capable" content="yes"/>`,
  `<meta name="apple-mobile-web-app-status-bar-style" content="default"/>`,
  `<meta name="apple-mobile-web-app-title" content="Pizza"/>`,
].join('');

if (!iconLink.test(html)) {
  console.error('icon link not found in dist/index.html');
  process.exit(1);
}
fs.writeFileSync(dist, html.replace(iconLink, replacement));
console.log('injected PWA head tags');
