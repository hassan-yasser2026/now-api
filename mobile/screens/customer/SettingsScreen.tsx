import React, { useState, useEffect } from 'react';
import {
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
import { COLORS } from '../../constants/colors';
import useAppStore from '../../store/appStore';
import { getTranslations } from '../../constants/i18n';

type Language = 'ar' | 'en';

type SupportType = 'email' | 'whatsapp';
const SUPPORT_EMAIL = 'support@nowdelivery.com';
const WHATSAPP_NUMBER = '966500000000';

const SettingsScreen: React.FC = () => {
  const language = useAppStore((state) => state.language) as Language;
  const setLanguage = useAppStore((state) => state.setLanguage);
  const logout = useAppStore((state) => state.logout);
  const user = useAppStore((state) => state.user);
  const isGuest = useAppStore((state) => state.isGuest);
  const isRTL = language === 'ar';
  const [t, setT] = useState(() => getTranslations(language));

  useEffect(() => {
    setT(getTranslations(language));
  }, [language]);

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

  const openSupport = async (type: SupportType) => {
    try {
      if (type === 'email') {
        const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
          'NOW Support Request'
        )}`;
        await Linking.openURL(mailto);
        return;
      }

      const message = encodeURIComponent('Hello NOW support, I need help.');
      const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert(
        t.settings.support,
        t.settings.supportMessage,
        [{ text: t.common.close, style: 'cancel' }]
      );
    }
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <Text style={[styles.headerBadge, isRTL && styles.rtlText]}>
            {t.settings.account}
          </Text>
          <Text style={[styles.headerTitle, isRTL && styles.rtlText]}>
            {t.settings.title}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
            {t.settings.account}
          </Text>

          <View style={[styles.profileCard, isRTL && styles.profileCardRTL]}>
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
          </View>
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

          <TouchableOpacity style={[styles.supportCard, isRTL && styles.supportCardRTL]}>
            <Ionicons
              name="notifications-outline"
              size={20}
              color={COLORS.primary}
            />
            <Text style={[styles.supportText, isRTL && styles.rtlText]}>
              {t.settings.notifications}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.supportCard, isRTL && styles.supportCardRTL]}>
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

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
            {t.settings.support}
          </Text>

          <TouchableOpacity
            accessibilityRole="button"
            style={[styles.supportCard, isRTL && styles.supportCardRTL]}
            onPress={() => openSupport('email')}
          >
            <Ionicons name="mail-outline" size={20} color={COLORS.secondaryText} />
            <View style={[styles.supportTextWrap, isRTL && styles.supportTextWrapRTL]}>
              <Text style={[styles.supportText, isRTL && styles.rtlText]}>
                {t.settings.email}
              </Text>
              <Text style={[styles.supportValue, isRTL && styles.rtlText]}>
                {SUPPORT_EMAIL}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            style={[styles.supportCard, isRTL && styles.supportCardRTL]}
            onPress={() => openSupport('whatsapp')}
          >
            <Ionicons name="logo-whatsapp" size={20} color={COLORS.success} />
            <View style={[styles.supportTextWrap, isRTL && styles.supportTextWrapRTL]}>
              <Text style={[styles.supportText, isRTL && styles.rtlText]}>
                {t.settings.whatsapp}
              </Text>
              <Text style={[styles.supportValue, isRTL && styles.rtlText]}>
                +966 50 000 0000
              </Text>
            </View>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 18,
  },
  headerBadge: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    color: COLORS.primary,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  profileCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    borderRadius: 14,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    borderRadius: 14,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
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
});

export default SettingsScreen;