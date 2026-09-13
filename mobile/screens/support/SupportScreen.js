import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import supportService from '../../services/supportService';
import { COLORS } from '../../constants/colors';

const categories = ['شكوى على طلب', 'مشكلة في الحساب', 'مشكلة في الدفع', 'اقتراح أو استفسار'];

export default function SupportScreen({ navigation, route }) {
  const [category, setCategory] = useState(categories[0]);
  const [message, setMessage] = useState('');
  const [orderId, setOrderId] = useState(route?.params?.orderId ? String(route.params.orderId) : '');
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadComplaints = useCallback(async () => {
    setLoading(true);
    const result = await supportService.getComplaints();
    if (result.success) setComplaints(result.complaints);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { loadComplaints(); }, [loadComplaints]));

  const submit = async () => {
    if (message.trim().length < 5) {
      Alert.alert('الشكوى قصيرة', 'اكتب تفاصيل المشكلة أولاً');
      return;
    }
    setSubmitting(true);
    const result = await supportService.createComplaint({
      category,
      message: message.trim(),
      orderId: orderId.trim() || undefined,
    });
    setSubmitting(false);
    if (!result.success) {
      Alert.alert('تعذر الإرسال', result.message);
      return;
    }
    setMessage('');
    setOrderId('');
    Alert.alert('تم الإرسال', 'تم إرسال شكواك وسيتم الرد عليها من فريق الدعم');
    loadComplaints();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-forward" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>الشكاوى والدعم</Text>
        <View style={styles.spacer} />
      </View>

      <FlatList
        data={complaints}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.content}
        ListHeaderComponent={(
          <View style={styles.form}>
            <Text style={styles.sectionTitle}>إرسال شكوى أو استفسار</Text>
            <View style={styles.categories}>
              {categories.map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[styles.category, category === item && styles.categoryActive]}
                  onPress={() => setCategory(item)}
                >
                  <Text style={[styles.categoryText, category === item && styles.categoryTextActive]}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.orderInput}
              value={orderId}
              onChangeText={setOrderId}
              placeholder="رقم الطلب (اختياري)"
              keyboardType="number-pad"
              textAlign="right"
            />
            <TextInput
              style={styles.messageInput}
              value={message}
              onChangeText={setMessage}
              placeholder="اكتب تفاصيل المشكلة..."
              multiline
              textAlign="right"
            />
            <TouchableOpacity style={styles.submit} onPress={submit} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>إرسال الشكوى</Text>}
            </TouchableOpacity>
            <Text style={styles.historyTitle}>الشكاوى السابقة</Text>
          </View>
        )}
        ListEmptyComponent={loading ? <ActivityIndicator color={COLORS.primary} /> : <Text style={styles.empty}>لا توجد شكاوى سابقة</Text>}
        renderItem={({ item }) => {
          const lastMessage = item.messages?.[item.messages.length - 1];
          return (
            <View style={styles.card}>
              <View style={styles.cardRow}>
                <Text style={styles.status}>{item.status === 'RESOLVED' ? 'تم الحل' : 'مفتوحة'}</Text>
                <Text style={styles.cardTitle}>شكوى #{item.id}</Text>
              </View>
              <Text style={styles.cardMessage}>{lastMessage?.message || 'بدون رسالة'}</Text>
              {item.order?.id ? <Text style={styles.order}>الطلب #{item.order.id}</Text> : null}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  back: { padding: 4 },
  spacer: { width: 32 },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  content: { padding: 16, paddingBottom: 30 },
  form: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
  sectionTitle: { textAlign: 'right', fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 12 },
  categories: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  category: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 20, paddingHorizontal: 11, paddingVertical: 8 },
  categoryActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  categoryText: { color: COLORS.textSecondary, fontSize: 12 },
  categoryTextActive: { color: '#fff', fontWeight: '700' },
  orderInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12, marginTop: 12 },
  messageInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12, height: 100, marginTop: 10, textAlignVertical: 'top' },
  submit: { backgroundColor: COLORS.primary, borderRadius: 10, minHeight: 46, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  submitText: { color: '#fff', fontWeight: '800' },
  historyTitle: { textAlign: 'right', fontSize: 17, fontWeight: '800', marginTop: 22, color: COLORS.textPrimary },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between' },
  cardTitle: { fontWeight: '800', color: COLORS.textPrimary },
  status: { color: COLORS.primary, fontWeight: '700' },
  cardMessage: { textAlign: 'right', color: COLORS.textPrimary, marginTop: 8, lineHeight: 21 },
  order: { textAlign: 'right', color: COLORS.textSecondary, marginTop: 7, fontSize: 12 },
  empty: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 16 },
});
