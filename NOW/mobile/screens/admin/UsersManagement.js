import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, TextInput, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import EmptyState from '../../components/EmptyState';
import Loading from '../../components/Loading';
import adminService from '../../services/adminService';

const UsersManagement = ({ navigation }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadUsers = async () => {
    const response = await adminService.getUsers();
    setUsers(response.data);
  };

  useEffect(() => {
    loadUsers()
      .catch(() => Alert.alert('خطأ', 'تعذر تحميل المستخدمين'))
      .finally(() => setLoading(false));
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadUsers();
    } catch (error) {
      Alert.alert('خطأ', 'تعذر تحديث المستخدمين');
    } finally {
      setRefreshing(false);
    }
  };

  const toggleUserStatus = async (user) => {
    try {
      const response = user.isActive
        ? await adminService.suspendUser(user.id)
        : await adminService.activateUser(user.id);
      setUsers((currentUsers) => currentUsers.map((item) =>
        item.id === user.id ? response.data : item
      ));
    } catch (error) {
      Alert.alert('خطأ', 'تعذر تحديث حالة المستخدم');
    }
  };

  const disableUser = (user) => {
    Alert.alert('تأكيد التعطيل', 'هل أنت متأكد من تعطيل هذا المستخدم؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'تعطيل',
        style: 'destructive',
        onPress: async () => {
          try {
            const response = await adminService.deleteUser(user.id);
            setUsers((currentUsers) => currentUsers.map((item) =>
              item.id === user.id ? response.data : item
            ));
          } catch (error) {
            Alert.alert('خطأ', 'تعذر تعطيل المستخدم');
          }
        },
      },
    ]);
  };

  const filteredUsers = users.filter(u =>
    u.name.includes(searchQuery) || u.phone.includes(searchQuery)
  );

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardContent}>
        <View style={styles.userInfo}>
          <View style={[styles.statusDot, item.isActive ? styles.activeDot : styles.blockedDot]} />
          <Text style={styles.userName}>{item.name}</Text>
        </View>
        <Text style={styles.userPhone}>{item.phone}</Text>
        <Text style={styles.userRole}>{item.role.name}</Text>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity onPress={() => toggleUserStatus(item)} style={styles.actionBtn}>
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
          <TouchableOpacity onPress={() => disableUser(item)} style={styles.actionBtn}>
            <Ionicons name="ban-outline" size={22} color={COLORS.error} />
            <Text style={[styles.actionText, styles.deleteText]}>تعطيل</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (loading) {
    return <Loading text="جاري تحميل المستخدمين..." />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={28} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>إدارة المستخدمين</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="بحث..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={COLORS.textLight}
        />
      </View>

      <FlatList
        data={filteredUsers}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState icon="people-outline" title="لا يوجد مستخدمين" />
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
  searchContainer: { flexDirection: 'row', alignItems: 'center', margin: 16, paddingHorizontal: 12, backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 16, color: COLORS.textPrimary },
  list: { paddingHorizontal: 16 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  cardContent: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  userInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  activeDot: { backgroundColor: COLORS.success },
  blockedDot: { backgroundColor: COLORS.error },
  userName: { fontSize: 16, fontWeight: 'bold', color: COLORS.textPrimary },
  userPhone: { fontSize: 14, color: COLORS.textSecondary, marginLeft: 12 },
  userRole: { fontSize: 12, color: COLORS.textLight, marginLeft: 8, backgroundColor: COLORS.surface, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  cardActions: { flexDirection: 'row', marginTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', marginRight: 16 },
  actionText: { fontSize: 12, marginLeft: 4 },
  activeText: { color: COLORS.success },
  blockedText: { color: COLORS.error },
  deleteText: { color: COLORS.error },
});

export default UsersManagement;