// التكوينات العامة لتطبيق چودي ستار

const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
const isLocalApiUrl = configuredApiUrl
  && /^https?:\/\/(?:localhost|127\.0\.0\.1|10\.0\.2\.2)(?::\d+)?(?:\/|$)/i.test(configuredApiUrl);

export const CONFIG = {
  APP_NAME_AR: 'چودي ستار',
  APP_NAME_EN: 'Goody Star',
  APP_NAME: 'Goody Star (چودي ستار)',

  APP_VERSION: '1.0.0',

  // رابط الـ API — يُستبدل عبر متغير البيئة EXPO_PUBLIC_API_URL
  API_URL: configuredApiUrl && (!isLocalApiUrl || __DEV__)
    ? configuredApiUrl.replace(/\/+$/, '')
    : 'https://api.now-eg.com/api',

  API_TIMEOUT: 30000,

  MAX_RETRY_ATTEMPTS: 3,

  // اللغة الافتراضية
  DEFAULT_LANGUAGE: 'ar',
  SUPPORTED_LANGUAGES: ['ar', 'en'],

  // العملة
  CURRENCY: 'EGP',
  CURRENCY_SYMBOL: 'ج.م',

  // إعدادات الطلب
  ORDER: {
    MIN_QUANTITY: 1,
    MAX_QUANTITY: 99,
    SCHEDULED_ORDERS_ENABLED: true,
    MAX_SCHEDULE_DAYS: 30,
  },

  // إعدادات التوصيل
  DELIVERY: {
    DEFAULT_FEE: 25,
    MAX_DISTANCE_KM: 30,
  },

  // إعدادات Pagination
  PAGINATION: {
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
  },
};
// مسودة المشروع - البشمهندس حسن ياسر