import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import EmptyState from '../../components/EmptyState';
import Loading from '../../components/Loading';
import adminService from '../../services/adminService';

const OrdersManagement = ({ navigation }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadOrders = async () => {
    const response = await adminService.getOrders();
    setOrders(response.data);
  };

  useEffect(() => {
    loadOrders()
      .catch(() => Alert.alert('خطأ', 'تعذر تحميل الطلبات'))
      .finally(() => setLoading(false));
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadOrders();
    } catch (error) {
      Alert.alert('خطأ', 'تعذر تحديث الطلبات');
    } finally {
      setRefreshing(false);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'PENDING': return COLORS.warning;
      case 'PREPARING': return COLORS.secondary;
      case 'PICKED_UP':
      case 'ON_THE_WAY': return COLORS.primary;
      case 'DELIVERED': return COLORS.success;
      case 'CANCELLED': return COLORS.error;
      default: return COLORS.textSecondary;
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'PENDING': return 'قيد الانتظار';
      case 'ACCEPTED': return 'تم القبول';
      case 'PREPARING': return 'قيد التحضير';
      case 'READY': return 'جاهز للاستلام';
      case 'PICKED_UP': return 'تم الاستلام';
      case 'ON_THE_WAY': return 'في الطريق';
      case 'DELIVERED': return 'تم التوصيل';
      case 'CANCELLED': return 'ملغي';
      default: return status;
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.orderId}>طلب #{item.id}</Text>
        <Text style={[styles.status, { color: getStatusColor(item.status) }]}>
          {getStatusText(item.status)}
        </Text>
      </View>
      <Text style={styles.customer}>العميل: {item.customer.name}</Text>
      <Text style={styles.store}>المتجر: {item.store.name}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.total}>{Number(item.totalPrice).toFixed(2)} ج.م</Text>
        <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString('ar-EG')}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return <Loading text="جاري تحميل الطلبات..." />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={28} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>إدارة الطلبات</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={orders}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState icon="bag-outline" title="لا توجد طلبات" />
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
  list: { padding: 16 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  orderId: { fontSize: 16, fontWeight: 'bold', color: COLORS.textPrimary },
  status: { fontSize: 14, fontWeight: 'bold' },
  customer: { fontSize: 15, color: COLORS.textPrimary, marginBottom: 4 },
  store: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 8 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  total: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary },
  date: { fontSize: 12, color: COLORS.textLight },
});

export default OrdersManagement;