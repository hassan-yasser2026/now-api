import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { COLORS } from '../../constants/colors';

const OPTIONS = [
  {
    role: 'vendor',
    title: 'تسجيل دخول بائع',
    subtitle: 'إدارة متجرك ومنتجاتك',
    icon: 'storefront-outline',
    color: '#0B8FA3',
  },
  {
    role: 'delivery',
    title: 'تسجيل دخول مندوب',
    subtitle: 'إدارة طلبات التوصيل والرحلات',
    icon: 'bicycle-outline',
    color: '#2563EB',
  },
];

const PartnerEntryScreen = ({ navigation }) => (
  <View style={styles.container}>
    <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
      <Ionicons name="arrow-forward" size={24} color={COLORS.textPrimary} />
    </TouchableOpacity>
    <Text style={styles.title}>انضم كشريك</Text>
    <Text style={styles.subtitle}>اختار القسم الخاص بحسابك</Text>

    {OPTIONS.map((option) => (
      <View key={option.role} style={[styles.card, { borderColor: `${option.color}45` }]}>
        <View style={[styles.icon, { backgroundColor: `${option.color}18` }]}>
          <Ionicons name={option.icon} size={42} color={option.color} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.cardTitle}>{option.title}</Text>
          <Text style={styles.cardSubtitle}>{option.subtitle}</Text>
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: option.color }]}
              onPress={() => navigation.navigate('PartnerLogin', { role: option.role })}
            >
              <Text style={styles.primaryText}>تسجيل الدخول</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: option.color }]}
              onPress={() => navigation.navigate('PartnerRegistration', { role: option.role })}
            >
              <Text style={[styles.secondaryText, { color: option.color }]}>تسجيل جديد</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    ))}

  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 22, paddingTop: 60 },
  back: { alignSelf: 'flex-start', padding: 8 },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.textPrimary, textAlign: 'center', marginTop: 12 },
  subtitle: { color: COLORS.textSecondary, textAlign: 'center', marginTop: 8, marginBottom: 24 },
  card: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 20, padding: 16, marginBottom: 16, backgroundColor: COLORS.white },
  icon: { width: 76, height: 76, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  copy: { flex: 1 },
  cardTitle: { fontSize: 19, fontWeight: '800', color: COLORS.textPrimary },
  cardSubtitle: { color: COLORS.textSecondary, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  primaryButton: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12 },
  primaryText: { color: COLORS.white, fontWeight: '700' },
  secondaryButton: { borderWidth: 1, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 12 },
  secondaryText: { fontWeight: '700' },
  support: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 18, gap: 8 },
  supportText: { color: COLORS.primary, fontWeight: '700' },
});

export default PartnerEntryScreen;
// مسودة المشروع - البشمهندس حسن ياسر
