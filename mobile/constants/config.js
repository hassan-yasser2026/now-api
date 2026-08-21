// التكوينات العامة لتطبيق NOW

export const CONFIG = {
  APP_NAME_AR: 'ناو',
  APP_NAME_EN: 'NOW',
  APP_NAME: 'ناو',

  APP_VERSION: '1.0.0',

  // رابط الـ API — يُستبدل عبر متغير البيئة EXPO_PUBLIC_API_URL
  API_URL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api',

  API_TIMEOUT: 30000,

  MAX_RETRY_ATTEMPTS: 3,

  // اللغة الافتراضية
  DEFAULT_LANGUAGE: 'ar',
  SUPPORTED_LANGUAGES: ['ar', 'en'],

  // بيانات الدعم
  SUPPORT_EMAIL: 'support@nowdelivery.com',
  SUPPORT_PHONE: '+201000000000',
  SUPPORT_WHATSAPP: '+201000000000',

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