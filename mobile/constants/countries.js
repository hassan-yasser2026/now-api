/**
 * Country metadata for phone numbers.
 *
 * `min` / `max` are the length bounds of the national significant number
 * (what the user types after the dial code, without the trunk `0`).
 */

export const COUNTRIES = [
  // ------------------------------------------------------------- Arab world
  { code: 'EG', dial: '20', flag: '🇪🇬', nameAr: 'مصر', nameEn: 'Egypt', min: 10, max: 10, example: '1012345678' },
  { code: 'SA', dial: '966', flag: '🇸🇦', nameAr: 'السعودية', nameEn: 'Saudi Arabia', min: 9, max: 9, example: '512345678' },
  { code: 'AE', dial: '971', flag: '🇦🇪', nameAr: 'الإمارات', nameEn: 'United Arab Emirates', min: 9, max: 9, example: '501234567' },
  { code: 'KW', dial: '965', flag: '🇰🇼', nameAr: 'الكويت', nameEn: 'Kuwait', min: 8, max: 8, example: '51234567' },
  { code: 'QA', dial: '974', flag: '🇶🇦', nameAr: 'قطر', nameEn: 'Qatar', min: 8, max: 8, example: '33123456' },
  { code: 'BH', dial: '973', flag: '🇧🇭', nameAr: 'البحرين', nameEn: 'Bahrain', min: 8, max: 8, example: '36123456' },
  { code: 'OM', dial: '968', flag: '🇴🇲', nameAr: 'عمان', nameEn: 'Oman', min: 8, max: 8, example: '92123456' },
  { code: 'JO', dial: '962', flag: '🇯🇴', nameAr: 'الأردن', nameEn: 'Jordan', min: 9, max: 9, example: '791234567' },
  { code: 'LB', dial: '961', flag: '🇱🇧', nameAr: 'لبنان', nameEn: 'Lebanon', min: 7, max: 8, example: '71123456' },
  { code: 'SY', dial: '963', flag: '🇸🇾', nameAr: 'سوريا', nameEn: 'Syria', min: 9, max: 9, example: '944567890' },
  { code: 'IQ', dial: '964', flag: '🇮🇶', nameAr: 'العراق', nameEn: 'Iraq', min: 10, max: 10, example: '7912345678' },
  { code: 'PS', dial: '970', flag: '🇵🇸', nameAr: 'فلسطين', nameEn: 'Palestine', min: 9, max: 9, example: '599123456' },
  { code: 'YE', dial: '967', flag: '🇾🇪', nameAr: 'اليمن', nameEn: 'Yemen', min: 9, max: 9, example: '712345678' },
  { code: 'LY', dial: '218', flag: '🇱🇾', nameAr: 'ليبيا', nameEn: 'Libya', min: 9, max: 9, example: '912345678' },
  { code: 'SD', dial: '249', flag: '🇸🇩', nameAr: 'السودان', nameEn: 'Sudan', min: 9, max: 9, example: '911231234' },
  { code: 'TN', dial: '216', flag: '🇹🇳', nameAr: 'تونس', nameEn: 'Tunisia', min: 8, max: 8, example: '20123456' },
  { code: 'DZ', dial: '213', flag: '🇩🇿', nameAr: 'الجزائر', nameEn: 'Algeria', min: 9, max: 9, example: '551234567' },
  { code: 'MA', dial: '212', flag: '🇲🇦', nameAr: 'المغرب', nameEn: 'Morocco', min: 9, max: 9, example: '650123456' },
  { code: 'MR', dial: '222', flag: '🇲🇷', nameAr: 'موريتانيا', nameEn: 'Mauritania', min: 8, max: 8, example: '22123456' },
  { code: 'SO', dial: '252', flag: '🇸🇴', nameAr: 'الصومال', nameEn: 'Somalia', min: 7, max: 9, example: '712345678' },
  { code: 'DJ', dial: '253', flag: '🇩🇯', nameAr: 'جيبوتي', nameEn: 'Djibouti', min: 8, max: 8, example: '77831001' },
  { code: 'KM', dial: '269', flag: '🇰🇲', nameAr: 'جزر القمر', nameEn: 'Comoros', min: 7, max: 7, example: '3212345' },

  // ----------------------------------------------------------------- Africa
  { code: 'NG', dial: '234', flag: '🇳🇬', nameAr: 'نيجيريا', nameEn: 'Nigeria', min: 10, max: 10, example: '8021234567' },
  { code: 'KE', dial: '254', flag: '🇰🇪', nameAr: 'كينيا', nameEn: 'Kenya', min: 9, max: 9, example: '712123456' },
  { code: 'ET', dial: '251', flag: '🇪🇹', nameAr: 'إثيوبيا', nameEn: 'Ethiopia', min: 9, max: 9, example: '911234567' },
  { code: 'GH', dial: '233', flag: '🇬🇭', nameAr: 'غانا', nameEn: 'Ghana', min: 9, max: 9, example: '231234567' },
  { code: 'TZ', dial: '255', flag: '🇹🇿', nameAr: 'تنزانيا', nameEn: 'Tanzania', min: 9, max: 9, example: '621234567' },
  { code: 'ZA', dial: '27', flag: '🇿🇦', nameAr: 'جنوب أفريقيا', nameEn: 'South Africa', min: 9, max: 9, example: '711234567' },

  // ------------------------------------------------------------------- Asia
  { code: 'TR', dial: '90', flag: '🇹🇷', nameAr: 'تركيا', nameEn: 'Türkiye', min: 10, max: 10, example: '5012345678' },
  { code: 'IR', dial: '98', flag: '🇮🇷', nameAr: 'إيران', nameEn: 'Iran', min: 10, max: 10, example: '9123456789' },
  { code: 'AF', dial: '93', flag: '🇦🇫', nameAr: 'أفغانستان', nameEn: 'Afghanistan', min: 9, max: 9, example: '701234567' },
  { code: 'PK', dial: '92', flag: '🇵🇰', nameAr: 'باكستان', nameEn: 'Pakistan', min: 10, max: 10, example: '3012345678' },
  { code: 'IN', dial: '91', flag: '🇮🇳', nameAr: 'الهند', nameEn: 'India', min: 10, max: 10, example: '9123456789' },
  { code: 'BD', dial: '880', flag: '🇧🇩', nameAr: 'بنغلاديش', nameEn: 'Bangladesh', min: 10, max: 10, example: '1812345678' },
  { code: 'LK', dial: '94', flag: '🇱🇰', nameAr: 'سريلانكا', nameEn: 'Sri Lanka', min: 9, max: 9, example: '712345678' },
  { code: 'NP', dial: '977', flag: '🇳🇵', nameAr: 'نيبال', nameEn: 'Nepal', min: 10, max: 10, example: '9841234567' },
  { code: 'ID', dial: '62', flag: '🇮🇩', nameAr: 'إندونيسيا', nameEn: 'Indonesia', min: 9, max: 12, example: '812345678' },
  { code: 'MY', dial: '60', flag: '🇲🇾', nameAr: 'ماليزيا', nameEn: 'Malaysia', min: 9, max: 10, example: '123456789' },
  { code: 'SG', dial: '65', flag: '🇸🇬', nameAr: 'سنغافورة', nameEn: 'Singapore', min: 8, max: 8, example: '81234567' },
  { code: 'TH', dial: '66', flag: '🇹🇭', nameAr: 'تايلاند', nameEn: 'Thailand', min: 9, max: 9, example: '812345678' },
  { code: 'VN', dial: '84', flag: '🇻🇳', nameAr: 'فيتنام', nameEn: 'Vietnam', min: 9, max: 9, example: '912345678' },
  { code: 'PH', dial: '63', flag: '🇵🇭', nameAr: 'الفلبين', nameEn: 'Philippines', min: 10, max: 10, example: '9051234567' },
  { code: 'CN', dial: '86', flag: '🇨🇳', nameAr: 'الصين', nameEn: 'China', min: 11, max: 11, example: '13123456789' },
  { code: 'HK', dial: '852', flag: '🇭🇰', nameAr: 'هونغ كونغ', nameEn: 'Hong Kong', min: 8, max: 8, example: '51234567' },
  { code: 'JP', dial: '81', flag: '🇯🇵', nameAr: 'اليابان', nameEn: 'Japan', min: 10, max: 10, example: '9012345678' },
  { code: 'KR', dial: '82', flag: '🇰🇷', nameAr: 'كوريا الجنوبية', nameEn: 'South Korea', min: 9, max: 10, example: '1023456789' },
  { code: 'IL', dial: '972', flag: '🇮🇱', nameAr: 'إسرائيل', nameEn: 'Israel', min: 9, max: 9, example: '502345678' },
  { code: 'AZ', dial: '994', flag: '🇦🇿', nameAr: 'أذربيجان', nameEn: 'Azerbaijan', min: 9, max: 9, example: '401234567' },
  { code: 'GE', dial: '995', flag: '🇬🇪', nameAr: 'جورجيا', nameEn: 'Georgia', min: 9, max: 9, example: '555123456' },
  { code: 'UZ', dial: '998', flag: '🇺🇿', nameAr: 'أوزبكستان', nameEn: 'Uzbekistan', min: 9, max: 9, example: '911234567' },

  // ---------------------------------------------------------------- Europe
  { code: 'GB', dial: '44', flag: '🇬🇧', nameAr: 'بريطانيا', nameEn: 'United Kingdom', min: 10, max: 10, example: '7400123456' },
  { code: 'IE', dial: '353', flag: '🇮🇪', nameAr: 'أيرلندا', nameEn: 'Ireland', min: 9, max: 9, example: '850123456' },
  { code: 'FR', dial: '33', flag: '🇫🇷', nameAr: 'فرنسا', nameEn: 'France', min: 9, max: 9, example: '612345678' },
  { code: 'DE', dial: '49', flag: '🇩🇪', nameAr: 'ألمانيا', nameEn: 'Germany', min: 10, max: 11, example: '15123456789' },
  { code: 'IT', dial: '39', flag: '🇮🇹', nameAr: 'إيطاليا', nameEn: 'Italy', min: 9, max: 10, example: '3123456789' },
  { code: 'ES', dial: '34', flag: '🇪🇸', nameAr: 'إسبانيا', nameEn: 'Spain', min: 9, max: 9, example: '612345678' },
  { code: 'PT', dial: '351', flag: '🇵🇹', nameAr: 'البرتغال', nameEn: 'Portugal', min: 9, max: 9, example: '912345678' },
  { code: 'NL', dial: '31', flag: '🇳🇱', nameAr: 'هولندا', nameEn: 'Netherlands', min: 9, max: 9, example: '612345678' },
  { code: 'BE', dial: '32', flag: '🇧🇪', nameAr: 'بلجيكا', nameEn: 'Belgium', min: 9, max: 9, example: '470123456' },
  { code: 'CH', dial: '41', flag: '🇨🇭', nameAr: 'سويسرا', nameEn: 'Switzerland', min: 9, max: 9, example: '781234567' },
  { code: 'AT', dial: '43', flag: '🇦🇹', nameAr: 'النمسا', nameEn: 'Austria', min: 10, max: 11, example: '6641234567' },
  { code: 'SE', dial: '46', flag: '🇸🇪', nameAr: 'السويد', nameEn: 'Sweden', min: 9, max: 9, example: '701234567' },
  { code: 'NO', dial: '47', flag: '🇳🇴', nameAr: 'النرويج', nameEn: 'Norway', min: 8, max: 8, example: '40612345' },
  { code: 'DK', dial: '45', flag: '🇩🇰', nameAr: 'الدنمارك', nameEn: 'Denmark', min: 8, max: 8, example: '32123456' },
  { code: 'FI', dial: '358', flag: '🇫🇮', nameAr: 'فنلندا', nameEn: 'Finland', min: 9, max: 10, example: '412345678' },
  { code: 'PL', dial: '48', flag: '🇵🇱', nameAr: 'بولندا', nameEn: 'Poland', min: 9, max: 9, example: '512345678' },
  { code: 'CZ', dial: '420', flag: '🇨🇿', nameAr: 'التشيك', nameEn: 'Czechia', min: 9, max: 9, example: '601123456' },
  { code: 'RO', dial: '40', flag: '🇷🇴', nameAr: 'رومانيا', nameEn: 'Romania', min: 9, max: 9, example: '712034567' },
  { code: 'GR', dial: '30', flag: '🇬🇷', nameAr: 'اليونان', nameEn: 'Greece', min: 10, max: 10, example: '6912345678' },
  { code: 'CY', dial: '357', flag: '🇨🇾', nameAr: 'قبرص', nameEn: 'Cyprus', min: 8, max: 8, example: '96123456' },
  { code: 'RU', dial: '7', flag: '🇷🇺', nameAr: 'روسيا', nameEn: 'Russia', min: 10, max: 10, example: '9123456789' },
  { code: 'UA', dial: '380', flag: '🇺🇦', nameAr: 'أوكرانيا', nameEn: 'Ukraine', min: 9, max: 9, example: '501234567' },

  // --------------------------------------------------------------- Americas
  { code: 'US', dial: '1', flag: '🇺🇸', nameAr: 'الولايات المتحدة', nameEn: 'United States', min: 10, max: 10, example: '2015550123' },
  { code: 'CA', dial: '1', flag: '🇨🇦', nameAr: 'كندا', nameEn: 'Canada', min: 10, max: 10, example: '5062345678' },
  { code: 'MX', dial: '52', flag: '🇲🇽', nameAr: 'المكسيك', nameEn: 'Mexico', min: 10, max: 10, example: '2221234567' },
  { code: 'BR', dial: '55', flag: '🇧🇷', nameAr: 'البرازيل', nameEn: 'Brazil', min: 10, max: 11, example: '11961234567' },
  { code: 'AR', dial: '54', flag: '🇦🇷', nameAr: 'الأرجنتين', nameEn: 'Argentina', min: 10, max: 10, example: '1123456789' },

  // ---------------------------------------------------------------- Oceania
  { code: 'AU', dial: '61', flag: '🇦🇺', nameAr: 'أستراليا', nameEn: 'Australia', min: 9, max: 9, example: '412345678' },
  { code: 'NZ', dial: '64', flag: '🇳🇿', nameAr: 'نيوزيلندا', nameEn: 'New Zealand', min: 8, max: 10, example: '211234567' },
];

export const DEFAULT_COUNTRY_CODE = 'EG';

const BY_CODE = COUNTRIES.reduce((map, country) => {
  map[country.code] = country;
  return map;
}, {});

export const getCountry = (code) =>
  BY_CODE[String(code || '').toUpperCase()] || BY_CODE[DEFAULT_COUNTRY_CODE];

export const getCountryName = (country, language) =>
  language === 'en' ? country.nameEn : country.nameAr;

/** Dial codes ordered longest-first so `+1` never shadows `+1...` variants. */
const DIALS_BY_LENGTH = [...COUNTRIES].sort(
  (a, b) => b.dial.length - a.dial.length
);

export const findCountryByDial = (dial) =>
  DIALS_BY_LENGTH.find((country) => country.dial === String(dial)) || null;

/** Split an E.164 number into its country and national part. */
export const splitInternational = (value) => {
  const digits = String(value || '').replace(/[^\d+]/g, '');
  if (!digits.startsWith('+')) return null;

  const withoutPlus = digits.slice(1);
  for (const country of DIALS_BY_LENGTH) {
    if (withoutPlus.startsWith(country.dial)) {
      return {
        country,
        national: withoutPlus.slice(country.dial.length),
      };
    }
  }

  return null;
};

export const searchCountries = (query, language) => {
  const term = String(query || '').trim().toLowerCase();
  if (!term) return COUNTRIES;

  return COUNTRIES.filter((country) => {
    const dial = `+${country.dial}`;
    return (
      country.nameAr.toLowerCase().includes(term) ||
      country.nameEn.toLowerCase().includes(term) ||
      country.code.toLowerCase().includes(term) ||
      dial.includes(term) ||
      country.dial.includes(term.replace('+', ''))
    );
  }).sort((a, b) =>
    getCountryName(a, language).localeCompare(
      getCountryName(b, language),
      language === 'en' ? 'en' : 'ar'
    )
  );
};

export default COUNTRIES;
