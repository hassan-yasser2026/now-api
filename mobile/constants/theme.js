// ==========================================
// Goody Star navigation themes
// ==========================================

const baseFonts = {
  regular: {
    fontFamily: 'system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    fontWeight: '400',
  },
  medium: {
    fontFamily: 'system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    fontWeight: '500',
  },
  bold: {
    fontFamily: 'system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    fontWeight: '700',
  },
};

export const lightTheme = {
  dark: false,
  fonts: baseFonts,
  colors: {
    primary: '#126B57',
    secondary: '#F4B942',
    accent: '#F4B942',

    // الخلفيات والأسطح
    background: '#F8F7F2',
    surface: '#FFFFFF',

    // النصوص
    text: '#18332D',
    secondaryText: '#52635D',

    // الحالات
    success: '#16A34A',
    error: '#DC2626',
    warning: '#F59E0B',
    inactive: '#718078',

    // الحدود
    border: '#E2E5DC',

    // ألوان إضافية لـ NavigationContainer
    card: '#FFFFFF',
    notification: '#F4B942',
  },
};

export const darkTheme = {
  dark: true,
  fonts: baseFonts,
  colors: {
    // لون أخضر أفتح يحافظ على وضوح عناصر التنقل على الخلفية الداكنة.
    primary: '#4CB59A',
    secondary: '#F4B942',
    accent: '#F4B942',

    // الخلفيات والأسطح (داكنة)
    background: '#111827',
    surface: '#1F2937',

    // النصوص
    text: '#F9FAFB',
    secondaryText: '#B8C4BE',

    // الحالات (ممكن نفتحها قليلاً للوضوح)
    success: '#22C55E',
    error: '#EF4444',
    warning: '#FBBF24',
    inactive: '#9CA3AF',

    // الحدود
    border: '#374151',

    // ألوان إضافية لـ NavigationContainer
    card: '#1F2937',
    notification: '#F4B942',
  },
};
// مسودة المشروع - البشمهندس حسن ياسر