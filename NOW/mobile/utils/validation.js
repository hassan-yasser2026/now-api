import {
  DEFAULT_COUNTRY_CODE,
  getCountry,
  splitInternational,
} from '../constants/countries.js';

const ARABIC_INDIC = '٠١٢٣٤٥٦٧٨٩';
const EASTERN_ARABIC_INDIC = '۰۱۲۳۴۵۶۷۸۹';

/** Convert Arabic-Indic digits to Western digits so any keyboard works. */
export function toWesternDigits(value) {
  return String(value ?? '').replace(/[٠-٩۰-۹]/g, (char) => {
    const arabicIndex = ARABIC_INDIC.indexOf(char);
    if (arabicIndex > -1) return String(arabicIndex);
    return String(EASTERN_ARABIC_INDIC.indexOf(char));
  });
}

/** Keep only digits (and a leading `+`) from user input. */
export function normalizePhone(phone) {
  const western = toWesternDigits(phone).trim();
  const hasPlus = western.startsWith('+');
  const digits = western.replace(/\D/g, '');
  return hasPlus ? `+${digits}` : digits;
}

/** Remove the national trunk prefix (`0`) users often type. */
export function stripTrunkPrefix(national) {
  return normalizePhone(national).replace(/^\+/, '').replace(/^0+/, '');
}

/** Build an E.164 number from a national number and a country. */
export function toE164(national, countryCode = DEFAULT_COUNTRY_CODE) {
  const country = getCountry(countryCode);
  const digits = stripTrunkPrefix(national);
  if (!digits) return '';
  return `+${country.dial}${digits}`;
}

/** Validate the national part against the selected country's length rules. */
export function isValidNationalNumber(
  national,
  countryCode = DEFAULT_COUNTRY_CODE
) {
  const country = getCountry(countryCode);
  const digits = stripTrunkPrefix(national);
  return digits.length >= country.min && digits.length <= country.max;
}

/** Validate a full international number, inferring its country. */
export function isValidPhone(phone) {
  const value = normalizePhone(phone);
  if (!value.startsWith('+')) return false;

  const parts = splitInternational(value);
  if (!parts) return false;

  return isValidNationalNumber(parts.national, parts.country.code);
}

export function getPhoneCountry(phone) {
  const parts = splitInternational(normalizePhone(phone));
  return parts ? parts.country.code : null;
}

export function getPhoneCountryCode(phone) {
  const parts = splitInternational(normalizePhone(phone));
  return parts ? `+${parts.country.dial}` : null;
}

/** `+201012345678` → `+20 101 234 5678` for display. */
export function formatPhone(phone) {
  const parts = splitInternational(normalizePhone(phone));
  if (!parts) return normalizePhone(phone);

  // Groups of three, with the tail kept together so it never ends on a
  // stray single digit.
  const groups = [];
  let rest = parts.national;
  while (rest.length > 4) {
    groups.push(rest.slice(0, 3));
    rest = rest.slice(3);
  }
  if (rest) groups.push(rest);

  return `+${parts.country.dial} ${groups.join(' ')}`.trim();
}

export function isStrongPassword(password) {
  return (
    typeof password === 'string' &&
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password)
  );
}

export function passwordsMatch(password, confirmPassword) {
  return (
    typeof password === 'string' &&
    typeof confirmPassword === 'string' &&
    password === confirmPassword
  );
}
