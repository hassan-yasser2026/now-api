import React from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import useAppStore from '../../store/appStore';

const DeliveryMore = ({ navigation }) => {
  const { logout } = useAppStore();

  const items = [
    { label: 'الملف الشخصي', icon: 'person-outline', route: 'DeliveryProfile' },
    { label: 'إعدادات الحساب', icon: 'settings-outline', route: 'AccountSettings' },
    { label: 'طلباتي', icon: 'clipboard-outline', route: 'DeliveryOrders' },
    { label: 'الأرباح', icon: 'wallet-outline', route: 'DeliveryEarnings' },
    { label: 'تقييمات العملاء', icon: 'star-outline', route: 'DeliveryRatings' },
    { label: 'الإشعارات', icon: 'notifications-outline', route: 'DeliveryNotifications' },
    { label: 'حول التطبيق', icon: 'information-circle-outline', route: 'About' },
  ];

  const openSupport = async () => {
    try {
      await Linking.openURL('https://wa.me/201067254988?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D8%8C%20%D8%A3%D8%AD%D8%AA%D8%A7%D8%AC%20%D9%85%D8%B3%D8%A7%D8%B9%D8%AF%D8%A9');
    } catch {
      Alert.alert('الدعم', 'رقم الدعم: 01067254988');
    }
  };

  const confirmLogout = () => {
    Alert.alert('تسجيل الخروج', 'هل أنت متأكد من تسجيل الخروج؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'تسجيل الخروج', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} accessibilityLabel="رجوع">
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>المزيد</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>إدارة حسابك وخدمات المندوب</Text>
        <View style={styles.menu}>
          {items.map((item) => (
            <TouchableOpacity key={item.label} style={styles.menuItem} onPress={() => navigation.navigate(item.route)}>
              <Ionicons name={item.icon} size={23} color={COLORS.primary} />
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.menuItem} onPress={openSupport}>
            <Ionicons name="headset-outline" size={23} color={COLORS.primary} />
            <Text style={styles.menuLabel}>الدعم 01067254988</Text>
            <Ionicons name="call-outline" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={confirmLogout}>
          <Ionicons name="log-out-outline" size={22} color={COLORS.error} />
          <Text style={styles.logoutText}>تسجيل الخروج</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backButton: { padding: 4 },
  headerSpacer: { width: 32 },
  title: { flex: 1, textAlign: 'center', fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  content: { padding: 16 },
  subtitle: { color: COLORS.textSecondary, textAlign: 'right', marginBottom: 12, fontSize: 14 },
  menu: { backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  menuItem: { flexDirection: 'row-reverse', alignItems: 'center', minHeight: 58, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  menuLabel: { flex: 1, textAlign: 'right', marginHorizontal: 14, color: COLORS.textPrimary, fontSize: 16, fontWeight: '600' },
  logoutButton: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', marginTop: 24, minHeight: 54, borderRadius: 12, borderWidth: 1, borderColor: COLORS.error },
  logoutText: { color: COLORS.error, fontSize: 16, fontWeight: '700', marginRight: 8 },
});

export default DeliveryMore;
