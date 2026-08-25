const translations = {
  ar: {
    appName: 'ناو',

    common: {
      cancel: 'إلغاء',
      save: 'حفظ',
      delete: 'حذف',
      back: 'رجوع',
      close: 'إغلاق',
      confirm: 'تأكيد',
      loading: 'جاري التحميل...',
      retry: 'إعادة المحاولة',
      search: 'بحث',
    },

    auth: {
      login: 'تسجيل الدخول',
      register: 'إنشاء حساب',
      phone: 'رقم الهاتف',
      password: 'كلمة المرور',
      confirmPassword: 'تأكيد كلمة المرور',
      strongPassword:
        '8 أحرف على الأقل + حرف كبير + حرف صغير + رقم + رمز خاص',
      joinPartner: 'انضم كشريك',
    },

    roles: {
      customer: 'عميل',
      vendor: 'بائع',
      delivery: 'مندوب',
      admin: 'مدير',
    },

    customer: {
      welcome: 'أهلاً بك 👋',
      stores: 'المتاجر المتاحة',
      order: 'اطلب الآن',
      closed: 'مغلق',
      open: 'مفتوح',
      cart: 'السلة',
      tracking: 'تتبع الطلب',
    },

    settings: {
      title: 'الإعدادات',
      language: 'اللغة',
      arabic: 'العربية',
      english: 'English',
      support: 'الدعم الفني',
      whatsapp: 'تواصل معنا عبر واتساب',
      email: 'البريد الإلكتروني',
      notifications: 'الإشعارات',
      privacy: 'الخصوصية والأمان',
      account: 'الحساب',
      about: 'عن التطبيق',
      version: 'الإصدار',
      guest: 'وضع الضيف',
      logout: 'تسجيل الخروج',
      changeToArabic: 'سيتم تغيير اللغة إلى العربية',
      changeToEnglish: 'سيتم تغيير اللغة إلى الإنجليزية',
      supportMessage: 'هل تريد التواصل مع فريق NOW؟',
      signOutMessage: 'هل أنت متأكد أنك تريد تسجيل الخروج؟',
      appVersion: 'v1.0.0',
    },

    assistant: {
      title: 'مساعد ناو',
      online: 'متاح الآن',
      placeholder: 'اكتب رسالتك...',
    },
  },

  en: {
    appName: 'NOW',

    common: {
      cancel: 'Cancel',
      save: 'Save',
      delete: 'Delete',
      back: 'Back',
      close: 'Close',
      confirm: 'Confirm',
      loading: 'Loading...',
      retry: 'Retry',
      search: 'Search',
    },

    auth: {
      login: 'Login',
      register: 'Register',
      phone: 'Phone number',
      password: 'Password',
      confirmPassword: 'Confirm password',
      strongPassword:
        'At least 8 chars + uppercase + lowercase + number + special character',
      joinPartner: 'Join as Partner',
    },

    roles: {
      customer: 'Customer',
      vendor: 'Vendor',
      delivery: 'Delivery',
      admin: 'Admin',
    },

    customer: {
      welcome: 'Welcome 👋',
      stores: 'Available Stores',
      order: 'Order Now',
      closed: 'Closed',
      open: 'Open',
      cart: 'Cart',
      tracking: 'Track Order',
    },

    settings: {
      title: 'Settings',
      language: 'Language',
      arabic: 'العربية',
      english: 'English',
      support: 'Support',
      whatsapp: 'Contact us on WhatsApp',
      email: 'Email',
      notifications: 'Notifications',
      privacy: 'Privacy & Security',
      account: 'Account',
      about: 'About',
      version: 'Version',
      guest: 'Guest mode',
      logout: 'Log out',
      changeToArabic: 'Language will change to Arabic',
      changeToEnglish: 'Language will change to English',
      supportMessage: 'Would you like to contact the NOW team?',
      signOutMessage: 'Are you sure you want to sign out?',
      appVersion: 'v1.0.0',
    },

    assistant: {
      title: 'NOW Assistant',
      online: 'Online',
      placeholder: 'Write your message...',
    },
  },
};

export const getTranslations = (
  language = 'ar'
) => {
  return (
    translations[language] ||
    translations.ar
  );
};

export default translations;