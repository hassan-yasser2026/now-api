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
  const { user, logout } = useAppStore();

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
              <Ionicons name={item.icon} size={24} color={COLORS.primary} />
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
    backgroundColor: '#08C6E8',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 21, fontWeight: '900', color: '#fff' },
  content: { paddingBottom: 30 },
  profileHeader: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 26,
    backgroundColor: '#08C6E8',
  },
  avatar: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 32, fontWeight: '900', color: '#08C6E8' },
  userName: { fontSize: 23, fontWeight: '900', color: '#fff' },
  userPhone: { fontSize: 14, color: 'rgba(255,255,255,0.9)', marginTop: 4 },
  menu: {
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2EEF0',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#0C6A78',
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 17,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF5F6',
  },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginLeft: 14 },
  logoutBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 18,
    paddingVertical: 15,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: 16,
  },
  logoutText: { color: COLORS.error, fontSize: 15, fontWeight: '800', marginLeft: 8 },
});

export default CustomerProfile;