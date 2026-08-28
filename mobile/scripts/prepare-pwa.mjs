import { readFile, writeFile } from 'node:fs/promises';

const indexPath = new URL('../dist/index.html', import.meta.url);
const manifestPath = new URL('../dist/manifest.json', import.meta.url);
let html = await readFile(indexPath, 'utf8');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
manifest.icons = manifest.icons.map((icon) => ({
  ...icon,
  src: '/now-logo.png',
  type: 'image/png',
}));
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

if (!html.includes('rel="manifest"')) {
  html = html.replace(
    '</head>',
    '  <link rel="manifest" href="/manifest.json">\n  <meta name="mobile-web-app-capable" content="yes">\n  <meta name="apple-mobile-web-app-capable" content="yes">\n  <meta name="apple-mobile-web-app-status-bar-style" content="default">\n</head>'
  );
}

await writeFile(indexPath, html);
console.log('PWA metadata linked in dist/index.html');
