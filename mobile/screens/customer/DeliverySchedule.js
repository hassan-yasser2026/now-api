import React, { useMemo } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useAppStore from '../../store/appStore';
import { COLORS } from '../../constants/colors';

const MAX_DAYS = 30;
const HOURS = [12, 15, 18, 21];

const DeliverySchedule = ({ navigation }) => {
  const setScheduledDate = useAppStore((state) => state.setScheduledDate);
  const options = useMemo(() => {
    const values = [];
    for (let day = 0; day < MAX_DAYS; day += 1) {
      for (const hour of HOURS) {
        const date = new Date();
        date.setDate(date.getDate() + day);
        date.setHours(hour, 0, 0, 0);
        if (date > new Date()) values.push(date);
      }
    }
    return values;
  }, []);

  const selectDate = async (date) => {
    await setScheduledDate(date.toISOString());
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity accessibilityLabel="رجوع" onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>اختيار موعد التوصيل</Text>
        <View style={styles.spacer} />
      </View>
      <Text style={styles.subtitle}>اختر موعدًا مناسبًا لاستلام طلبك</Text>
      <View style={styles.list}>
        {options.slice(0, 12).map((date) => (
          <TouchableOpacity
            key={date.toISOString()}
            style={styles.option}
            onPress={() => selectDate(date)}
            accessibilityRole="button"
          >
            <View>
              <Text style={styles.date}>{date.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
              <Text style={styles.time}>{date.toLocaleTimeString('ar-EG', { hour: 'numeric', minute: '2-digit' })}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 20, paddingTop: Platform.OS === 'web' ? 24 : 52 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  title: { color: COLORS.text, fontSize: 20, fontWeight: '700' },
  subtitle: { color: COLORS.secondaryText, fontSize: 15, marginBottom: 18, textAlign: 'right' },
  list: { gap: 10 },
  option: { backgroundColor: COLORS.surface, borderColor: COLORS.border, borderWidth: 1, borderRadius: 12, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { color: COLORS.text, fontSize: 16, fontWeight: '600', textAlign: 'right' },
  time: { color: COLORS.primary, fontSize: 14, marginTop: 5, textAlign: 'right' },
  spacer: { width: 24 },
});

export default DeliverySchedule;
