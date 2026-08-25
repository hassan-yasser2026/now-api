/**
 * Reports Arabic strings that appear in the app but are missing from the
 * translation dictionary.
 *
 * Usage: node scripts/extract-strings.js > .ar-strings.json
 *        node scripts/check-dictionary.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'constants/dictionary.js'), 'utf8');

const keys = new Set();
const keyPattern = /'((?:[^'\\]|\\.)*)'\s*:/g;
let match;
while ((match = keyPattern.exec(src))) {
  keys.add(match[1].replace(/\\'/g, "'").replace(/\\n/g, '\n'));
}

const strings = JSON.parse(
  fs.readFileSync(path.join(ROOT, '.ar-strings.json'), 'utf8')
);

const missing = strings.filter((entry) => !keys.has(entry.value));

// Interpolated strings never match a literal key; they are handled by
// AR_EN_PATTERNS at runtime.
const templates = missing.filter((entry) => entry.value.includes('${'));
const uncovered = missing.filter((entry) => !entry.value.includes('${'));

console.log(`dictionary keys:    ${keys.size}`);
console.log(`source strings:     ${strings.length}`);
console.log(`pattern templates:  ${templates.length}`);
console.log(`uncovered:          ${uncovered.length}\n`);

for (const entry of uncovered) {
  console.log(`${JSON.stringify(entry.value)}  <- ${entry.files.join(', ')}`);
}

process.exitCode = uncovered.length > 0 ? 1 : 0;
