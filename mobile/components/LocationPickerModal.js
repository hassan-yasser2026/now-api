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
import useAppStore from '../store/appStore';
const MAP_ACCENT = '#00A6B8';

/**
 * Full-screen map picker used for the vendor store location and customer
 * delivery location. Returns the chosen point via onConfirm({ lat, lng }).
 */
const LocationPickerModal = ({
  visible,
  title = 'تحديد الموقع على الخريطة',
  initial,
  onConfirm,
  onClose,
  showSchedule = true,
}) => {
  const insets = useSafeAreaInsets();
  const mapRef = useRef(null);
  const setScheduledDate = useAppStore((state) => state.setScheduledDate);

  const [picked, setPicked] = useState(null);
  const [locating, setLocating] = useState(false);
  const [dateText, setDateText] = useState('');
  const [timeText, setTimeText] = useState('');
  const [activePicker, setActivePicker] = useState(null);

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

    if (showSchedule) {
      const day = Number.parseInt(dateText, 10);
      const hour = Number.parseInt(timeText, 10);
      const now = new Date();
      const selectedDate = new Date(now.getFullYear(), now.getMonth(), day, hour, 0, 0, 0);

      if (
        !/^\d{1,2}$/.test(dateText) ||
        !/^\d{1,2}$/.test(timeText) ||
        !Number.isInteger(day) ||
        day < 1 ||
        day > new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() ||
        !Number.isInteger(hour) ||
        hour < 0 ||
        hour > 23 ||
        selectedDate <= now
      ) {
        Alert.alert('تنبيه', 'اكتب رقم اليوم (1 إلى 31) والساعة (0 إلى 23) في المستقبل');
        return;
      }

      setScheduledDate(selectedDate.toISOString());
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
          markers={current ? [{ ...current, color: 'cyan' }] : []}
          center={current || DEFAULT_CENTER}
          zoom={current ? 16 : 12}
          onPick={setPicked}
          height={0}
          style={styles.map}
        />

        {showSchedule && (
          <View style={styles.scheduleSection}>
            <Text style={styles.scheduleTitle}>موعد الطلب</Text>
            <View style={styles.scheduleOptions}>
              <TouchableOpacity
                style={[styles.scheduleButton, activePicker === 'day' && styles.scheduleButtonActive]}
                onPress={() => setActivePicker(activePicker === 'day' ? null : 'day')}
              >
                <Ionicons name="calendar-outline" size={22} color={MAP_ACCENT} />
                <Text style={styles.scheduleButtonLabel}>عايز الأوردر يوم إيه؟</Text>
                <Text style={styles.scheduleButtonValue}>{dateText || 'اختار اليوم'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.scheduleButton, activePicker === 'hour' && styles.scheduleButtonActive]}
                onPress={() => setActivePicker(activePicker === 'hour' ? null : 'hour')}
              >
                <Ionicons name="time-outline" size={22} color={MAP_ACCENT} />
                <Text style={styles.scheduleButtonLabel}>عايز الأوردر الساعة كام؟</Text>
                <Text style={styles.scheduleButtonValue}>{timeText ? `${timeText}:00` : 'اختار الساعة'}</Text>
              </TouchableOpacity>
            </View>
            {activePicker && (
              <View style={styles.picker}>
                <Text style={styles.pickerTitle}>
                  {activePicker === 'day' ? 'اختار يوم الطلب' : 'اختار ساعة الطلب'}
                </Text>
                <View style={styles.pickerGrid}>
                  {(activePicker === 'day'
                    ? Array.from({ length: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() }, (_, index) => index + 1)
                    : Array.from({ length: 24 }, (_, index) => index)
                  ).map((value) => {
                    const text = String(value);
                    const selected = activePicker === 'day' ? dateText === text : timeText === text;
                    return (
                      <TouchableOpacity
                        key={text}
                        style={[styles.pickerOption, selected && styles.pickerOptionSelected]}
                        onPress={() => {
                          if (activePicker === 'day') setDateText(text);
                          else setTimeText(text);
                          setActivePicker(null);
                        }}
                      >
                        <Text style={[styles.pickerOptionText, selected && styles.pickerOptionTextSelected]}>
                          {text}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        )}

        <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
          <TouchableOpacity
            style={styles.locateButton}
            onPress={useMyLocation}
            disabled={locating}
          >
            {locating ? (
              <ActivityIndicator size="small" color={MAP_ACCENT} />
            ) : (
              <Ionicons name="locate" size={20} color={MAP_ACCENT} />
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
  scheduleOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dayOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dayText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  dayNumber: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '900',
    marginTop: 2,
  },
  scheduleButton: {
    flex: 1,
    minHeight: 82,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    textAlign: 'center',
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  scheduleButtonActive: {
    borderColor: MAP_ACCENT,
    backgroundColor: '#E8FBFD',
  },
  scheduleButtonLabel: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  scheduleButtonValue: {
    color: MAP_ACCENT,
    fontSize: 14,
    fontWeight: '900',
  },
  picker: {
    marginTop: 8,
    padding: 10,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pickerTitle: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'right',
    marginBottom: 8,
  },
  pickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pickerOption: {
    minWidth: 38,
    height: 36,
    paddingHorizontal: 8,
    borderRadius: 9,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerOptionSelected: {
    backgroundColor: MAP_ACCENT,
  },
  pickerOptionText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  pickerOptionTextSelected: {
    color: COLORS.white,
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
    borderColor: MAP_ACCENT,
    backgroundColor: COLORS.surface,
  },
  locateText: { color: MAP_ACCENT, fontWeight: '700', fontSize: 14 },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: MAP_ACCENT,
  },
  confirmDisabled: { opacity: 0.55 },
  confirmText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
});

export default LocationPickerModal;
