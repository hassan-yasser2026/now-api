import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS } from '../constants/colors';
import { DEFAULT_CENTER } from '../utils/mapHtml';
import LocationMap from './LocationMap';

/**
 * Full-screen map picker used by checkout (customer) and store settings
 * (vendor). Returns the chosen point via onConfirm({ lat, lng }).
 */
const LocationPickerModal = ({
  visible,
  title = 'تحديد الموقع على الخريطة',
  initial,
  onConfirm,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const mapRef = useRef(null);

  const [picked, setPicked] = useState(null);
  const [locating, setLocating] = useState(false);

  const initialPoint =
    initial &&
    Number.isFinite(Number(initial.lat)) &&
    Number.isFinite(Number(initial.lng))
      ? { lat: Number(initial.lat), lng: Number(initial.lng) }
      : null;

  const current = picked || initialPoint;

  const useMyLocation = async () => {
    try {
      setLocating(true);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('تنبيه', 'لم يتم منح إذن الوصول إلى الموقع');
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const point = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };

      setPicked(point);
      mapRef.current?.setPick(point.lat, point.lng);
    } catch {
      Alert.alert('خطأ', 'تعذر تحديد موقعك الحالي');
    } finally {
      setLocating(false);
    }
  };

  const handleConfirm = () => {
    if (!current) {
      Alert.alert('تنبيه', 'اضغط على الخريطة لتحديد الموقع أولاً');
      return;
    }

    onConfirm?.(current);
    setPicked(null);
    onClose?.();
  };

  const handleClose = () => {
    setPicked(null);
    onClose?.();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
            <Ionicons name="close" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.headerButton} />
        </View>

        <Text style={styles.hint}>
          اضغط على الخريطة أو اسحب العلامة لتحديد الموقع بدقة
        </Text>

        <LocationMap
          picker
          mapRef={mapRef}
          markers={current ? [{ ...current, color: 'primary' }] : []}
          center={current || DEFAULT_CENTER}
          zoom={current ? 16 : 12}
          onPick={setPicked}
          height={0}
          style={styles.map}
        />

        <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
          <TouchableOpacity
            style={styles.locateButton}
            onPress={useMyLocation}
            disabled={locating}
          >
            {locating ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Ionicons name="locate" size={20} color={COLORS.primary} />
            )}
            <Text style={styles.locateText}>استخدام موقعي الحالي</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.confirmButton, !current && styles.confirmDisabled]}
            onPress={handleConfirm}
          >
            <Ionicons name="checkmark" size={20} color={COLORS.white} />
            <Text style={styles.confirmText}>تأكيد الموقع</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  headerButton: { width: 40, alignItems: 'center' },
  title: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
  hint: {
    textAlign: 'center',
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  map: { flex: 1, marginHorizontal: 12, height: undefined },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  locateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surface,
  },
  locateText: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
  },
  confirmDisabled: { opacity: 0.55 },
  confirmText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
});

export default LocationPickerModal;
