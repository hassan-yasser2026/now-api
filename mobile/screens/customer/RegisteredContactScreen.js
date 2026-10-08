import React from 'react';
import { Alert, Linking, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

import useAppStore from '../../store/appStore';

const RegisteredContactScreen = () => {
  const phone = useAppStore((state) => state.user?.phone);

  const callContact = async () => {
    if (!phone) {
      Alert.alert('رقم التواصل', 'لا يوجد رقم هاتف مسجل لهذا الحساب.');
      return;
    }

    try {
      await Linking.openURL(`tel:${phone}`);
    } catch {
      Alert.alert('رقم التواصل', `رقم الهاتف المسجل: ${phone}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <View style={styles.icon}>
          <Ionicons name="call-outline" size={34} color={COLORS.primary} />
        </View>
        <Text style={styles.title}>رقم التواصل المسجل</Text>
        <Text style={styles.label}>رقم الهاتف المرتبط بحسابك</Text>
        <Text style={styles.phone}>{phone || 'غير متوفر'}</Text>
        {phone && (
          <TouchableOpacity style={styles.button} onPress={callContact}>
            <Ionicons name="call" size={20} color={COLORS.white} />
            <Text style={styles.buttonText}>اتصال</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 20 },
  card: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 28,
    marginTop: 36,
  },
  icon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryLight,
  },
  title: { marginTop: 18, fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  label: { marginTop: 10, fontSize: 14, color: COLORS.secondaryText },
  phone: { marginTop: 10, fontSize: 22, fontWeight: '800', color: COLORS.primary },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
  },
  buttonText: { color: COLORS.white, fontSize: 16, fontWeight: '800' },
});

export default RegisteredContactScreen;
// مسودة المشروع - البشمهندس حسن ياسر
