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
        <Switch value={enabled} onValueChange={toggleNotifications} trackColor={{ false: '#B7DDE3', true: '#10C7E8' }} thumbColor="#FFFFFF" />
      </View>
      {loading ? (
        <ActivityIndicator color="#10C7E8" style={styles.loader} />
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
  container: { flex: 1, backgroundColor: '#F2FCFD' },
  header: { backgroundColor: '#10C7E8', paddingTop: 48, paddingBottom: 18, paddingHorizontal: 20, flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: '#FFFFFF', fontSize: 26, fontWeight: '900' },
  back: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  preference: { margin: 16, padding: 16, borderRadius: 16, backgroundColor: '#FFFFFF', flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#B7EDF3' },
  preferenceText: { color: '#12343A', fontSize: 17, fontWeight: '800' },
  loader: { marginTop: 40 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row-reverse', borderWidth: 1, borderColor: '#D9F3F6' },
  unread: { borderColor: '#10C7E8', backgroundColor: '#ECFCFE' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#10C7E8', marginTop: 5, marginLeft: 10 },
  cardContent: { flex: 1, alignItems: 'flex-end' },
  cardTitle: { color: '#12343A', fontSize: 18, fontWeight: '900' },
  body: { color: '#31545A', fontSize: 15, marginTop: 5 },
  date: { color: '#789197', fontSize: 12, marginTop: 8 },
  empty: { color: '#567177', textAlign: 'center', marginTop: 50, fontSize: 16 },
});

export default VendorNotifications;
