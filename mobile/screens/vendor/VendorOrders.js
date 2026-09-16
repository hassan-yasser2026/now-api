import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { orderService } from '../../services/orderService';
import useAppStore from '../../store/appStore';

const statusMap = {
  PENDING: 'قيد الانتظار',
  ACCEPTED: 'تم القبول',
  PREPARING: 'قيد التحضير',
  READY: 'جاهز للاستلام',
  PICKED_UP: 'تم الاستلام',
  ON_THE_WAY: 'في الطريق',
  DELIVERED: 'تم التوصيل',
  CANCELLED: 'ملغي',
};

const statusColors = {
  PENDING: COLORS.warning,
  ACCEPTED: COLORS.primary,
  PREPARING: COLORS.secondary,
  READY: COLORS.success,
  PICKED_UP: COLORS.primary,
  ON_THE_WAY: COLORS.success,
  DELIVERED: COLORS.success,
  CANCELLED: COLORS.error,
};

export default function VendorOrders({ navigation }) {
  const { user } = useAppStore();
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let active = true;
    const loadOrders = async () => {
      const result = await orderService.getVendorOrders(user?.id);
      if (!active) return;
      if (result?.success && Array.isArray(result.orders)) {
        setOrders(result.orders);
      } else {
        setOrders([]);
      }
    };

    loadOrders();
    const interval = setInterval(loadOrders, 30000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [user?.id]);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('VendorOrderDetails', { order: item, orderId: item.id })}
    >
      <Image source={item.image ? { uri: item.image } : require('../../assets/images/icon.png')} style={styles.thumb} onError={() => {}} />
      <View style={styles.info}>
        <View style={styles.row}>
          <Text style={styles.orderId}>طلب #{item.id}</Text>
          <Text style={[styles.status, { color: statusColors[item.status] || COLORS.textSecondary }]}>
            {statusMap[item.status] || item.status}
          </Text>
        </View>
        <Text style={styles.customer}>العميل: {item.customerName || 'غير محدد'}</Text>
        <Text style={styles.total}>{Number(item.totalPrice || 0).toFixed(2)} ج.م</Text>
      </View>
      <Ionicons name="chevron-back-outline" size={22} color={COLORS.textSecondary} />
    </TouchableOpacity>
  );

  const visibleOrders = orders.filter((item) => {
    const query = search.trim().toLowerCase();
    return !query || `${item.id} ${item.customerName || ''} ${item.address || ''}`.toLowerCase().includes(query);
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={28} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>إدارة الطلبات</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={20} color={COLORS.primary} />
        <TextInput value={search} onChangeText={setSearch} placeholder="ابحث برقم الطلب أو العميل..." placeholderTextColor={COLORS.textLight} style={styles.searchInput} />
      </View>
      <FlatList
        data={visibleOrders}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={renderItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: '#fff',
  },
  backBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', color: COLORS.textPrimary },
  headerSpacer: { width: 40 },
  searchBox: { marginHorizontal: 16, marginTop: 10, paddingHorizontal: 12, flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  searchInput: { flex: 1, paddingHorizontal: 10, paddingVertical: 11, textAlign: 'right', color: COLORS.textPrimary },
  list: { padding: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  thumb: { width: 72, height: 72, borderRadius: 14, marginLeft: 12 },
  info: { flex: 1 },
  row: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  orderId: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '700' },
  status: { fontSize: 12, fontWeight: '700' },
  customer: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'right', marginBottom: 4 },
  total: { color: COLORS.primary, fontWeight: '800', fontSize: 15, textAlign: 'right' },
});
