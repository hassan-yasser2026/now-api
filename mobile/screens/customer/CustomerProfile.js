import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import useAppStore from '../../store/appStore';

const CustomerProfile = ({ navigation }) => {
  const { user, isGuest, logout } = useAppStore();

  const handleLogout = () => {
    Alert.alert('تسجيل الخروج', 'هل أنت متأكد من تسجيل الخروج؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'تسجيل الخروج', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const menuItems = [
    { icon: 'person-outline', label: 'البيانات الشخصية', onPress: () => Alert.alert('قريباً', 'سيتم إضافة هذه الميزة قريباً') },
    { icon: 'card-outline', label: 'طرق الدفع', onPress: () => Alert.alert('قريباً', 'سيتم إضافة هذه الميزة قريباً') },
    { icon: 'location-outline', label: 'العناوين', onPress: () => Alert.alert('قريباً', 'سيتم إضافة هذه الميزة قريباً') },
    { icon: 'bag-outline', label: 'طلباتي', onPress: () => navigation.navigate('Orders') },
    { icon: 'heart-outline', label: 'المفضلة', onPress: () => navigation.navigate('Favorites') },
    { icon: 'settings-outline', label: 'الإعدادات', onPress: () => navigation.navigate('Settings') },
    { icon: 'help-circle-outline', label: 'الدعم', onPress: () => navigation.navigate('About') },
  ];

  // شاشة الزائر
  if (isGuest) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={28} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>الملف الشخصي</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.guestContainer}>
          <View style={styles.guestIconWrap}>
            <Ionicons name="person-circle-outline" size={80} color={COLORS.textLight} />
          </View>
          <Text style={styles.guestTitle}>أنت تتصفح كزائر</Text>
          <Text style={styles.guestSubtitle}>
            سجل دخولك للوصول إلى ملفك الشخصي وتتبع طلباتك وإدارة حسابك
          </Text>

          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.85}
          >
            <Ionicons name="log-in-outline" size={22} color="#fff" />
            <Text style={styles.loginBtnText}>تسجيل الدخول</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.registerBtn}
            onPress={() => navigation.navigate('Register', { initialRole: 'customer' })}
            activeOpacity={0.85}
          >
            <Text style={styles.registerBtnText}>إنشاء حساب جديد مجاناً</Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>أو</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.partnerBtn}
            onPress={() => navigation.navigate('PartnerJoin')}
            activeOpacity={0.85}
          >
            <Ionicons name="briefcase-outline" size={20} color={COLORS.primary} />
            <Text style={styles.partnerBtnText}>انضم كشريك (بائع أو مندوب)</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={28} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>الملف الشخصي</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'U'}</Text>
          </View>
          <Text style={styles.userName}>{user?.name || 'مستخدم'}</Text>
          <Text style={styles.userPhone}>{user?.phone}</Text>
        </View>

        <View style={styles.menu}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={item.onPress}
            >
              <Ionicons name={item.icon} size={24} color={COLORS.textPrimary} />
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color={COLORS.error} />
          <Text style={styles.logoutText}>تسجيل الخروج</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary },

  // Guest styles
  guestContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  guestIconWrap: {
    marginBottom: 20,
  },
  guestTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 10,
  },
  guestSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
    maxWidth: 280,
  },
  loginBtn: {
    width: '100%',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 15,
    gap: 10,
    marginBottom: 12,
  },
  loginBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#fff',
  },
  registerBtn: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  registerBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  partnerBtn: {
    width: '100%',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FCE7F3',
    borderRadius: 16,
    paddingVertical: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#F9A8D4',
  },
  partnerBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary,
  },

  // Authenticated styles
  content: { padding: 16 },
  profileHeader: { alignItems: 'center', marginBottom: 24 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
  userName: { fontSize: 22, fontWeight: 'bold', color: COLORS.textPrimary },
  userPhone: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  menu: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  menuLabel: { flex: 1, fontSize: 16, color: COLORS.textPrimary, marginLeft: 14 },
  logoutBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 24, paddingVertical: 16, borderWidth: 1, borderColor: COLORS.error, borderRadius: 12 },
  logoutText: { color: COLORS.error, fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
});

export default CustomerProfile;
