import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import EmptyState from '../../components/EmptyState';

const DeliveryManagement = ({ navigation }) => {
  const [deliveries, setDeliveries] = useState([
    { id: 1, name: 'سعيد المندوب', phone: '01000000002', status: 'active', orders: 35, rating: 4.8 },
    { id: 2, name: 'خالد', phone: '01000000003', status: 'active', orders: 22, rating: 4.5 },
    { id: 3, name: 'يوسف', phone: '01000000004', status: 'inactive', orders: 8, rating: 4.2 },
  ]);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardContent}>
        <View style={styles.deliveryInfo}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.phone}>{item.phone}</Text>
        </View>
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Ionicons name="bag-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.statText}>{item.orders}</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="star" size={16} color="#F59E0B" />
            <Text style={styles.statText}>{item.rating}</Text>
          </View>
        </View>
      </View>
      <View style={styles.statusBar}>
        <Text style={[styles.statusText, item.status === 'active' ? styles.activeText : styles.inactiveText]}>
          {item.status === 'active' ? '🟢 نشط' : '🔴 غير نشط'}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={28} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>إدارة المندوبين</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={deliveries}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState icon="bicycle-outline" title="لا يوجد مندوبين" />
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
  cardContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  deliveryInfo: { flex: 1 },
  name: { fontSize: 16, fontWeight: 'bold', color: COLORS.textPrimary },
  phone: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  stats: { flexDirection: 'row', alignItems: 'center' },
  stat: { flexDirection: 'row', alignItems: 'center', marginLeft: 12 },
  statText: { fontSize: 14, color: COLORS.textSecondary, marginLeft: 4 },
  statusBar: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  statusText: { fontSize: 14, fontWeight: 'bold', textAlign: 'center' },
  activeText: { color: COLORS.success },
  inactiveText: { color: COLORS.error },
});

export default DeliveryManagement;