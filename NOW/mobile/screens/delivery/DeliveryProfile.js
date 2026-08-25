import React, { useState, useEffect } from 'react';
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
import deliveryService from '../../services/deliveryService';

const DeliveryProfile = ({ navigation }) => {
  const { user, logout } = useAppStore();
  const [stats, setStats] = useState({ todayOrders: 0, totalOrders: 0, rating: 0 });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await deliveryService.getProfile();
        const profile = data?.data ?? data;
        if (profile) {
          setStats({
            todayOrders: profile.todayOrders ?? 0,
            totalOrders: profile.totalOrders ?? 0,
            rating: profile.rating ?? 0,
          });
        }
      } catch {
        // keep defaults
      }
    };
    loadProfile();
  }, []);

  const handleLogout = () => {
    Alert.alert('تسجيل الخروج', 'هل أنت متأكد من تسجيل الخروج؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'تسجيل الخروج', style: 'destructive', onPress: () => logout() },
    ]);
  };

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
            <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'D'}</Text>
          </View>
          <Text style={styles.userName}>{user?.name || 'مندوب'}</Text>
          <Text style={styles.userPhone}>{user?.phone}</Text>
          <View style={styles.badge}>
            <Ionicons name="bicycle-outline" size={16} color="#fff" />
            <Text style={styles.badgeText}>مندوب نشط</Text>
          </View>
        </View>

        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.todayOrders}</Text>
            <Text style={styles.statLabel}>طلبات اليوم</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalOrders}</Text>
            <Text style={styles.statLabel}>إجمالي الطلبات</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.rating > 0 ? stats.rating.toFixed(1) : '—'}</Text>
            <Text style={styles.statLabel}>التقييم</Text>
          </View>
        </View>

        <View style={styles.menu}>
          <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert('قريباً', 'سيتم إضافة هذه الميزة')}>
            <Ionicons name="card-outline" size={24} color={COLORS.textPrimary} />
            <Text style={styles.menuLabel}>الأرباح</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('DeliveryOrders')}>
            <Ionicons name="bag-outline" size={24} color={COLORS.textPrimary} />
            <Text style={styles.menuLabel}>طلباتي</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert('قريباً', 'سيتم إضافة هذه الميزة')}>
            <Ionicons name="location-outline" size={24} color={COLORS.textPrimary} />
            <Text style={styles.menuLabel}>المناطق المغطاة</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('About')}>
            <Ionicons name="help-circle-outline" size={24} color={COLORS.textPrimary} />
            <Text style={styles.menuLabel}>الدعم والمساعدة</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
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
  badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginTop: 8 },
  badgeText: { fontSize: 12, color: '#fff', marginLeft: 4 },
  stats: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 20 },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: 'bold', color: COLORS.textPrimary },
  statLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  statDivider: { width: 1, backgroundColor: COLORS.border },
  menu: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  menuLabel: { flex: 1, fontSize: 16, color: COLORS.textPrimary, marginLeft: 14 },
  logoutBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 24, paddingVertical: 16, borderWidth: 1, borderColor: COLORS.error, borderRadius: 12 },
  logoutText: { color: COLORS.error, fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
});

export default DeliveryProfile;