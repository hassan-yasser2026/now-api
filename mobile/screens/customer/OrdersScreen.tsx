import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../constants/colors';
import { orderService } from '../../services/orderService';

const ACCENT = '#08C6E8';

const statusMap = {
  ALL: { label: 'كل الطلبات', color: ACCENT },
  PENDING: { label: 'قيد الانتظار', color: COLORS.warning },
  ACCEPTED: { label: 'مقبول', color: ACCENT },
  PREPARING: { label: 'قيد التحضير', color: '#8B5CF6' },
  READY: { label: 'جاهز', color: COLORS.success },
  PICKED_UP: { label: 'مع المندوب', color: ACCENT },
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

const getErrorMessage = (error: unknown, fallback: string) => (
  error instanceof Error ? error.message : fallback
);

const OrdersScreen = ({ navigation }: OrdersScreenProps) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeFilter, setActiveFilter] = useState<StatusKey>('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadOrders = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
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
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, [loadOrders])
  );

  const filteredOrders = useMemo(() => {
    if (activeFilter === 'ALL') {
      return orders;
    }
    return orders.filter(
      (order) => String(order.status || '').toUpperCase() === activeFilter
    );
  }, [activeFilter, orders]);

  const activeOrders = useMemo(
    () => orders.filter((order) => !['DELIVERED', 'CANCELLED'].includes(
      String(order.status || '').toUpperCase()
    )).length,
    [orders]
  );

  const deliveredOrders = useMemo(
    () => orders.filter((order) => String(order.status || '').toUpperCase() === 'DELIVERED').length,
    [orders]
  );

  const getStatusInfo = (status?: string) => {
    const normalized = String(status || '').toUpperCase() as StatusKey;
    return statusMap[normalized] || { label: normalized || 'غير معروف', color: COLORS.textSecondary };
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={ACCENT} />
        <Text style={styles.loadingText}>جاري تحميل الطلبات...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centered}>
        <View style={styles.errorIcon}>
          <Ionicons name="cloud-offline-outline" size={34} color={ACCENT} />
        </View>
        <Text style={styles.errorTitle}>تعذر تحميل طلباتك</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => loadOrders()}>
          <Text style={styles.retryText}>إعادة المحاولة</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        refreshControl={(
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadOrders(true)}
            tintColor={ACCENT}
            colors={[ACCENT]}
          />
        )}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={(
          <>
            <View style={styles.hero}>
              <View style={styles.heroTopRow}>
                <View>
                  <Text style={styles.brand}>NOW</Text>
                  <Text style={styles.title}>طلباتي</Text>
                  <Text style={styles.subtitle}>تابع كل طلباتك في مكان واحد</Text>
                </View>
                <View style={styles.heroIcon}>
                  <Ionicons name="receipt-outline" size={29} color="#fff" />
                </View>
              </View>
              <View style={styles.heroStats}>
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatValue}>{orders.length}</Text>
                  <Text style={styles.heroStatLabel}>كل الطلبات</Text>
                </View>
                <View style={styles.heroDivider} />
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatValue}>{activeOrders}</Text>
                  <Text style={styles.heroStatLabel}>قيد التنفيذ</Text>
                </View>
                <View style={styles.heroDivider} />
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatValue}>{deliveredOrders}</Text>
                  <Text style={styles.heroStatLabel}>تم التوصيل</Text>
                </View>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>سجل الطلبات</Text>
              <Ionicons name="time-outline" size={20} color={ACCENT} />
            </View>

            <FlatList
              horizontal
              data={(Object.keys(statusMap) as StatusKey[])}
              keyExtractor={(key) => key}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filtersContainer}
              renderItem={({ item: key }) => (
                <TouchableOpacity
                  style={[styles.filterChip, activeFilter === key && styles.filterChipActive]}
                  onPress={() => setActiveFilter(key)}
                >
                  <Text style={[styles.filterText, activeFilter === key && styles.filterTextActive]}>
                    {statusMap[key].label}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </>
        )}
        ListEmptyComponent={(
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="receipt-outline" size={42} color={ACCENT} />
            </View>
            <Text style={styles.emptyTitle}>لا توجد طلبات بعد</Text>
            <Text style={styles.emptyText}>ابدأ التسوق وسيظهر كل طلب هنا تلقائياً</Text>
            <TouchableOpacity style={styles.browseButton} onPress={() => navigation.navigate('CustomerHome')}>
              <Text style={styles.browseText}>تصفح المتاجر</Text>
              <Ionicons name="arrow-back" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
        renderItem={({ item }) => {
          const statusInfo = getStatusInfo(item.status);
          const orderTotal = Number(item.totalPrice || item.total || 0);
          const itemsText = Array.isArray(item.items)
            ? item.items.map((entry) => `${entry.name || 'صنف'} × ${entry.quantity || 1}`).join(' • ')
            : 'لا توجد تفاصيل';

          return (
            <TouchableOpacity
              style={styles.orderCard}
              onPress={() => navigation.navigate('OrderTracking', { orderId: item.id })}
              activeOpacity={0.9}
            >
              <View style={styles.cardHeader}>
                <View style={styles.orderNumberWrap}>
                  <View style={styles.orderIcon}>
                    <Ionicons name="receipt-outline" size={18} color={ACCENT} />
                  </View>
                  <Text style={styles.orderId}>طلب #{item.id}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: `${statusInfo.color}20` }]}>
                  <View style={[styles.statusDot, { backgroundColor: statusInfo.color }]} />
                  <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
                </View>
              </View>

              <View style={styles.storeRow}>
                <Ionicons name="storefront-outline" size={17} color={COLORS.textSecondary} />
                <Text style={styles.storeName}>{item.storeName || item.store?.name || 'متجر'}</Text>
              </View>
              <Text style={styles.itemsSummary} numberOfLines={2}>{itemsText}</Text>

              <View style={styles.footerRow}>
                <View style={styles.dateWrap}>
                  <Text style={styles.dateText}>
                    {item.createdAt
                      ? new Date(item.createdAt).toLocaleString('ar-EG', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                      : 'غير محدد'}
                  </Text>
                  <Text style={styles.addressText} numberOfLines={1}>
                    {item.address || item.deliveryAddress || 'العنوان غير محدد'}
                  </Text>
                </View>
                <View style={styles.totalWrap}>
                  <Text style={styles.totalLabel}>الإجمالي</Text>
                  <Text style={styles.totalText}>{orderTotal.toFixed(2)} ج.م</Text>
                </View>
              </View>
              <View style={styles.trackRow}>
                <Text style={styles.trackText}>عرض التفاصيل والتتبع</Text>
                <Ionicons name="arrow-back" size={16} color={ACCENT} />
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7FBFC' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7FBFC', padding: 24 },
  loadingText: { marginTop: 12, color: COLORS.textSecondary, fontSize: 15, fontWeight: '700' },
  listContent: { paddingBottom: 30 },
  hero: {
    margin: 16,
    padding: 18,
    borderRadius: 24,
    backgroundColor: ACCENT,
    overflow: 'hidden',
  },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  title: { color: '#fff', fontSize: 30, fontWeight: '900', marginTop: 3 },
  subtitle: { color: '#B7C3C7', fontSize: 13, fontWeight: '600', marginTop: 4 },
  heroIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroStats: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginTop: 22 },
  heroStat: { alignItems: 'center', flex: 1 },
  heroStatValue: { color: '#fff', fontSize: 21, fontWeight: '900' },
  heroStatLabel: { color: '#B7C3C7', fontSize: 11, fontWeight: '700', marginTop: 3 },
  heroDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.35)' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8 },
  sectionTitle: { color: COLORS.textPrimary, fontSize: 19, fontWeight: '900' },
  filtersContainer: { paddingHorizontal: 16, paddingBottom: 14, gap: 8 },
  filterChip: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: '#fff', borderWidth: 1, borderColor: '#DCECEF' },
  filterChipActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  filterText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '800' },
  filterTextActive: { color: '#fff' },
  orderCard: { marginHorizontal: 16, marginBottom: 13, padding: 15, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2EEF0', elevation: 2, shadowColor: '#0C6A78', shadowOpacity: 0.07, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 13 },
  orderNumberWrap: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  orderIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#E5FAFD', alignItems: 'center', justifyContent: 'center' },
  orderId: { color: COLORS.textPrimary, fontSize: 17, fontWeight: '900' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6, gap: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '800' },
  storeRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 },
  storeName: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '800' },
  itemsSummary: { color: COLORS.textPrimary, fontSize: 13, lineHeight: 20, fontWeight: '600', marginBottom: 13 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', borderTopWidth: 1, borderTopColor: '#EEF5F6', paddingTop: 11 },
  dateWrap: { flex: 1, marginRight: 10 },
  dateText: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '700' },
  addressText: { color: COLORS.textLight, fontSize: 11, marginTop: 4 },
  totalWrap: { alignItems: 'flex-end' },
  totalLabel: { color: COLORS.textLight, fontSize: 10, fontWeight: '700' },
  totalText: { color: ACCENT, fontSize: 17, fontWeight: '900', marginTop: 2 },
  trackRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 5, marginTop: 13 },
  trackText: { color: ACCENT, fontSize: 12, fontWeight: '900' },
  emptyState: { alignItems: 'center', paddingHorizontal: 25, paddingTop: 38 },
  emptyIcon: { width: 82, height: 82, borderRadius: 41, backgroundColor: '#E5FAFD', alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  emptyTitle: { color: COLORS.textPrimary, fontSize: 20, fontWeight: '900' },
  emptyText: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center', marginTop: 7, lineHeight: 20 },
  browseButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: ACCENT, borderRadius: 999, paddingHorizontal: 20, paddingVertical: 12, marginTop: 19 },
  browseText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  errorIcon: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#E5FAFD', alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  errorTitle: { color: COLORS.textPrimary, fontSize: 20, fontWeight: '900' },
  errorText: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center', marginTop: 8 },
  retryButton: { backgroundColor: ACCENT, borderRadius: 999, paddingHorizontal: 22, paddingVertical: 12, marginTop: 18 },
  retryText: { color: '#fff', fontSize: 13, fontWeight: '900' },
});

export default OrdersScreen;
