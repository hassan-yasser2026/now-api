import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import useAppStore from '../../store/appStore';
import { authService } from '../../services/authService';

const AdminDashboard = ({ navigation }) => {
  const { user } = useAppStore();
  const [refreshing, setRefreshing] = useState(false);

  const stats = [
    { label: 'المستخدمين', value: 128, icon: 'people-outline', color: COLORS.primary },
    { label: 'المتاجر', value: 45, icon: 'storefront-outline', color: COLORS.secondary },
    { label: 'الطلبات', value: 320, icon: 'bag-outline', color: COLORS.warning },
    { label: 'المندوبين', value: 18, icon: 'bicycle-outline', color: COLORS.success },
  ];

  const menuItems = [
    { label: 'إدارة المستخدمين', icon: 'people-outline', screen: 'UsersManagement' },
    { label: 'إدارة المتاجر', icon: 'storefront-outline', screen: 'StoresManagement' },
    { label: 'إدارة الطلبات', icon: 'bag-outline', screen: 'OrdersManagement' },
    { label: 'إدارة المندوبين', icon: 'bicycle-outline', screen: 'DeliveryManagement' },
    { label: 'المشرفين الفرعيين', icon: 'person-add-outline', screen: 'SubAdminsManagement' },
    { label: 'التقارير', icon: 'bar-chart-outline', screen: 'Reports' },
  ];

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleLogout = async () => {
    await authService.logout();
    navigation.replace('Login');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>مرحباً {user?.name || 'مدير'} 👨‍💼</Text>
          <Text style={styles.subGreeting}>لوحة التحكم الرئيسية</Text>
        </View>
        <TouchableOpacity onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={28} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        <View style={styles.statsGrid}>
          {stats.map((stat, index) => (
            <View key={index} style={[styles.statCard, { borderLeftColor: stat.color }]}>
              <View style={styles.statHeader}>
                <Ionicons name={stat.icon} size={24} color={stat.color} />
                <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
              </View>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.menuGrid}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuCard}
              onPress={() => navigation.navigate(item.screen)}
            >
              <View style={styles.menuIcon}>
                <Ionicons name={item.icon} size={28} color={COLORS.primary} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity onPress={() => navigation.navigate('About')} style={styles.aboutLink}>
          <Text style={styles.aboutText}>ℹ️ حول التطبيق</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  greeting: { fontSize: 22, fontWeight: 'bold', color: COLORS.textPrimary },
  subGreeting: { fontSize: 14, color: COLORS.textSecondary, marginTop: 2 },
  content: { padding: 16 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  statCard: { width: '48%', backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, borderLeftWidth: 4, marginBottom: 12 },
  statHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: 'bold' },
  statLabel: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  menuGrid: { gap: 8 },
  menuCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 8 },
  menuIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  menuLabel: { flex: 1, fontSize: 16, color: COLORS.textPrimary },
  aboutLink: { paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  aboutText: { color: COLORS.primary, fontSize: 16, fontWeight: '600' },
});

export default AdminDashboard;