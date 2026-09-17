import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { authService } from '../../services/authService';

const VerifyPhoneScreen = ({ navigation, route }) => {
  const phone = route?.params?.phone;
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const verify = async () => {
    if (!/^\d{6}$/.test(code)) {
      Alert.alert('تنبيه', 'أدخل رمز التحقق المكون من 6 أرقام');
      return;
    }
    setLoading(true);
    const result = await authService.verifyPhone(phone, code);
    setLoading(false);
    if (!result.success) {
      Alert.alert('تعذر التأكيد', result.message);
      return;
    }
    Alert.alert('تم التأكيد', 'تم تأكيد البريد الإلكتروني. يمكنك الآن تسجيل الدخول بحسابك.', [
      { text: 'حسنًا', onPress: () => navigation.navigate('Login', { phone }) },
    ]);
  };

  const resend = async () => {
    const result = await authService.resendPhoneOtp(phone);
    Alert.alert(result.success ? 'تم الإرسال' : 'تعذر الإرسال', result.message || 'تم إرسال رمز جديد إلى بريدك الإلكتروني');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>تأكيد رقم الهاتف</Text>
      <Text style={styles.subtitle}>أدخل الرمز المرسل إلى بريدك الإلكتروني</Text>
      <TextInput
        value={code}
        onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        placeholder="000000"
        style={styles.input}
      />
      <TouchableOpacity style={styles.primary} onPress={verify} disabled={loading}>
        <Text style={styles.primaryText}>{loading ? 'جارٍ التأكيد...' : 'تأكيد الرقم'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondary} onPress={resend} disabled={loading}>
        <Text style={styles.secondaryText}>إعادة إرسال الرمز</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#f8fafc' },
  title: { fontSize: 26, fontWeight: '900', textAlign: 'center', color: '#15345b' },
  subtitle: { marginTop: 10, marginBottom: 24, textAlign: 'center', color: '#64748b' },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#dbe5ee', borderRadius: 14, padding: 16, fontSize: 24, letterSpacing: 8, textAlign: 'center' },
  primary: { marginTop: 18, padding: 15, borderRadius: 13, backgroundColor: '#079bb9', alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '900' },
  secondary: { padding: 15, alignItems: 'center' },
  secondaryText: { color: '#079bb9', fontWeight: '800' },
});

export default VerifyPhoneScreen;
// مسودة المشروع - البشمهندس حسن ياسر
