import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../../constants/colors';
import useAppStore from '../../store/appStore';
import { offerService } from '../../services/offerService';

const STATUS_LABELS = {
  PENDING_ADMIN_REVIEW: 'في انتظار مراجعة الإدارة',
  APPROVED: 'تم الاعتماد',
  REJECTED: 'مرفوض',
};

const REJECTION_REASON_LABELS = {
  INVALID_INFORMATION: 'بيانات غير صحيحة',
  POLICY_VIOLATION: 'مخالفة السياسات',
  DUPLICATE: 'محتوى مكرر',
  PRICING_ISSUE: 'مشكلة في السعر',
  QUALITY_ISSUE: 'مشكلة في الجودة',
  OTHER: 'سبب آخر',
};

export default function VendorOffers({ navigation }) {
  const { user } = useAppStore();
  const [offers, setOffers] = useState([]);
  const [title, setTitle] = useState('');
  const [discountValue, setDiscountValue] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const loadOffers = useCallback(async () => {
    const result = await offerService.getVendorOffers(user?.id);
    if (result.success) setOffers(result.offers);
  }, [user?.id]);

  useEffect(() => { loadOffers(); }, [loadOffers]);

  const createOffer = async () => {
    if (!title.trim() || !discountValue) {
      Alert.alert('بيانات ناقصة', 'أدخل عنوان العرض وقيمة الخصم');
      return;
    }
    setSaving(true);
    const result = await offerService.createOffer(user?.id, {
      title: title.trim(),
      description: description.trim() || undefined,
      discountType: 'PERCENTAGE',
      discountValue: Number(discountValue),
    });
    setSaving(false);
    if (!result.success) {
      Alert.alert('لم يتم الإرسال', result.message);
      return;
    }
    setTitle('');
    setDiscountValue('');
    setDescription('');
    Alert.alert('تم الإرسال', 'سيظهر العرض للعملاء بعد اعتماد الإدارة');
    loadOffers();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>‹</Text></TouchableOpacity>
        <Text style={styles.title}>العروض والخصومات</Text>
      </View>
      <View style={styles.form}>
        <TextInput style={styles.input} placeholder="عنوان العرض" value={title} onChangeText={setTitle} />
        <TextInput style={styles.input} placeholder="نسبة الخصم (%)" value={discountValue} onChangeText={setDiscountValue} keyboardType="numeric" />
        <TextInput style={styles.input} placeholder="وصف مختصر (اختياري)" value={description} onChangeText={setDescription} />
        <TouchableOpacity style={styles.button} onPress={createOffer} disabled={saving}>
          <Text style={styles.buttonText}>{saving ? 'جار الإرسال...' : 'إرسال العرض للمراجعة'}</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={offers}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardText}>{item.discountValue}% خصم</Text>
            <Text style={styles.status}>{STATUS_LABELS[item.approvalStatus] || item.approvalStatus}</Text>
            {item.rejectionReason ? <Text style={styles.reason}>سبب الرفض: {REJECTION_REASON_LABELS[item.rejectionReason] || item.rejectionReason}</Text> : null}
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>لم تُنشئ عروضًا بعد</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: COLORS.surface },
  back: { fontSize: 34, color: COLORS.primary },
  title: { fontSize: 21, fontWeight: '800', color: COLORS.textPrimary },
  form: { padding: 16, backgroundColor: COLORS.surface, marginBottom: 12 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12, marginBottom: 10, textAlign: 'right', color: COLORS.textPrimary },
  button: { backgroundColor: COLORS.primary, borderRadius: 10, padding: 14 },
  buttonText: { color: COLORS.white, textAlign: 'center', fontWeight: '800' },
  list: { padding: 16 },
  card: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, marginBottom: 10 },
  cardTitle: { fontSize: 17, fontWeight: '800', textAlign: 'right' },
  cardText: { color: COLORS.primary, textAlign: 'right', marginTop: 4 },
  status: { color: COLORS.secondaryText, textAlign: 'right', marginTop: 6 },
  reason: { color: '#c62828', textAlign: 'right', marginTop: 4 },
  empty: { textAlign: 'center', color: COLORS.secondaryText, marginTop: 30 },
});
// مسودة المشروع - البشمهندس حسن ياسر
