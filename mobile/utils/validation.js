import {
  parsePhoneNumberFromString,
  getCountryCallingCode,
} from 'libphonenumber-js';

export function normalizePhone(phone) {
  return String(phone || '')
    .replace(/[\s()-]/g, '');
}

export function isValidPhone(phone) {
  const cleaned = normalizePhone(phone);
  const parsed = parsePhoneNumberFromString(cleaned);
  return parsed ? parsed.isValid() : false;
}

export function getPhoneCountry(phone) {
  const cleaned = normalizePhone(phone);
  const parsed = parsePhoneNumberFromString(cleaned);
  return parsed ? parsed.country : null;
}

export function getPhoneCountryCode(phone) {
  const cleaned = normalizePhone(phone);
  const parsed = parsePhoneNumberFromString(cleaned);
  return parsed ? `+${parsed.countryCallingCode}` : null;
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