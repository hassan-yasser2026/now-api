import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import useAppStore from '../../store/appStore';
import { orderService } from '../../services/orderService';
import EmptyState from '../../components/EmptyState';

const DeliveryOrders = ({ navigation }) => {
  const { user } = useAppStore();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const result = await orderService.getDeliveryOrders(user?.id);
      if (result.success) {
        setOrders(result.orders || []);
      }
    } catch (e) {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  };

  const getFilteredOrders = () => {
    if (filter === 'all') return orders;
    return orders.filter(o => o.status === filter);
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'PENDING': return 'قيد الانتظار';
      case 'PICKED_UP': return 'تم الاستلام';
      case 'ON_THE_WAY': return 'في الطريق';
      case 'DELIVERED': return 'تم التوصيل';
      case 'CANCELLED': return 'ملغي';
      default: return status;
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'PENDING': return COLORS.warning;
      case 'PICKED_UP': return COLORS.primary;
      case 'ON_THE_WAY': return COLORS.secondary;
      case 'DELIVERED': return COLORS.success;
      case 'CANCELLED': return COLORS.error;
      default: return COLORS.textSecondary;
    }
  };

  const filters = [
    { id: 'all', label: 'الكل' },
    { id: 'PICKED_UP', label: 'في الطريق' },
    { id: 'ON_THE_WAY', label: 'جاري التوصيل' },
    { id: 'DELIVERED', label: 'تم التوصيل' },
  ];

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('DeliveryOrderDetails', { orderId: item.id })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.orderId}>طلب #{item.id}</Text>
        <Text style={[styles.status, { color: getStatusColor(item.status) }]}>
          {getStatusText(item.status)}
        </Text>
      </View>
      <Text style={styles.customer}>👤 {item.customerName}</Text>
      <Text style={styles.address}>📍 {item.address}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.total}>💵 {item.totalPrice} ج.م</Text>
        <Text style={styles.date}>
          {new Date(item.createdAt).toLocaleDateString('ar-EG')}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>جاري تحميل الطلبات...</Text>
      </View>
    );
  }

  const filteredOrders = getFilteredOrders();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={28} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>طلباتي</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.filterContainer}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f.id}
            style={[styles.filterBtn, filter === f.id && styles.filterBtnActive]}
            onPress={() => setFilter(f.id)}
          >
            <Text style={[styles.filterText, filter === f.id && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredOrders}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            icon="bicycle-outline"
            title="لا توجد طلبات"
            message={`لا توجد طلبات ${filter === 'all' ? '' : getStatusText(filter)}`}
          />
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary },
  filterContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  filterBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { fontSize: 14, color: COLORS.textSecondary },
  filterTextActive: { color: '#fff' },
  list: { padding: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, color: COLORS.textSecondary },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  orderId: { fontSize: 16, fontWeight: 'bold', color: COLORS.textPrimary },
  status: { fontSize: 14, fontWeight: 'bold' },
  customer: { fontSize: 15, color: COLORS.textPrimary, marginBottom: 4 },
  address: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 8 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  total: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary },
  date: { fontSize: 12, color: COLORS.textLight },
});

export default DeliveryOrders;