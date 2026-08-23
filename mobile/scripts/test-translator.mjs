/**
 * Smoke test for the runtime translator.
 *
 * Usage: node scripts/test-translator.mjs
 */
import { translate, translateChildren } from '../utils/translator.js';

const cases = [
  // exact dictionary hits across every panel
  ['تسجيل الدخول', 'Log in'],
  ['إدارة المستخدمين', 'User management'],
  ['لوحة تحكم المتجر', 'Store dashboard'],
  ['أرباحي', 'My earnings'],
  ['تفاصيل الطلب', 'Order details'],
  ['المشرفين الفرعيين', 'Sub-admins'],
  ['اللغة والدولة', 'Language & country'],

  // interpolated templates
  ['أهلاً محمد', 'Welcome محمد'],
  ['تم استلام طلبك رقم #42', 'We received your order #42'],
  ['هل تريد قبول الطلب #7 وتعيينه لك؟', 'Accept order #7 and assign it to you?'],
  ['اسم الصنف يجب ألا يتجاوز 60 حرف', 'Item name must not exceed 60 characters'],
  ['120.00 ج.م', 'EGP 120.00'],

  // untouched content
  ['NOW', 'NOW'],
  ['+201012345678', '+201012345678'],
];

let failures = 0;

for (const [input, expected] of cases) {
  const actual = translate(input, 'en');
  const ok = actual === expected;
  if (!ok) failures += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${JSON.stringify(input)} -> ${JSON.stringify(actual)}`);
  if (!ok) console.log(`      expected ${JSON.stringify(expected)}`);
}

// Arabic must pass through untouched.
if (translate('تسجيل الدخول', 'ar') !== 'تسجيل الدخول') {
  failures += 1;
  console.log('FAIL  Arabic pass-through');
}

// Mixed children arrays.
const children = translateChildren(['الإجمالي', ' ', '250'], 'en');
if (children[0] !== 'Total') {
  failures += 1;
  console.log('FAIL  translateChildren array');
}

console.log(`\n${cases.length + 2 - failures} passed, ${failures} failed`);
process.exitCode = failures > 0 ? 1 : 0;
