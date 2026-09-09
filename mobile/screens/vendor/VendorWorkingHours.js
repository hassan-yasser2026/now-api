import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import useAppStore from '../../store/appStore';
import api from '../../services/api';

const DAYS = [
  [0, 'الأحد'],
  [1, 'الإثنين'],
  [2, 'الثلاثاء'],
  [3, 'الأربعاء'],
  [4, 'الخميس'],
  [5, 'الجمعة'],
  [6, 'السبت'],
];

const defaultHours = () =>
  DAYS.reduce((hours, [day]) => {
    hours[String(day)] = { enabled: true, start: '09:00', end: '22:00' };
    return hours;
  }, {});

const normalizeHours = (hours) =>
  DAYS.reduce((result, [day]) => {
    const value = hours?.[String(day)] || {};
    result[String(day)] = {
      enabled: value.enabled !== false,
      start: value.start || '09:00',
      end: value.end || '22:00',
    };
    return result;
  }, {});

const validTime = (value) => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);

export default function VendorWorkingHours({ navigation }) {
  const { user } = useAppStore();
  const [hours, setHours] = useState(defaultHours);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadHours = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      try {
        const response = await api.get(`/vendor/${user.id}/store`);
        const store = response.data?.data ?? response.data;
        if (mounted && store?.operatingHours) {
          setHours(normalizeHours(store.operatingHours));
        }
      } catch (error) {
        if (mounted) Alert.alert('خطأ', 'تعذر تحميل أوقات العمل');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadHours();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const updateDay = (day, key, value) => {
    setHours((current) => ({
      ...current,
      [String(day)]: { ...current[String(day)], [key]: value },
    }));
  };

  const handleSave = async () => {
    const invalidDay = DAYS.find(([day]) => {
      const value = hours[String(day)];
      return value.enabled && (!validTime(value.start) || !validTime(value.end));
    });
    if (invalidDay) {
      Alert.alert('تنبيه', `اكتب وقت ${invalidDay[1]} بصيغة 24 ساعة مثل 09:00`);
      return;
    }

    try {
      setSaving(true);
      const response = await api.get(`/vendor/${user.id}/store`);
      const store = response.data?.data ?? response.data;
      if (!store?.id) {
        Alert.alert('خطأ', 'لا يمكن تحديد المتجر');
        return;
      }
      await api.put(`/stores/${store.id}`, { operatingHours: hours });
      Alert.alert('تم الحفظ', 'سيتم فتح وإغلاق المتجر تلقائيًا حسب هذا الجدول');
      navigation.goBack();
    } catch (error) {
      Alert.alert('خطأ', 'فشل حفظ أوقات العمل');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={27} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>أوقات العمل</Text>
        <View style={styles.headerSpacer} />
      </View>

      <Text style={styles.description}>
        حدد مواعيد فتح وإغلاق المتجر. سيتم تحديث حالة المتجر تلقائيًا كل دقيقة.
      </Text>

      <ScrollView showsVerticalScrollIndicator={false}>
        {DAYS.map(([day, label]) => {
          const value = hours[String(day)];
          return (
            <View key={day} style={styles.dayCard}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayLabel}>{label}</Text>
                <Switch
                  value={value.enabled}
                  onValueChange={(enabled) => updateDay(day, 'enabled', enabled)}
                  trackColor={{ false: '#CBD5E1', true: '#F9A8D4' }}
                  thumbColor={value.enabled ? COLORS.primary : '#fff'}
                />
              </View>
              {value.enabled && (
                <View style={styles.times}>
                  <View style={styles.timeField}>
                    <Text style={styles.timeLabel}>يفتح</Text>
                    <TextInput
                      value={value.start}
                      onChangeText={(text) => updateDay(day, 'start', text)}
                      placeholder="09:00"
                      keyboardType="numbers-and-punctuation"
                      maxLength={5}
                      style={styles.input}
                    />
                  </View>
                  <View style={styles.timeField}>
                    <Text style={styles.timeLabel}>يغلق</Text>
                    <TextInput
                      value={value.end}
                      onChangeText={(text) => updateDay(day, 'end', text)}
                      placeholder="22:00"
                      keyboardType="numbers-and-punctuation"
                      maxLength={5}
                      style={styles.input}
                    />
                  </View>
                </View>
              )}
            </View>
          );
        })}

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.disabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>حفظ أوقات العمل</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerSpacer: { width: 40 },
  title: { fontSize: 22, fontWeight: 'bold', color: COLORS.textPrimary },
  description: { color: COLORS.textSecondary, fontSize: 14, lineHeight: 22, textAlign: 'right', marginBottom: 14 },
  dayCard: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  dayHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  dayLabel: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  times: { flexDirection: 'row-reverse', gap: 12, marginTop: 10 },
  timeField: { flex: 1 },
  timeLabel: { color: COLORS.textSecondary, fontSize: 12, textAlign: 'right', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 10, textAlign: 'center', fontSize: 16, color: COLORS.textPrimary },
  saveButton: { backgroundColor: COLORS.primary, borderRadius: 14, alignItems: 'center', paddingVertical: 15, marginTop: 8, marginBottom: 24 },
  disabled: { opacity: 0.7 },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
