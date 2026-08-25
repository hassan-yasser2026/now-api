import React, { useState, useEffect, useRef } from 'react';
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
import { orderService } from '../../services/orderService';

const VendorDashboard = ({ navigation }) => {
  const { user, logout } = useAppStore();
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, preparing: 0, completed: 0, revenue: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();
    return () => { mountedRef.current = false; };
  }, []);

  const fetchData = async () => {
    try {
      const ordersResult = await orderService.getVendorOrders(user?.id);

      if (!mountedRef.current) return;

      if (ordersResult.success) {
        const data = ordersResult.orders || [];
        setOrders(data.slice(0, 5));
        const deliveredOrders = data.filter((order) => order.status === 'DELIVERED');
        setStats({
          total: data.length,
          pending: data.filter((order) => order.status === 'PENDING').length,
          preparing: data.filter((order) => order.status === 'PREPARING').length,
          completed: deliveredOrders.length,
          revenue: deliveredOrders.reduce((total, order) => total + Number(order.totalPrice || 0), 0),
        });
      }
    } catch { /* silent */ }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    await logout();
  };

  const statCards = [
    { label: 'الطلبات', value: stats.total, icon: 'bag-outline', color: COLORS.primary },
    { label: 'قيد الانتظار', value: stats.pending, icon: 'time-outline', color: COLORS.warning },
    { label: 'قيد التحضير', value: stats.preparing, icon: 'cafe-outline', color: COLORS.secondary },
    { label: 'الإيرادات', value: `${stats.revenue} ج.م`, icon: 'cash-outline', color: COLORS.success },
  ];

  const statusColors = {
    PENDING: COLORS.warning,
    ACCEPTED: COLORS.primary,
    PREPARING: COLORS.secondary,
    READY: COLORS.success,
    PICKED_UP: COLORS.primary,
    ON_THE_WAY: COLORS.primary,
    DELIVERED: COLORS.success,
    CANCELLED: COLORS.error,
  };

  const statusText = {
    PENDING: 'قيد الانتظار',
    ACCEPTED: 'تم القبول',
    PREPARING: 'قيد التحضير',
    READY: 'جاهز للاستلام',
    PICKED_UP: 'تم الاستلام',
    ON_THE_WAY: 'في الطريق',
    DELIVERED: 'تم التوصيل',
    CANCELLED: 'ملغي',
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>مرحباً {user?.name || 'بائع'} 🏪</Text>
          <Text style={styles.subGreeting}>لوحة تحكم المتجر</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => navigation.navigate('VendorProfile')} style={styles.headerBtn}>
            <Ionicons name="person-circle-outline" size={32} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.headerBtn}>
            <Ionicons name="log-out-outline" size={28} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        <View style={styles.statsGrid}>
          {statCards.map((stat, index) => (
            <View key={index} style={[styles.statCard, { borderLeftColor: stat.color }]}>
              <View style={styles.statHeader}>
                <Ionicons name={stat.icon} size={24} color={stat.color} />
                <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
              </View>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>الطلبات الأخيرة</Text>
          {orders.slice(0, 5).map((order) => (
            <TouchableOpacity
              key={order.id}
              style={styles.orderCard}
              onPress={() => navigation.navigate('VendorOrderDetails', { orderId: order.id, order })}
            >
              <View style={styles.orderHeader}>
                <Text style={styles.orderId}>طلب #{order.id}</Text>
                <Text style={[styles.orderStatus, { color: statusColors[order.status] || COLORS.textSecondary }]}>
                  {statusText[order.status] || order.status}
                </Text>
              </View>
              <Text style={styles.orderCustomer}>👤 {order.customerName}</Text>
              <Text style={styles.orderTotal}>💵 {order.totalPrice} ج.م</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('VendorMenu')}
          >
            <Ionicons name="restaurant-outline" size={28} color={COLORS.primary} />
            <Text style={styles.actionText}>إدارة المنيو</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('VendorOrders')}
          >
            <Ionicons name="bag-outline" size={28} color={COLORS.secondary} />
            <Text style={styles.actionText}>الطلبات</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('StoreSettings')}
          >
            <Ionicons name="settings-outline" size={28} color={COLORS.warning} />
            <Text style={styles.actionText}>إعدادات المتجر</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('About')}
          >
            <Ionicons name="information-circle-outline" size={28} color={COLORS.primary} />
            <Text style={styles.actionText}>حول التطبيق</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  greeting: { fontSize: 22, fontWeight: 'bold', color: COLORS.textPrimary },
  subGreeting: { fontSize: 14, color: COLORS.textSecondary, marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  headerBtn: { marginLeft: 12 },
  content: { padding: 16 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  statCard: { width: '48%', backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, borderLeftWidth: 4, marginBottom: 12 },
  statHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: 'bold' },
  statLabel: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 12 },
  orderCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 8 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderId: { fontSize: 15, fontWeight: 'bold', color: COLORS.textPrimary },
  orderStatus: { fontSize: 13, fontWeight: 'bold' },
  orderCustomer: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  orderTotal: { fontSize: 15, fontWeight: 'bold', color: COLORS.primary, marginTop: 4 },
  quickActions: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 8 },
  actionBtn: { alignItems: 'center', padding: 16, backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, flex: 0.45 },
  actionText: { fontSize: 14, color: COLORS.textPrimary, marginTop: 8 },
});

export default VendorDashboard;
