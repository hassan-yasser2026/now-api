import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { COLORS } from '../../constants/colors';
import { APP_ROLE_LABEL } from '../../constants/appRole';
import useAppStore from '../../store/appStore';

const RoleMismatchScreen = () => {
  const logout = useAppStore((state) => state.logout);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>الحساب ده لتطبيق مختلف</Text>
        <Text style={styles.description}>
          سجّل الخروج، ثم افتح تطبيق چودي ستار الخاص بـ{APP_ROLE_LABEL}.
        </Text>
        <TouchableOpacity onPress={logout} style={styles.button}>
          <Text style={styles.buttonText}>تسجيل الخروج</Text>
        </TouchableOpacity>
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
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    padding: 24,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  description: {
    marginTop: 12,
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 23,
    textAlign: 'center',
  },
  button: {
    minWidth: 180,
    alignItems: 'center',
    marginTop: 22,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 13,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
});

export default RoleMismatchScreen;
