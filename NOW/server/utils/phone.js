/**
 * Country-aware phone helpers.
 *
 * The mobile app submits E.164 numbers (`+201012345678`), while accounts
 * created before multi-country support stored national numbers
 * (`01012345678`). Lookups therefore match on every equivalent form.
 */

// Dial codes supported by the mobile country picker, longest first so that
// `+1` never shadows a longer code.
const DIAL_CODES = [
  '1', '7', '20', '27', '30', '31', '32', '33', '34', '36', '39', '40', '41',
  '43', '44', '45', '46', '47', '48', '49', '52', '54', '55', '60', '61', '62',
  '63', '64', '65', '66', '81', '82', '84', '86', '90', '91', '92', '93', '94',
  '98', '212', '213', '216', '218', '220', '222', '233', '234', '249', '251',
  '252', '253', '254', '255', '269', '351', '353', '356', '357', '358', '380',
  '420', '852', '880', '960', '961', '962', '963', '964', '965', '966', '967',
  '968', '970', '971', '972', '974', '977', '994', '995', '998',
].sort((a, b) => b.length - a.length);

const ARABIC_INDIC = '٠١٢٣٤٥٦٧٨٩';
const EASTERN_ARABIC_INDIC = '۰۱۲۳۴۵۶۷۸۹';

/** Convert Arabic-Indic digits to Western digits. */
function toWesternDigits(value) {
  return String(value ?? '').replace(/[٠-٩۰-۹]/g, (char) => {
    const arabicIndex = ARABIC_INDIC.indexOf(char);
    if (arabicIndex > -1) return String(arabicIndex);
    return String(EASTERN_ARABIC_INDIC.indexOf(char));
  });
}

/** Strip formatting, keeping digits and a leading `+`. */
function normalizePhone(phone) {
  if (typeof phone !== 'string' && typeof phone !== 'number') {
    return '';
  }

  const western = toWesternDigits(phone).trim();
  const hasPlus = western.startsWith('+');
  const digits = western.replace(/\D/g, '');

  if (!digits) return '';

  return hasPlus ? `+${digits}` : digits;
}

/** Split an E.164 number into its dial code and national significant number. */
function splitInternational(phone) {
  const normalized = normalizePhone(phone);
  if (!normalized.startsWith('+')) return null;

  const rest = normalized.slice(1);
  const dial = DIAL_CODES.find((code) => rest.startsWith(code));
  if (!dial) return null;

  return { dial, national: rest.slice(dial.length) };
}

/**
 * All stored forms that should be treated as the same number, so a user who
 * registered before the country picker can still log in.
 */
function phoneVariants(phone) {
  const normalized = normalizePhone(phone);
  if (!normalized) return [];

  const variants = new Set([normalized]);

  const parts = splitInternational(normalized);
  if (parts) {
    variants.add(`${parts.dial}${parts.national}`);
    variants.add(parts.national);
    variants.add(`0${parts.national}`);
  } else {
    // National input: also try it as-is without the trunk prefix.
    const withoutTrunk = normalized.replace(/^0+/, '');
    if (withoutTrunk) variants.add(withoutTrunk);
  }

  return [...variants].filter(Boolean);
}

/** Basic sanity check: E.164 numbers are 8-16 digits including the dial code. */
function isValidPhone(phone) {
  const normalized = normalizePhone(phone);
  if (!normalized) return false;

  const digits = normalized.replace(/^\+/, '');
  if (digits.length < 7 || digits.length > 16) return false;

  if (normalized.startsWith('+')) {
    const parts = splitInternational(normalized);
    return Boolean(parts && parts.national.length >= 6);
  }

  return true;
}

module.exports = {
  DIAL_CODES,
  isValidPhone,
  normalizePhone,
  phoneVariants,
  splitInternational,
  toWesternDigits,
};
