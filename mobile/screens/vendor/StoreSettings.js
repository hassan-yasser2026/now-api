import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Switch, TouchableOpacity, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { COLORS } from '../../constants/colors';
import useAppStore from '../../store/appStore';
import api from '../../services/api';
import AppMap from '../../components/AppMap';

export default function StoreSettings({ navigation }) {
  const { user } = useAppStore();
  const [isOpen, setIsOpen] = useState(true);
  const [location, setLocation] = useState(null); // { latitude, longitude }
  const [locating, setLocating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const storeId = user?.store?.id;

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    if (!storeId) { setLoading(false); return; }
    try {
      const res = await api.get(`/stores/${storeId}`);
      const store = res.data?.data ?? res.data;
      if (store) {
        setIsOpen(store.isOpen ?? true);
        if (store.latitude != null && store.longitude != null) {
          setLocation({
            latitude: Number(store.latitude),
            longitude: Number(store.longitude),
          });
        }
      }
    } catch (e) {
      // keep defaults
    } finally {
      setLoading(false);
    }
  };

  const useCurrentLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('الإذن مرفوض', 'يجب السماح بالوصول للموقع لاستخدام موقعك الحالي.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    } catch (e) {
      Alert.alert('خطأ', 'تعذر تحديد موقعك الحالي.');
    } finally {
      setLocating(false);
    }
  };

  const handleSave = async () => {
    if (!storeId) {
      Alert.alert('خطأ', 'لا يمكن تحديد المتجر');
      return;
    }
    setSaving(true);
    try {
      const payload = { isOpen };
      if (location) {
        payload.latitude = location.latitude;
        payload.longitude = location.longitude;
      }
      await api.patch(`/stores/${storeId}`, payload);
      Alert.alert('تم', 'تم حفظ الإعدادات بنجاح');
      navigation.goBack();
    } catch (e) {
      Alert.alert('خطأ', e?.response?.data?.message || 'فشل حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={28} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>إعدادات المتجر</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>حالة المتجر</Text>
            <Switch
              value={isOpen}
              onValueChange={setIsOpen}
              trackColor={{ false: '#CBD5E1', true: '#F9A8D4' }}
              thumbColor={isOpen ? COLORS.primary : '#fff'}
            />
          </View>
          <Text style={styles.supportText}>
            {isOpen ? '✅ المتجر مفتوح ويستقبل الطلبات' : '🔴 المتجر مغلق ولا يستقبل طلبات'}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>موقع المتجر على الخريطة</Text>
          <Text style={styles.supportText}>
            اضغط على الخريطة لتحديد موقع متجرك، أو استخدم موقعك الحالي.
          </Text>

          <View style={styles.mapWrapper}>
            <AppMap
              markers={
                location
                  ? [{
                      id: 'store',
                      latitude: location.latitude,
                      longitude: location.longitude,
                      title: user?.store?.name || 'موقع المتجر',
                      type: 'store',
                    }]
                  : []
              }
              center={location}
              height={260}
              onPickLocation={setLocation}
            />
          </View>

          <TouchableOpacity
            style={styles.locationBtn}
            onPress={useCurrentLocation}
            disabled={locating}
          >
            {locating ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Ionicons name="locate-outline" size={18} color={COLORS.primary} />
            )}
            <Text style={styles.locationBtnText}>استخدام موقعي الحالي</Text>
          </TouchableOpacity>

          {location ? (
            <Text style={styles.coordsText}>
              📍 {location.latitude.toFixed(6)} , {location.longitude.toFixed(6)}
            </Text>
          ) : (
            <Text style={styles.coordsText}>لم يتم تحديد الموقع بعد</Text>
          )}
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryText}>حفظ الإعدادات</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', color: COLORS.textPrimary },
  headerSpacer: { width: 40 },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: COLORS.border },
  row: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'right' },
  supportText: { marginTop: 8, color: COLORS.textSecondary, fontSize: 13, textAlign: 'right' },
  mapWrapper: { marginTop: 12 },
  locationBtn: {
    marginTop: 12,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: '#FCE7F3',
    borderRadius: 12,
    paddingVertical: 11,
  },
  locationBtnText: { color: COLORS.primary, fontSize: 13, fontWeight: '800' },
  coordsText: { marginTop: 10, fontSize: 12, color: COLORS.textSecondary, textAlign: 'center' },
  primaryBtn: { backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 16, alignItems: 'center', marginTop: 4 },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
