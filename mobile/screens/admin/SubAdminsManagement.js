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

const SubAdminsManagement = ({ navigation }) => {
  const [subAdmins, setSubAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSubAdmins = async () => {
    const response = await adminService.getSubAdmins();
    setSubAdmins(response.data);
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadSubAdmins()
        .catch(() => Alert.alert('خطأ', 'تعذر تحميل المشرفين الفرعيين'))
        .finally(() => setLoading(false));
    });

    return unsubscribe;
  }, [navigation]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadSubAdmins();
    } catch (error) {
      Alert.alert('خطأ', 'تعذر تحديث المشرفين الفرعيين');
    } finally {
      setRefreshing(false);
    }
  };

  const disableSubAdmin = (subAdmin) => {
    Alert.alert('تأكيد التعطيل', 'هل أنت متأكد من تعطيل هذا المشرف؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'تعطيل',
        style: 'destructive',
        onPress: async () => {
          try {
            await adminService.deleteSubAdmin(subAdmin.id);
            await loadSubAdmins();
          } catch (error) {
            Alert.alert('خطأ', 'تعذر تعطيل المشرف');
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('SubAdminPermissions', { subAdmin: item })}
    >
      <View style={styles.cardContent}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.phone}>{item.phone}</Text>
      </View>
      <View style={styles.permissions}>
        {item.permissions.map((p, index) => (
          <Text key={index} style={styles.permissionBadge}>{p}</Text>
        ))}
      </View>
      <Text style={[styles.status, item.isActive ? styles.active : styles.inactive]}>
        {item.isActive ? 'نشط' : 'معطل'}
      </Text>
      {item.isActive && (
        <TouchableOpacity style={styles.disableButton} onPress={() => disableSubAdmin(item)}>
          <Ionicons name="ban-outline" size={18} color={COLORS.error} />
          <Text style={styles.disableText}>تعطيل</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return <Loading text="جاري تحميل المشرفين..." />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={28} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>المشرفين الفرعيين</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('SubAdminPermissions')}
          style={styles.addBtn}
        >
          <Ionicons name="add-circle" size={28} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={subAdmins}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState icon="person-add-outline" title="لا يوجد مشرفين فرعيين" />
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
  name: { fontSize: 16, fontWeight: 'bold', color: COLORS.textPrimary },
  phone: { fontSize: 14, color: COLORS.textSecondary },
  permissions: { flexDirection: 'row', marginTop: 8, flexWrap: 'wrap' },
  permissionBadge: { backgroundColor: COLORS.surface, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginRight: 6, fontSize: 12, color: COLORS.textSecondary },
  status: { fontSize: 14, marginTop: 8, textAlign: 'center' },
  active: { color: COLORS.success },
  inactive: { color: COLORS.error },
  disableButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  disableText: { color: COLORS.error, marginLeft: 6, fontWeight: '600' },
});

export default SubAdminsManagement;