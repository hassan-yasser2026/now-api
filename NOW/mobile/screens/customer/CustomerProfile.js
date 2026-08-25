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