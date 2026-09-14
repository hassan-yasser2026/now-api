import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import api from '../../services/api';
import useAppStore from '../../store/appStore';

const getPayload = (response) => response.data?.data ?? response.data ?? {};

const AdminDashboardScreen = () => {
  const user = useAppStore((state) => state.user);
  const logout = useAppStore((state) => state.logout);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/dashboard');
      setDashboard(getPayload(response));
    } catch (error) {
      Alert.alert('تعذر تحميل لوحة الإدارة', error.response?.data?.message || 'حاول مرة أخرى');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const stats = dashboard?.stats || dashboard || {};

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>NOW</Text>
            <Text style={styles.title}>لوحة الإدارة</Text>
            <Text style={styles.subtitle}>مرحبًا {user?.name || 'مدير النظام'}</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={logout}>
            <Text style={styles.logoutText}>خروج</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#0B8FA3" style={styles.loader} />
        ) : (
          <>
            <View style={styles.grid}>
              <Stat label="المستخدمون" value={stats.users ?? stats.totalUsers} />
              <Stat label="الطلبات" value={stats.orders ?? stats.totalOrders} />
              <Stat label="المتاجر" value={stats.stores ?? stats.totalStores} />
              <Stat label="المندوبون" value={stats.delivery ?? stats.totalDelivery} />
            </View>
            <TouchableOpacity style={styles.refreshButton} onPress={loadDashboard}>
              <Text style={styles.refreshText}>تحديث البيانات</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const Stat = ({ label, value }) => (
  <View style={styles.card}>
    <Text style={styles.value}>{value ?? '—'}</Text>
    <Text style={styles.label}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7FB' },
  content: { padding: 20 },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  brand: { color: '#0B8FA3', fontSize: 16, fontWeight: '800', textAlign: 'right' },
  title: { color: '#102A43', fontSize: 28, fontWeight: '800', textAlign: 'right', marginTop: 4 },
  subtitle: { color: '#6B7C93', fontSize: 15, textAlign: 'right', marginTop: 6 },
  logoutButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: '#FDE8EC' },
  logoutText: { color: '#D33B5D', fontWeight: '800' },
  loader: { marginTop: 48 },
  grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 12 },
  card: { width: '48%', minHeight: 110, padding: 16, borderRadius: 16, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
  value: { color: '#0B8FA3', fontSize: 28, fontWeight: '800' },
  label: { color: '#52606D', marginTop: 8, fontWeight: '700' },
  refreshButton: { marginTop: 24, padding: 15, borderRadius: 12, backgroundColor: '#0B8FA3', alignItems: 'center' },
  refreshText: { color: '#FFF', fontWeight: '800' },
});

export default AdminDashboardScreen;
