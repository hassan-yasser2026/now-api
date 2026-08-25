// Explicit extension keeps this module importable by the Node smoke test as
// well as by Metro.
import { AR_EN, AR_EN_PATTERNS } from '../constants/dictionary.js';

/**
 * Runtime Arabic → English translator.
 *
 * Screens keep their Arabic source strings; this resolves whatever text is
 * actually rendered, so a language switch applies everywhere at once.
 */

const ARABIC = /[؀-ۿ]/;

// Longest phrases first so a compound sentence is not shredded by a short key.
const SEGMENTS = Object.keys(AR_EN)
  .filter((key) => key.length >= 3 && ARABIC.test(key))
  .sort((a, b) => b.length - a.length);

const cache = new Map();
const MAX_CACHE = 4000;

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const SEGMENT_PATTERN = SEGMENTS.length
  ? new RegExp(SEGMENTS.map(escapeRegExp).join('|'), 'g')
  : null;

const applyPatterns = (value) => {
  for (const { re, en } of AR_EN_PATTERNS) {
    const match = value.match(re);
    if (match) {
      return en.replace(/\$(\d)/g, (_, index) => match[Number(index)] ?? '');
    }
  }
  return null;
};

const translateCore = (value) => {
  const exact = AR_EN[value];
  if (exact) return exact;

  const patterned = applyPatterns(value);
  if (patterned !== null) return patterned;

  if (!SEGMENT_PATTERN) return value;

  // Mixed / dynamic text: translate the Arabic parts we know, keep the rest.
  SEGMENT_PATTERN.lastIndex = 0;
  const replaced = value.replace(SEGMENT_PATTERN, (segment) => AR_EN[segment]);
  return replaced;
};

/**
 * Translate a single string into the target language.
 * Arabic is the source language, so `ar` is a pass-through.
 */
export const translate = (value, language) => {
  if (language !== 'en') return value;
  if (typeof value !== 'string' || !value) return value;
  if (!ARABIC.test(value)) return value;

  const cached = cache.get(value);
  if (cached !== undefined) return cached;

  // Preserve the surrounding whitespace that layout may depend on.
  const leading = value.match(/^\s*/)[0];
  const trailing = value.match(/\s*$/)[0];
  const body = value.slice(leading.length, value.length - trailing.length);

  const result = leading + translateCore(body) + trailing;

  if (cache.size >= MAX_CACHE) cache.clear();
  cache.set(value, result);

  return result;
};

/** Translate any renderable child (string, number, or a list of them). */
export const translateChildren = (children, language) => {
  if (language !== 'en') return children;

  if (typeof children === 'string') {
    return translate(children, language);
  }

  if (Array.isArray(children)) {
    let changed = false;
    const next = children.map((child) => {
      if (typeof child !== 'string') return child;
      const translated = translate(child, language);
      if (translated !== child) changed = true;
      return translated;
    });
    return changed ? next : children;
  }

  return children;
};

export const hasTranslation = (value) => Boolean(AR_EN[value]);

export default translate;
