/**
 * Verifies that the global patch translates the props of the components it
 * targets, leaves everything else alone, and is a no-op in Arabic.
 *
 * Usage: node scripts/test-global-translation.mjs
 */
import {
  createAlertTranslator,
  createPropsTranslator,
} from '../utils/propsTranslator.js';

// Stand-ins for the real react-native components.
const Text = { name: 'Text' };
const TextInput = { name: 'TextInput' };
const Button = { name: 'Button' };
const View = { name: 'View' };

let language = 'en';
const translateProps = createPropsTranslator({
  Text,
  TextInput,
  Button,
  getLanguage: () => language,
});
const translateAlert = createAlertTranslator(() => language);

let failures = 0;
const check = (label, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${label} -> ${JSON.stringify(actual)}`);
  if (!ok) console.log(`      expected ${JSON.stringify(expected)}`);
};

// Text children, in every shape a screen can produce.
check(
  'Text string child',
  translateProps(Text, { children: 'إدارة الطلبات' }).children,
  'Order management'
);
check(
  'Text mixed children',
  translateProps(Text, { children: ['الإجمالي', ': ', '250'] }).children,
  ['Total', ': ', '250']
);
check(
  'Text with element child untouched',
  translateProps(Text, { children: { type: 'Icon' } }).children,
  { type: 'Icon' }
);

// TextInput placeholders and Button titles.
check(
  'TextInput placeholder',
  translateProps(TextInput, { placeholder: 'ابحث عن صنف...' }).placeholder,
  'Search for an item...'
);
check(
  'Button title',
  translateProps(Button, { title: 'حفظ الإعدادات' }).title,
  'Save settings'
);

// Non-text components pass through by identity.
const viewProps = { children: 'إدارة الطلبات' };
check('View props untouched', translateProps(View, viewProps) === viewProps, true);
check('null props', translateProps(Text, null), null);

// Alerts.
const alertArgs = translateAlert('تنبيه', 'من فضلك أدخل رقم الهاتف', [
  { text: 'إلغاء', style: 'cancel' },
  { text: 'تأكيد' },
]);
check('Alert title', alertArgs.title, 'Notice');
check('Alert message', alertArgs.message, 'Please enter your phone number');
check('Alert buttons', alertArgs.buttons.map((b) => b.text), ['Cancel', 'Confirm']);

// Arabic is a pass-through: the same props object comes back.
language = 'ar';
const arabicProps = { children: 'إدارة الطلبات' };
check('Arabic no-op', translateProps(Text, arabicProps) === arabicProps, true);
check('Arabic alert no-op', translateAlert('تنبيه', 'رسالة').title, 'تنبيه');

console.log(`\n${failures === 0 ? 'all passed' : `${failures} failed`}`);
process.exitCode = failures > 0 ? 1 : 0;
