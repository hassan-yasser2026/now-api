import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { orderService } from '../../services/orderService';

const statusMap = {
  ALL: { label: 'الكل', color: COLORS.primary },
  PENDING: { label: 'قيد الانتظار', color: COLORS.warning },
  ACCEPTED: { label: 'مقبول', color: COLORS.primary },
  PREPARING: { label: 'قيد التحضير', color: COLORS.secondary },
  READY: { label: 'جاهز', color: COLORS.success },
  PICKED_UP: { label: 'مع المندوب', color: COLORS.primary },
  ON_THE_WAY: { label: 'في الطريق', color: COLORS.warning },
  DELIVERED: { label: 'تم التوصيل', color: COLORS.success },
  CANCELLED: { label: 'ملغي', color: COLORS.error },
};

type Navigation = {
  navigate: (screen: string, params?: Record<string, unknown>) => void;
};

type OrderItem = {
  name?: string;
  quantity?: number;
};

type Order = {
  id: number | string;
  status?: string;
  totalPrice?: number | string;
  total?: number | string;
  items?: OrderItem[];
  storeName?: string;
  store?: { name?: string };
  createdAt?: string;
  address?: string;
  deliveryAddress?: string;
};

type OrdersScreenProps = {
  navigation: Navigation;
};

type StatusKey = keyof typeof statusMap;

const getErrorMessage = (error: unknown, fallback: string) => {
  return error instanceof Error ? error.message : fallback;
};

const OrdersScreen = ({ navigation }: OrdersScreenProps) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeFilter, setActiveFilter] = useState<StatusKey>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const result = await orderService.getCustomerOrders();
      if (!result.success) {
        throw new Error(result.message || 'فشل تحميل الطلبات');
      }
      setOrders(Array.isArray(result.orders) ? result.orders as Order[] : []);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'حدث خطأ أثناء تحميل الطلبات'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const filteredOrders = useMemo(() => {
    if (activeFilter === 'ALL') {
      return orders;
    }
    return orders.filter((order) => String(order.status || '').toUpperCase() === activeFilter);
  }, [activeFilter, orders]);

  const getStatusInfo = (status?: string) => {
    const normalized = String(status || '').toUpperCase() as StatusKey;
    return statusMap[normalized] || { label: normalized || 'غير معروف', color: COLORS.textSecondary };
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>جاري تحميل الطلبات...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={52} color={COLORS.error} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadOrders}>
          <Text style={styles.retryText}>إعادة المحاولة</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>طلباتي</Text>
      </View>

      <View style={styles.filtersContainer}>
        {(Object.keys(statusMap) as StatusKey[]).map((key) => (
          <TouchableOpacity
            key={key}
            style={[styles.filterChip, activeFilter === key && styles.filterChipActive]}
            onPress={() => setActiveFilter(key)}
          >
            <Text style={[styles.filterText, activeFilter === key && styles.filterTextActive]}>{statusMap[key].label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {filteredOrders.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="receipt-outline" size={52} color={COLORS.inactive} />
          <Text style={styles.emptyText}>لا توجد طلبات في هذا التصنيف</Text>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          contentContainerStyle={styles.list}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => {
            const statusInfo = getStatusInfo(item.status);
            const orderTotal = Number(item.totalPrice || item.total || 0);
            const itemsText = Array.isArray(item.items)
              ? item.items.map((entry: OrderItem) => `${entry.name || 'صنف'} × ${entry.quantity || 1}`).join(' • ')
              : 'لا توجد تفاصيل';

            return (
              <TouchableOpacity style={styles.orderCard} onPress={() => navigation.navigate('OrderTracking', { orderId: item.id })} activeOpacity={0.9}>
                <View style={styles.cardHeader}>
                  <Text style={styles.orderId}>طلب #{item.id}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: `${statusInfo.color}20` }] }>
                    <Ionicons name="time-outline" size={12} color={statusInfo.color} />
                    <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
                  </View>
                </View>

                <View style={styles.storeRow}>
                  <Ionicons name="storefront-outline" size={16} color={COLORS.textSecondary} />
                  <Text style={styles.storeName}>{item.storeName || item.store?.name || 'متجر'}</Text>
                </View>

                <Text style={styles.itemsSummary} numberOfLines={2}>{itemsText}</Text>

                <View style={styles.footerRow}>
                  <View>
                    <Text style={styles.dateText}>{item.createdAt ? new Date(item.createdAt).toLocaleString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'غير محدد'}</Text>
                    <Text style={styles.addressText} numberOfLines={1}>{item.address || item.deliveryAddress || 'العنوان غير محدد'}</Text>
                  </View>
                  <Text style={styles.totalText}>{orderTotal.toFixed(2)} ج.م</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: COLORS.textPrimary },
  filtersContainer: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  filterChip: { backgroundColor: '#fff', borderRadius: 999, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, paddingVertical: 8 },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  filterTextActive: { color: '#fff' },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  orderCard: { backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, padding: 14, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  orderId: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary },
  statusBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, gap: 4 },
  statusText: { fontSize: 11, fontWeight: '800' },
  storeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  storeName: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '700' },
  itemsSummary: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20, marginBottom: 12 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 8 },
  dateText: { fontSize: 11, color: COLORS.textSecondary },
  addressText: { fontSize: 11, color: COLORS.textSecondary, marginTop: 4, maxWidth: 180 },
  totalText: { fontSize: 17, fontWeight: '800', color: COLORS.primary },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  emptyText: { fontSize: 18, fontWeight: '700', color: COLORS.textSecondary, marginTop: 16 },
  retryButton: { marginTop: 18, backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12 },
  retryText: { color: '#fff', fontWeight: '700' },
  errorText: { fontSize: 16, color: COLORS.error, marginTop: 12, textAlign: 'center' },
  loadingText: { marginTop: 12, color: COLORS.textSecondary, fontWeight: '700' },
});

export default OrdersScreen;
