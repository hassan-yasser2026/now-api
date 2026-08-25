// ==========================================
// NOW Theme Colors
// متوافقة مع PRD v3.0
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
    // الألوان الأساسية
    primary: '#EC4899',
    secondary: '#DB2777',

    // الخلفيات والأسطح
    background: '#F8FAFC',
    surface: '#FFFFFF',

    // النصوص
    text: '#111827',
    secondaryText: '#6B7280',

    // الحالات
    success: '#16A34A',
    error: '#DC2626',
    warning: '#F59E0B',
    inactive: '#9CA3AF',

    // الحدود
    border: '#E5E7EB',

    // ألوان إضافية لـ NavigationContainer
    card: '#FFFFFF',
    notification: '#EC4899',
  },
};

export const darkTheme = {
  dark: true,
  fonts: baseFonts,
  colors: {
    // الألوان الأساسية (نفسها في الوضع الداكن)
    primary: '#EC4899',
    secondary: '#DB2777',

    // الخلفيات والأسطح (داكنة)
    background: '#111827',
    surface: '#1F2937',

    // النصوص
    text: '#F9FAFB',
    secondaryText: '#9CA3AF',

    // الحالات (ممكن نفتحها قليلاً للوضوح)
    success: '#22C55E',
    error: '#EF4444',
    warning: '#FBBF24',
    inactive: '#6B7280',

    // الحدود
    border: '#374151',

    // ألوان إضافية لـ NavigationContainer
    card: '#1F2937',
    notification: '#EC4899',
  },
};