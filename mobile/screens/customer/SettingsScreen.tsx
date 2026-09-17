import React, { useState, useEffect } from 'react';
import {
  Image,
  Switch,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../../constants/colors';
import useAppStore from '../../store/appStore';
import { getTranslations } from '../../constants/i18n';
import { getCountry } from '../../constants/countries';
import CountryPickerModal from '../../components/CountryPickerModal';
import api from '../../services/api';

type Language = 'ar' | 'en';

type SettingsScreenProps = {
  navigation?: {
    navigate: (screen: string) => void;
    goBack?: () => void;
  };
};

const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const language = useAppStore((state) => state.language) as Language;
  const setLanguage = useAppStore((state) => state.setLanguage);
  const country = useAppStore((state) => state.country);
  const setCountry = useAppStore((state) => state.setCountry);
  const logout = useAppStore((state) => state.logout);
  const user = useAppStore((state) => state.user);
  const isGuest = useAppStore((state) => state.isGuest);
  const isRTL = language === 'ar';
  const [t, setT] = useState(() => getTranslations(language));
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    setT(getTranslations(language));
  }, [language]);

  useEffect(() => {
    AsyncStorage.getItem('notificationsEnabled').then((value) => {
      if (value !== null) {
        setNotificationsEnabled(value === 'true');
      }
    }).catch((error) => {
      console.error('Error loading notification preference:', error);
    });
  }, []);

  const toggleNotifications = async (enabled: boolean) => {
    setNotificationsEnabled(enabled);
    try {
      await AsyncStorage.setItem('notificationsEnabled', String(enabled));
      await api.patch('/notifications/preferences', { enabled });
    } catch (error) {
      setNotificationsEnabled(!enabled);
      console.error('Error saving notification preference:', error);
    }
  };

  const showComingSoon = () => {
    Alert.alert(t.settings.title, t.settings.comingSoon, [
      { text: t.common.close, style: 'cancel' },
    ]);
  };

  const handleLanguageChange = (lang: Language) => {
    if (lang === language) return;

    Alert.alert(
      t.settings.language,
      lang === 'ar' ? t.settings.changeToArabic : t.settings.changeToEnglish,
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.common.confirm,
          onPress: async () => {
            await setLanguage(lang);
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      t.settings.logout,
      t.settings.signOutMessage,
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.common.confirm,
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  const userDisplayName = user?.name || t.settings.guest;
  const userMeta = user?.phone || 'NOW Customer';

  if (isGuest) {
    return (
      <GuestAccountView
        language={language}
        setLanguage={setLanguage}
        country={country}
        setCountry={setCountry}
        navigation={navigation}
        isRTL={isRTL}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.hero}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation?.goBack?.()}
            activeOpacity={0.8}
          >
            <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.heroText}>
            <Text style={[styles.headerBadge, isRTL && styles.rtlText]}>
              {t.settings.account}
            </Text>
            <Text style={[styles.headerTitle, isRTL && styles.rtlText]}>
              {t.settings.title}
            </Text>
            <Text style={[styles.heroSubtitle, isRTL && styles.rtlText]}>
              {userDisplayName}
            </Text>
          </View>
          <View style={styles.heroIcon}>
            <Ionicons name="settings-outline" size={28} color="#fff" />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
            {t.settings.account}
          </Text>

          <TouchableOpacity
            style={[styles.profileCard, isRTL && styles.profileCardRTL]}
            onPress={() => navigation?.navigate('CustomerProfile')}
            activeOpacity={0.8}
          >
            <View style={[styles.avatar, isRTL && styles.avatarRTL]}>
              <Text style={styles.avatarText}>
                {userDisplayName.charAt(0).toUpperCase()}
              </Text>
            </View>

            <View style={[styles.profileInfo, isRTL && styles.profileInfoRTL]}>
              <Text style={[styles.userName, isRTL && styles.rtlText]}>
                {userDisplayName}
              </Text>
              <Text style={[styles.userMeta, isRTL && styles.rtlText]}>
                {userMeta}
              </Text>
            </View>

            <Ionicons
              name={isRTL ? 'chevron-back' : 'chevron-forward'}
              size={20}
              color={COLORS.secondaryText}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
            {t.settings.language}
          </Text>

          <TouchableOpacity
            accessibilityRole="button"
            style={[
              styles.languageCard,
              language === 'ar' && styles.languageCardActive,
            ]}
            onPress={() => handleLanguageChange('ar')}
          >
            <View style={[styles.languageInfo, isRTL && styles.languageInfoRTL]}>
              <View style={styles.flagBadge}>
                <Ionicons name="flag-outline" size={22} color={COLORS.primary} />
              </View>
              <View style={styles.languageTexts}>
                <Text style={[styles.languageName, isRTL && styles.rtlText]}>
                  {t.settings.arabic}
                </Text>
                <Text style={[styles.languageSubtext, isRTL && styles.rtlText]}>
                  العربية (RTL)
                </Text>
              </View>
            </View>
            {language === 'ar' && (
              <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            style={[
              styles.languageCard,
              language === 'en' && styles.languageCardActive,
            ]}
            onPress={() => handleLanguageChange('en')}
          >
            <View style={[styles.languageInfo, isRTL && styles.languageInfoRTL]}>
              <View style={styles.flagBadge}>
                <Ionicons name="flag-outline" size={22} color={COLORS.primary} />
              </View>
              <View style={styles.languageTexts}>
                <Text style={[styles.languageName, isRTL && styles.rtlText]}>
                  {t.settings.english}
                </Text>
                <Text style={[styles.languageSubtext, isRTL && styles.rtlText]}>
                  English (LTR)
                </Text>
              </View>
            </View>
            {language === 'en' && (
              <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
            {t.settings.about}
          </Text>

          <View style={[styles.supportCard, isRTL && styles.supportCardRTL]}>
            <Ionicons
              name="notifications-outline"
              size={20}
              color={COLORS.primary}
            />
            <View style={[styles.supportTextWrap, isRTL && styles.supportTextWrapRTL]}>
              <Text style={[styles.supportText, isRTL && styles.rtlText]}>
                {t.settings.notifications}
              </Text>
              <Text style={[styles.supportValue, isRTL && styles.rtlText]}>
                {t.settings.notificationsEnabled}
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={toggleNotifications}
              trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
              thumbColor={notificationsEnabled ? COLORS.primary : '#fff'}
            />
          </View>
          <TouchableOpacity
            style={[styles.supportCard, isRTL && styles.supportCardRTL]}
            onPress={() => navigation?.navigate('CustomerNotifications')}
          >
            <Ionicons name="list-outline" size={20} color={COLORS.primary} />
            <Text style={[styles.supportText, isRTL && styles.rtlText]}>
              {t.settings.notifications}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.supportCard, isRTL && styles.supportCardRTL]}
            onPress={showComingSoon}
          >
            <Ionicons name="location-outline" size={20} color={COLORS.primary} />
            <Text style={[styles.supportText, isRTL && styles.rtlText]}>
              {t.settings.addresses}
            </Text>
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={COLORS.secondaryText} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.supportCard, isRTL && styles.supportCardRTL]}
            onPress={showComingSoon}
          >
            <Ionicons name="card-outline" size={20} color={COLORS.primary} />
            <Text style={[styles.supportText, isRTL && styles.rtlText]}>
              {t.settings.payment}
            </Text>
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={COLORS.secondaryText} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.supportCard, isRTL && styles.supportCardRTL]}
            onPress={showComingSoon}
          >
            <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.success} />
            <Text style={[styles.supportText, isRTL && styles.rtlText]}>
              {t.settings.privacy}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.supportCard, isRTL && styles.supportCardRTL]}>
            <Ionicons name="information-circle-outline" size={20} color={COLORS.warning} />
            <Text style={[styles.supportText, isRTL && styles.rtlText]}>
              {t.settings.version}
            </Text>
            <Text style={styles.versionText}>{t.settings.appVersion}</Text>
          </TouchableOpacity>
        </View>

        {!isGuest && (
          <TouchableOpacity
            accessibilityRole="button"
            style={[styles.logoutButton, isRTL && styles.logoutButtonRTL]}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={18} color={COLORS.error} />
            <Text style={[styles.logoutText, isRTL && styles.rtlText]}>
              {t.settings.logout}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const GuestAccountView = ({
  language,
  setLanguage,
  country,
  setCountry,
  navigation,
  isRTL,
}: {
  language: Language;
  setLanguage: (language: Language) => Promise<void> | void;
  country: string;
  setCountry: (country: string) => Promise<void> | void;
  navigation?: SettingsScreenProps['navigation'];
  isRTL: boolean;
}) => {
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);
  const openSocial = (url: string) => Linking.openURL(url).catch(() => {
    Alert.alert('NOW', 'تعذر فتح الرابط');
  });

  const changeLanguage = async (nextLanguage: Language) => {
    if (nextLanguage !== language) await setLanguage(nextLanguage);
  };

  return (
    <SafeAreaView style={styles.guestContainer}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.guestContent}>
        <View style={styles.guestBanner}>
          <Image source={require('../../assets/images/now-logo.png')} style={styles.guestLogo} resizeMode="contain" />
          <Text style={styles.guestBannerTitle}>أكثر من 100 مليون منتج</Text>
          <Text style={styles.guestBannerSubtitle}>من ماركات عالمية</Text>
          <Text style={styles.guestBannerCaption}>نوصل لك كل يوم باب جديد</Text>
        </View>

        <TouchableOpacity
          style={styles.guestLoginButton}
          onPress={() => navigation?.navigate('Login')}
          activeOpacity={0.8}
        >
          <Ionicons name="log-in-outline" size={24} color="#fff" />
          <Text style={styles.guestLoginText}>تسجيل الدخول / إنشاء حساب</Text>
        </TouchableOpacity>

        <View style={styles.guestSettingCard}>
          <View style={styles.guestSettingRow}>
            <Ionicons name="language-outline" size={24} color={COLORS.textSecondary} />
            <Text style={styles.guestSettingLabel}>اللغة</Text>
            <View style={styles.languageToggle}>
              <TouchableOpacity onPress={() => changeLanguage('en')} style={language === 'en' ? styles.languageActive : styles.languageOption}>
                <Text style={language === 'en' ? styles.languageActiveText : styles.languageOptionText}>English</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => changeLanguage('ar')} style={language === 'ar' ? styles.languageActive : styles.languageOption}>
                <Text style={language === 'ar' ? styles.languageActiveText : styles.languageOptionText}>العربية</Text>
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity
            style={styles.guestSettingRow}
            onPress={() => setCountryPickerVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="earth-outline" size={24} color={COLORS.textSecondary} />
            <Text style={styles.guestSettingLabel}>البلد</Text>
            <Text style={styles.countryValue}>
              {getCountry(country).flag} {getCountry(country).nameAr}
            </Text>
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.socialRow}>
          {[
            ['logo-facebook', 'https://www.facebook.com/share/1HgLvQ7ies/'],
            ['logo-tiktok', 'https://www.tiktok.com/@nowmart1?_r=1&_t=ZS-99YyjqdHnZk'],
            ['logo-youtube', 'https://www.youtube.com/@now-mart'],
            ['logo-instagram', 'https://www.instagram.com/nowmart1/'],
          ].map(([icon, url]) => (
            <TouchableOpacity key={icon} onPress={() => openSocial(url)} style={styles.socialButton} activeOpacity={0.75}>
              <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={30} color={COLORS.primary} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.guestAccountNav}>
        {[
          ['account', 'حسابي', 'person-outline'],
          ['partner', 'انضم كشريك', 'hand-left-outline'],
          ['home', 'الرئيسية', 'home-outline'],
          ['orders', 'طلباتك', 'receipt-outline'],
          ['about', 'عني', 'information-circle-outline'],
        ].map(([key, label, icon]) => (
          <TouchableOpacity
            key={key}
            style={styles.guestNavItem}
            onPress={() => {
              if (key === 'home') navigation?.goBack?.();
              if (key === 'partner') navigation?.navigate('PartnerRegistration');
              if (key === 'orders') navigation?.navigate('Login');
              if (key === 'about') navigation?.navigate('About');
            }}
            activeOpacity={0.7}
          >
            <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={21} color={key === 'account' ? COLORS.primary : COLORS.textSecondary} />
            <Text style={[styles.guestNavText, key === 'account' && styles.guestNavActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <CountryPickerModal
        visible={countryPickerVisible}
        selectedCode={country}
        onSelect={(selected) => setCountry(selected.code)}
        onClose={() => setCountryPickerVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  hero: {
    backgroundColor: '#0B8FA3',
    borderRadius: 24,
    padding: 18,
    marginBottom: 22,
    minHeight: 145,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
    position: 'absolute',
    top: 16,
    zIndex: 1,
  },
  heroText: {
    marginTop: 46,
  },
  heroIcon: {
    position: 'absolute',
    right: 18,
    bottom: 18,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  headerBadge: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#E8FCFF',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
  },
  heroSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginTop: 5,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: 12,
  },
  profileCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2EEF0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  userMeta: {
    fontSize: 12,
    color: COLORS.secondaryText,
  },
  languageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2EEF0',
  },
  languageCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  languageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  flagBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  languageTexts: {
    gap: 2,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  languageSubtext: {
    fontSize: 12,
    color: COLORS.secondaryText,
  },
  supportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2EEF0',
  },
  supportTextWrap: {
    flex: 1,
  },
  supportText: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '600',
  },
  supportValue: {
    fontSize: 12,
    color: COLORS.secondaryText,
    marginTop: 2,
  },
  versionText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '700',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    borderRadius: 14,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginTop: 8,
  },
  logoutText: {
    fontSize: 15,
    color: COLORS.error,
    fontWeight: '700',
  },
  rtlText: {
    textAlign: 'right',
  },
  profileCardRTL: {
    flexDirection: 'row-reverse',
  },
  avatarRTL: {
    marginRight: 0,
    marginLeft: 12,
  },
  profileInfoRTL: {
    alignItems: 'flex-end',
  },
  languageInfoRTL: {
    flexDirection: 'row-reverse',
  },
  supportCardRTL: {
    flexDirection: 'row-reverse',
  },
  supportTextWrapRTL: {
    alignItems: 'flex-end',
  },
  logoutButtonRTL: {
    flexDirection: 'row-reverse',
  },
  guestContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  guestContent: {
    padding: 16,
    paddingBottom: 100,
  },
  guestBanner: {
    alignItems: 'center',
    minHeight: 340,
    justifyContent: 'center',
    padding: 24,
    borderRadius: 18,
    backgroundColor: '#08C7E8',
    borderWidth: 5,
    borderColor: '#fff',
    marginBottom: 18,
  },
  guestLogo: {
    width: 220,
    height: 100,
    marginBottom: 16,
  },
  guestBannerTitle: {
    color: '#fff',
    fontSize: 27,
    fontWeight: '900',
    textAlign: 'center',
  },
  guestBannerSubtitle: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '900',
    marginTop: 4,
  },
  guestBannerCaption: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    marginTop: 12,
  },
  guestLoginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 17,
    borderRadius: 20,
    backgroundColor: '#111',
    marginBottom: 18,
  },
  guestLoginText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
  },
  guestSettingCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 18,
  },
  guestSettingRow: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F5',
  },
  guestSettingLabel: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '800',
    marginRight: 'auto',
  },
  languageToggle: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 22,
    backgroundColor: '#F1F3F6',
  },
  languageOption: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 18,
  },
  languageActive: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  languageOptionText: { color: COLORS.textSecondary, fontSize: 12 },
  languageActiveText: { color: COLORS.text, fontSize: 12, fontWeight: '800' },
  countryValue: { color: COLORS.textSecondary, fontSize: 15 },
  socialRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 18,
    maxWidth: 360,
    alignSelf: 'center',
    paddingVertical: 8,
  },
  socialButton: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#E9FAFF',
  },
  guestAccountNav: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    height: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 8,
  },
  guestNavItem: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  guestNavText: { color: COLORS.textSecondary, fontSize: 10, fontWeight: '700' },
  guestNavActive: { color: COLORS.primary, fontWeight: '900' },
});

export default SettingsScreen;
// مسودة المشروع - البشمهندس حسن ياسر