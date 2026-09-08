import React, { useState } from 'react';
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useAppStore from '../../store/appStore';
import { COLORS } from '../../constants/colors';

const DeliverySchedule = ({ navigation }) => {
  const setScheduledDate = useAppStore((state) => state.setScheduledDate);
  const [dayText, setDayText] = useState('');
  const [hourText, setHourText] = useState('');

  const selectDate = async () => {
    const day = Number.parseInt(dayText, 10);
    const hour = Number.parseInt(hourText, 10);
    const now = new Date();
    const date = new Date(now.getFullYear(), now.getMonth(), day, hour, 0, 0, 0);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    if (
      !/^\d{1,2}$/.test(dayText) ||
      !/^\d{1,2}$/.test(hourText) ||
      day < 1 ||
      day > lastDay ||
      hour < 0 ||
      hour > 23 ||
      date <= now
    ) {
      Alert.alert('تنبيه', 'اكتب رقم اليوم (1 إلى 31) والساعة (0 إلى 23) في المستقبل');
      return;
    }

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
      <Text style={styles.subtitle}>اكتب رقم اليوم والساعة المناسبة لاستلام طلبك</Text>
      <View style={styles.inputs}>
        <TextInput
          style={styles.input}
          value={dayText}
          onChangeText={setDayText}
          placeholder="اليوم (1-31)"
          keyboardType="number-pad"
          textAlign="center"
        />
        <TextInput
          style={styles.input}
          value={hourText}
          onChangeText={setHourText}
          placeholder="الساعة (0-23)"
          keyboardType="number-pad"
          textAlign="center"
        />
      </View>
      <TouchableOpacity style={styles.confirmButton} onPress={selectDate} accessibilityRole="button">
        <Ionicons name="checkmark" size={20} color={COLORS.white} />
        <Text style={styles.confirmText}>تأكيد الموعد</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 20, paddingTop: Platform.OS === 'web' ? 24 : 52 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  title: { color: COLORS.text, fontSize: 20, fontWeight: '700' },
  subtitle: { color: COLORS.secondaryText, fontSize: 15, marginBottom: 18, textAlign: 'right' },
  inputs: { flexDirection: 'row', gap: 10, marginTop: 8 },
  input: { flex: 1, backgroundColor: COLORS.surface, borderColor: COLORS.border, borderWidth: 1, borderRadius: 12, padding: 14, color: COLORS.text, fontSize: 16 },
  confirmButton: { marginTop: 18, backgroundColor: COLORS.primary, borderRadius: 12, padding: 15, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  confirmText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  spacer: { width: 24 },
});

export default DeliverySchedule;
