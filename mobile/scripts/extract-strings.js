/**
 * Scans the app source for Arabic string literals and prints them as a
 * de-duplicated JSON array. Used to seed constants/i18n dictionary.
 *
 * Usage: node scripts/extract-strings.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIRS = ['screens', 'components', 'navigation', 'utils', 'services', 'store', 'constants'];
const EXTS = new Set(['.js', '.jsx', '.ts', '.tsx']);
const ARABIC = /[؀-ۿ]/;

// Files that hold translation data or locale-specific constants rather than UI copy.
const SKIP = new Set([
  'constants/countries.js',
  'constants/dictionary.js',
  'constants/i18n.js',
  'utils/translator.js',
  'utils/validation.js',
]);

const files = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      walk(full);
    } else if (EXTS.has(path.extname(entry.name))) {
      files.push(full);
    }
  }
};

for (const dir of DIRS) {
  const full = path.join(ROOT, dir);
  if (fs.existsSync(full)) walk(full);
}
files.push(path.join(ROOT, 'App.js'));

const found = new Map();

const record = (raw, file) => {
  // JSX collapses newline + indentation into a single space.
  const value = String(raw).replace(/\s*\n\s*/g, ' ').trim();
  if (!value || !ARABIC.test(value)) return;
  if (!found.has(value)) found.set(value, new Set());
  found.get(value).add(path.relative(ROOT, file).replace(/\\/g, '/'));
};

for (const file of files) {
  const relative = path.relative(ROOT, file).replace(/\\/g, '/');
  if (SKIP.has(relative)) continue;

  const src = fs.readFileSync(file, 'utf8');

  // quoted string literals
  const quoted = src.match(/(['"`])(?:\\.|(?!\1)[^\\\r\n])*\1/g) || [];
  for (const literal of quoted) record(literal.slice(1, -1), file);

  // JSX text nodes, including ones broken across lines
  const jsxText = src.match(/>[^<>{}]*[؀-ۿ][^<>{}]*</g) || [];
  for (const node of jsxText) record(node.slice(1, -1), file);
}

const output = [...found.entries()]
  .sort((a, b) => a[0].localeCompare(b[0], 'ar'))
  .map(([value, filesSet]) => ({ value, files: [...filesSet] }));

console.log(JSON.stringify(output, null, 2));
console.error(`\n${output.length} unique Arabic strings in ${files.length} files`);
