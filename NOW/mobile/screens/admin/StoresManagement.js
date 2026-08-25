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

const StoresManagement = ({ navigation }) => {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStores = async () => {
    const response = await adminService.getStores();
    setStores(response.data);
  };

  useEffect(() => {
    loadStores()
      .catch(() => Alert.alert('خطأ', 'تعذر تحميل المتاجر'))
      .finally(() => setLoading(false));
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadStores();
    } catch (error) {
      Alert.alert('خطأ', 'تعذر تحديث المتاجر');
    } finally {
      setRefreshing(false);
    }
  };

  const toggleStoreStatus = async (store) => {
    try {
      const response = store.isActive
        ? await adminService.suspendStore(store.id)
        : await adminService.activateStore(store.id);
      setStores((currentStores) => currentStores.map((item) =>
        item.id === store.id ? response.data : item
      ));
    } catch (error) {
      Alert.alert('خطأ', 'تعذر تحديث حالة المتجر');
    }
  };

  const disableStore = (store) => {
    Alert.alert('تأكيد التعطيل', 'هل أنت متأكد من تعطيل هذا المتجر؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'تعطيل',
        style: 'destructive',
        onPress: async () => {
          try {
            const response = await adminService.deleteStore(store.id);
            setStores((currentStores) => currentStores.map((item) =>
              item.id === store.id ? response.data : item
            ));
          } catch (error) {
            Alert.alert('خطأ', 'تعذر تعطيل المتجر');
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardContent}>
        <View style={styles.storeInfo}>
          <Text style={styles.storeName}>{item.name}</Text>
          <Text style={styles.storeOwner}>المالك: {item.vendor.name}</Text>
        </View>
        <Text style={styles.storeOrders}>{item._count.orders} طلب</Text>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity onPress={() => toggleStoreStatus(item)} style={styles.actionBtn}>
          <Ionicons
            name={item.isActive ? 'checkmark-circle-outline' : 'close-circle-outline'}
            size={22}
            color={item.isActive ? COLORS.success : COLORS.error}
          />
          <Text style={[styles.actionText, item.isActive ? styles.activeText : styles.blockedText]}>
            {item.isActive ? 'نشط' : 'معطل'}
          </Text>
        </TouchableOpacity>
        {item.isActive && (
          <TouchableOpacity onPress={() => disableStore(item)} style={styles.actionBtn}>
            <Ionicons name="ban-outline" size={22} color={COLORS.error} />
            <Text style={[styles.actionText, styles.deleteText]}>تعطيل</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (loading) {
    return <Loading text="جاري تحميل المتاجر..." />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={28} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>إدارة المتاجر</Text>
        <View style={styles.headerSpacer} />
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
  headerSpacer: { width: 36 },
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