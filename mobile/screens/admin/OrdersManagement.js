import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import EmptyState from '../../components/EmptyState';

const OrdersManagement = ({ navigation }) => {
  const [orders, setOrders] = useState([
    { id: 1, customer: 'أحمد', store: 'مطعم الأهرام', total: 120, status: 'Pending', date: '2026-08-15' },
    { id: 2, customer: 'سارة', store: 'بيتزا إيطاليا', total: 200, status: 'Delivered', date: '2026-08-15' },
    { id: 3, customer: 'محمد', store: 'كافيه نايس', total: 80, status: 'PickedUp', date: '2026-08-14' },
  ]);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Pending': return COLORS.warning;
      case 'Preparing': return COLORS.secondary;
      case 'PickedUp': return COLORS.primary;
      case 'Delivered': return COLORS.success;
      default: return COLORS.textSecondary;
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'Pending': return 'قيد الانتظار';
      case 'Preparing': return 'قيد التحضير';
      case 'PickedUp': return 'في الطريق';
      case 'Delivered': return 'تم التوصيل';
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
      <Text style={styles.customer}>👤 {item.customer}</Text>
      <Text style={styles.store}>🏪 {item.store}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.total}>💵 {item.total} ج.م</Text>
        <Text style={styles.date}>📅 {item.date}</Text>
      </View>
    </TouchableOpacity>
  );

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