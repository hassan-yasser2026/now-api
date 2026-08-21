import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, TextInput, Modal, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import EmptyState from '../../components/EmptyState';

const StoresManagement = ({ navigation }) => {
  const [stores, setStores] = useState([
    { id: 1, name: 'مطعم الأهرام', owner: 'أحمد', status: 'active', orders: 45 },
    { id: 2, name: 'كافيه نايس', owner: 'سارة', status: 'pending', orders: 12 },
    { id: 3, name: 'بيتزا إيطاليا', owner: 'محمد', status: 'active', orders: 78 },
  ]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const toggleStoreStatus = (id) => {
    setStores(stores.map(s =>
      s.id === id ? { ...s, status: s.status === 'active' ? 'suspended' : 'active' } : s
    ));
  };

  const deleteStore = (id) => {
    Alert.alert('تأكيد الحذف', 'هل أنت متأكد من حذف هذا المتجر؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: () => setStores(stores.filter(s => s.id !== id)) },
    ]);
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardContent}>
        <View style={styles.storeInfo}>
          <Text style={styles.storeName}>{item.name}</Text>
          <Text style={styles.storeOwner}>👤 {item.owner}</Text>
        </View>
        <Text style={styles.storeOrders}>📦 {item.orders} طلب</Text>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity onPress={() => toggleStoreStatus(item.id)} style={styles.actionBtn}>
          <Ionicons
            name={item.status === 'active' ? 'checkmark-circle-outline' : 'close-circle-outline'}
            size={22}
            color={item.status === 'active' ? COLORS.success : COLORS.error}
          />
          <Text style={[styles.actionText, item.status === 'active' ? styles.activeText : styles.blockedText]}>
            {item.status === 'active' ? 'نشط' : item.status === 'pending' ? 'قيد المراجعة' : 'موقف'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => deleteStore(item.id)} style={styles.actionBtn}>
          <Ionicons name="trash-outline" size={22} color={COLORS.error} />
          <Text style={[styles.actionText, styles.deleteText]}>حذف</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={28} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>إدارة المتاجر</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addBtn}>
          <Ionicons name="add-circle" size={28} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={stores}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState icon="storefront-outline" title="لا توجد متاجر" />
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
  addBtn: { padding: 4 },
  list: { padding: 16 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  cardContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  storeInfo: { flex: 1 },
  storeName: { fontSize: 16, fontWeight: 'bold', color: COLORS.textPrimary },
  storeOwner: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  storeOrders: { fontSize: 14, color: COLORS.primary, fontWeight: 'bold' },
  cardActions: { flexDirection: 'row', marginTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', marginRight: 16 },
  actionText: { fontSize: 12, marginLeft: 4 },
  activeText: { color: COLORS.success },
  blockedText: { color: COLORS.error },
  deleteText: { color: COLORS.error },
});

export default StoresManagement;