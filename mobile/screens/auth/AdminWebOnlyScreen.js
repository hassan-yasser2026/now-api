import React, { useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { COLORS } from '../../constants/colors';
import { CONFIG } from '../../constants/config';
import useAppStore from '../../store/appStore';

const AdminWebOnlyScreen = () => {
  const logout = useAppStore((state) => state.logout);
  const [opening, setOpening] = useState(false);

  const openAdminWebsite = async () => {
    try {
      setOpening(true);
      await Linking.openURL(CONFIG.ADMIN_DASHBOARD_URL);
      await logout();
    } catch (error) {
      console.error('ADMIN WEBSITE OPEN ERROR:', error);
      Alert.alert(
        'تعذر فتح لوحة الإدارة',
        'تأكد من اتصال الإنترنت وحاول مرة أخرى.',
      );
    } finally {
      setOpening(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.brandMark}>
          <Text style={styles.brandLetter}>N</Text>
        </View>
        <Text style={styles.eyebrow}>مساحة الإدارة</Text>
        <Text style={styles.title}>لوحة الأدمن أصبحت على الويب</Text>
        <Text style={styles.description}>
          لإدارة المنصة، افتح موقع الإدارة المستقل. سيتم تسجيل خروجك من تطبيق
          الموبايل بعد فتح الموقع حفاظًا على فصل الجلسات.
        </Text>
        <Pressable
          accessibilityRole="button"
          disabled={opening}
          onPress={openAdminWebsite}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.buttonPressed,
            opening && styles.buttonDisabled,
          ]}
        >
          <Text style={styles.primaryButtonText}>
            {opening ? 'جارٍ فتح الموقع...' : 'فتح لوحة الإدارة'}
          </Text>
          {!opening && <Text style={styles.externalIcon}>↗</Text>}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={logout}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.secondaryPressed,
          ]}
        >
          <Text style={styles.secondaryButtonText}>تسجيل الخروج</Text>
        </Pressable>
        <Text style={styles.url}>{CONFIG.ADMIN_DASHBOARD_URL}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    padding: 22,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 26,
    paddingVertical: 32,
  },
  brandMark: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: COLORS.primary,
  },
  brandLetter: {
    color: COLORS.white,
    fontSize: 29,
    fontWeight: '900',
  },
  eyebrow: {
    marginTop: 22,
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    marginTop: 10,
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  description: {
    marginTop: 13,
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 24,
    textAlign: 'center',
  },
  primaryButton: {
    width: '100%',
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 26,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  externalIcon: {
    color: COLORS.white,
    fontSize: 17,
  },
  buttonPressed: {
    backgroundColor: COLORS.primaryDark,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  secondaryButton: {
    width: '100%',
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  secondaryButtonText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryPressed: {
    backgroundColor: COLORS.background,
  },
  url: {
    marginTop: 19,
    color: COLORS.textLight,
    fontSize: 10,
    textAlign: 'center',
  },
});

export default AdminWebOnlyScreen;
