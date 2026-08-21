import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, TextInput, Modal, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import PrimaryButton from '../../components/PrimaryButton';
import EmptyState from '../../components/EmptyState';

const UsersManagement = ({ navigation }) => {
  const [users, setUsers] = useState([
    { id: 1, name: 'أحمد العميل', phone: '01000000000', role: 'customer', status: 'active' },
    { id: 2, name: 'مطعم البيت', phone: '01000000001', role: 'vendor', status: 'active' },
    { id: 3, name: 'سعيد المندوب', phone: '01000000002', role: 'delivery', status: 'active' },
  ]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const toggleUserStatus = (id) => {
    setUsers(users.map(u =>
      u.id === id ? { ...u, status: u.status === 'active' ? 'blocked' : 'active' } : u
    ));
  };

  const deleteUser = (id) => {
    Alert.alert('تأكيد الحذف', 'هل أنت متأكد من حذف هذا المستخدم؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: () => setUsers(users.filter(u => u.id !== id)) },
    ]);
  };

  const filteredUsers = users.filter(u =>
    u.name.includes(searchQuery) || u.phone.includes(searchQuery)
  );

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardContent}>
        <View style={styles.userInfo}>
          <View style={[styles.statusDot, item.status === 'active' ? styles.activeDot : styles.blockedDot]} />
          <Text style={styles.userName}>{item.name}</Text>
        </View>
        <Text style={styles.userPhone}>{item.phone}</Text>
        <Text style={styles.userRole}>{item.role}</Text>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity onPress={() => toggleUserStatus(item.id)} style={styles.actionBtn}>
          <Ionicons
            name={item.status === 'active' ? 'checkmark-circle-outline' : 'close-circle-outline'}
            size={22}
            color={item.status === 'active' ? COLORS.success : COLORS.error}
          />
          <Text style={[styles.actionText, item.status === 'active' ? styles.activeText : styles.blockedText]}>
            {item.status === 'active' ? 'نشط' : 'محظور'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => deleteUser(item.id)} style={styles.actionBtn}>
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
        <Text style={styles.headerTitle}>إدارة المستخدمين</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addBtn}>
          <Ionicons name="add-circle" size={28} color={COLORS.primary} />
        </TouchableOpacity>
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

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>إضافة مستخدم جديد</Text>
            <TextInput style={styles.input} placeholder="الاسم" placeholderTextColor={COLORS.textLight} />
            <TextInput style={styles.input} placeholder="رقم الهاتف" placeholderTextColor={COLORS.textLight} keyboardType="phone-pad" />
            <TextInput style={styles.input} placeholder="كلمة المرور" placeholderTextColor={COLORS.textLight} secureTextEntry />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setModalVisible(false)}>
                <Text>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={() => setModalVisible(false)}>
                <Text style={styles.saveText}>حفظ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary },
  addBtn: { padding: 4 },
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', padding: 24, borderRadius: 20, width: '85%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  input: { backgroundColor: COLORS.surface, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12, fontSize: 16 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  modalBtn: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 30, minWidth: 80, alignItems: 'center' },
  cancelBtn: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  saveBtn: { backgroundColor: COLORS.primary },
  saveText: { color: '#fff', fontWeight: 'bold' },
});

export default UsersManagement;