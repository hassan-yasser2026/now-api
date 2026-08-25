/**
 * Smoke test for multi-country phone handling.
 *
 * Usage: node scripts/test-phone.mjs
 */
import {
  formatPhone,
  isValidNationalNumber,
  isValidPhone,
  normalizePhone,
  toE164,
  toWesternDigits,
} from '../utils/validation.js';
import { getCountry, splitInternational } from '../constants/countries.js';

let failures = 0;

const check = (label, actual, expected) => {
  const ok = actual === expected;
  if (!ok) failures += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${label} -> ${JSON.stringify(actual)}`);
  if (!ok) console.log(`      expected ${JSON.stringify(expected)}`);
};

// Arabic-Indic keyboards
check('toWesternDigits ١٠١٢', toWesternDigits('١٠١٢٣٤٥٦٧٨'), '1012345678');
check('normalizePhone spaced', normalizePhone(' +20 101 234 5678 '), '+201012345678');

// E.164 building, with and without the trunk zero
check('EG with trunk 0', toE164('01012345678', 'EG'), '+201012345678');
check('EG without trunk', toE164('1012345678', 'EG'), '+201012345678');
check('SA', toE164('0512345678', 'SA'), '+966512345678');
check('US', toE164('2015550123', 'US'), '+12015550123');
check('DE', toE164('015123456789', 'DE'), '+4915123456789');

// Country-aware length rules
check('EG valid', isValidNationalNumber('01012345678', 'EG'), true);
check('EG too short', isValidNationalNumber('10123', 'EG'), false);
check('KW valid (8)', isValidNationalNumber('51234567', 'KW'), true);
check('KW rejects EG length', isValidNationalNumber('1012345678', 'KW'), false);

// Full-number validation and country inference
check('isValidPhone EG', isValidPhone('+201012345678'), true);
check('isValidPhone bad dial', isValidPhone('+9991012345678'), false);
check('isValidPhone national only', isValidPhone('01012345678'), false);

const split = splitInternational('+971501234567');
check('split AE dial', split?.country.code, 'AE');
check('split AE national', split?.national, '501234567');

check('formatPhone', formatPhone('+201012345678'), '+20 101 234 5678');
check('getCountry fallback', getCountry('ZZ').code, 'EG');

console.log(`\n${failures === 0 ? 'all passed' : `${failures} failed`}`);
process.exitCode = failures > 0 ? 1 : 0;
