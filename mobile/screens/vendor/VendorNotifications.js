import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../services/api';
import { COLORS } from '../../constants/colors';

const VendorNotifications = ({ navigation }) => {
  const [notifications, setNotifications] = useState([]);
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const savedPreference = await AsyncStorage.getItem('notificationsEnabled');
    setEnabled(savedPreference !== 'false');

    try {
      const response = await api.get('/notifications');
      setNotifications(response.data?.data || []);
    } catch (error) {
      console.warn('Vendor notifications are not available on the server yet:', error?.response?.status);
    }

    try {
      const response = await api.get('/notifications/preferences');
      const serverEnabled = response.data?.data?.enabled !== false;
      setEnabled(serverEnabled);
      await AsyncStorage.setItem('notificationsEnabled', String(serverEnabled));
    } catch (error) {
      console.warn('Vendor notification preferences are not available on the server yet:', error?.response?.status);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  const toggleNotifications = async (value) => {
    setEnabled(value);
    await AsyncStorage.setItem('notificationsEnabled', String(value));
    try {
      await api.patch('/notifications/preferences', { enabled: value });
    } catch (error) {
      console.warn('Vendor notification preference sync is unavailable:', error?.response?.status);
    }
  };

  const markRead = async (notification) => {
    if (notification.readAt) return;
    setNotifications((items) =>
      items.map((item) =>
        item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item
      )
    );
    try {
      await api.patch(`/notifications/${notification.id}/read`);
    } catch {
      load();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>رجوع</Text>
        </TouchableOpacity>
        <Text style={styles.title}>الإشعارات</Text>
      </View>
      <View style={styles.preference}>
        <Text style={styles.preferenceText}>استقبال إشعارات الطلبات</Text>
        <Switch value={enabled} onValueChange={toggleNotifications} trackColor={{ false: COLORS.border, true: COLORS.primary }} thumbColor={COLORS.surface} />
      </View>
      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>لا توجد إشعارات حتى الآن</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity style={[styles.card, !item.readAt && styles.unread]} onPress={() => markRead(item)}>
              <View style={styles.dot} />
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.body}>{item.body}</Text>
                <Text style={styles.date}>{new Date(item.createdAt).toLocaleString('ar-EG')}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.primary, paddingTop: 48, paddingBottom: 18, paddingHorizontal: 20, flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: COLORS.white, fontSize: 26, fontWeight: '900' },
  back: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  preference: { margin: 16, padding: 16, borderRadius: 16, backgroundColor: COLORS.surface, flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  preferenceText: { color: COLORS.textPrimary, fontSize: 17, fontWeight: '800' },
  loader: { marginTop: 40 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  card: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row-reverse', borderWidth: 1, borderColor: COLORS.border },
  unread: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary, marginTop: 5, marginLeft: 10 },
  cardContent: { flex: 1, alignItems: 'flex-end' },
  cardTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '900' },
  body: { color: COLORS.secondaryText, fontSize: 15, marginTop: 5 },
  date: { color: COLORS.textLight, fontSize: 12, marginTop: 8 },
  empty: { color: COLORS.secondaryText, textAlign: 'center', marginTop: 50, fontSize: 16 },
});

export default VendorNotifications;
// مسودة المشروع - البشمهندس حسن ياسر
