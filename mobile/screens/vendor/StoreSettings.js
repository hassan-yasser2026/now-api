import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Switch, TouchableOpacity, ActivityIndicator, Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import useAppStore from '../../store/appStore';
import api from '../../services/api';
import LocationMap from '../../components/LocationMap';
import LocationPickerModal from '../../components/LocationPickerModal';

export default function StoreSettings({ navigation }) {
  const { user } = useAppStore();
  const [isOpen, setIsOpen] = useState(true);
  const [location, setLocation] = useState(null);
  const [pickerVisible, setPickerVisible] = useState(false);
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

        const lat = Number(store.latitude);
        const lng = Number(store.longitude);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          setLocation({ lat, lng });
        }
      }
    } catch (e) {
      // keep defaults
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!storeId) {
      Alert.alert('خطأ', 'لا يمكن تحديد المتجر');
      return;
    }
    setSaving(true);
    try {
      await api.patch(`/stores/${storeId}`, {
        isOpen,
        ...(location
          ? { latitude: location.lat, longitude: location.lng }
          : {}),
      });
      Alert.alert('تم', 'تم حفظ الإعدادات بنجاح');
      navigation.goBack();
    } catch (e) {
      Alert.alert('خطأ', 'فشل حفظ الإعدادات');
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
          <View style={styles.row}>
            <Text style={styles.label}>موقع المتجر على الخريطة</Text>
            <Ionicons name="map-outline" size={22} color={COLORS.primary} />
          </View>

          <Text style={styles.supportText}>
            يظهر موقع المتجر للعميل والمندوب على خريطة الطلب.
          </Text>

          {location && (
            <LocationMap
              markers={[{ ...location, label: user?.store?.name || 'المتجر', color: 'blue' }]}
              zoom={16}
              height={170}
              style={styles.mapPreview}
            />
          )}

          <TouchableOpacity
            style={styles.mapPickBtn}
            onPress={() => setPickerVisible(true)}
          >
            <Ionicons name="location-outline" size={19} color={COLORS.primary} />
            <Text style={styles.mapPickText}>
              {location ? 'تعديل موقع المتجر' : 'تحديد موقع المتجر'}
            </Text>
          </TouchableOpacity>
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
      </ScrollView>

      <LocationPickerModal
        visible={pickerVisible}
        title="تحديد موقع المتجر"
        initial={location}
        onConfirm={setLocation}
        onClose={() => setPickerVisible(false)}
      />
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
  label: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  supportText: { marginTop: 8, color: COLORS.textSecondary, fontSize: 13, textAlign: 'right' },
  mapPreview: { marginTop: 12 },
  mapPickBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    marginTop: 12, paddingVertical: 12, borderRadius: 13,
    borderWidth: 1.5, borderColor: COLORS.primary, backgroundColor: '#fff',
  },
  mapPickText: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
  primaryBtn: { backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 16, alignItems: 'center', marginTop: 16, marginBottom: 24 },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
