import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { authService } from '../../services/authService';

const CustomerLoginScreen = ({ navigation }) => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef(null);

  const handleLogin = async () => {
    if (loading) return;

    const trimPhone = phone.trim();
    const trimPass = password.trim();

    if (!trimPhone || trimPhone.length < 8) {
      Alert.alert('تنبيه', 'أدخل رقم هاتف صحيح (8 أرقام على الأقل)');
      return;
    }

    if (!trimPass || trimPass.length < 4) {
      Alert.alert('تنبيه', 'أدخل كلمة المرور');
      return;
    }

    setLoading(true);

    try {
      const result = await authService.login(trimPhone, trimPass);

      if (result?.success) {
        const userRole = result.user?.role;

        if (userRole === 'customer' || userRole === 'admin') {
          // للعميل والإداري: ارجع لشاشة الرئيسية داخل CustomerNavigator
          // مع ذلك لو الإداري RootNavigator سيحوله لـ AdminNavigator
          navigation.popToTop();
        }
        // باقي الأدوار: RootNavigator يحول أوتوماتيك
      } else {
        Alert.alert(
          'فشل الدخول',
          result?.message || 'رقم الهاتف أو كلمة المرور غير صحيحة'
        );
      }
    } catch (err) {
      Alert.alert('خطأ', 'تعذر الاتصال بالسيرفر');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={26} color={COLORS.textPrimary} />
        </TouchableOpacity>

        {/* Logo / Brand */}
        <View style={styles.brandSection}>
          <View style={styles.brandIcon}>
            <Ionicons name="storefront-outline" size={40} color={COLORS.primary} />
          </View>
          <Text style={styles.brandName}>ناو للخدمات</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>تسجيل الدخول</Text>
        <Text style={styles.subtitle}>أدخل بياناتك للمتابعة</Text>

        {/* Phone */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>رقم الهاتف</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="01XXXXXXXXX"
              placeholderTextColor={COLORS.textLight}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              maxLength={15}
              textAlign="right"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
            <Ionicons name="call-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
          </View>
        </View>

        {/* Password */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>كلمة المرور</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              ref={passwordRef}
              style={styles.input}
              placeholder="• • • • • •"
              placeholderTextColor={COLORS.textLight}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              textAlign="right"
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
            <TouchableOpacity onPress={() => setShowPassword((v) => !v)}>
              <Ionicons
                name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                size={20}
                color={COLORS.textSecondary}
                style={styles.inputIcon}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Login Button */}
        <TouchableOpacity
          style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="log-in-outline" size={22} color="#fff" />
              <Text style={styles.loginBtnText}>دخول</Text>
            </>
          )}
        </TouchableOpacity>

        {/* New Account */}
        <TouchableOpacity
          style={styles.registerLink}
          onPress={() => navigation.navigate('Register', { initialRole: 'customer' })}
        >
          <Text style={styles.registerLinkText}>
            مش عندك حساب؟{' '}
            <Text style={styles.registerHighlight}>سجل مجاناً</Text>
          </Text>
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>أو</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Partner Join */}
        <TouchableOpacity
          style={styles.partnerBtn}
          onPress={() => navigation.navigate('PartnerJoin')}
          activeOpacity={0.85}
        >
          <Ionicons name="briefcase-outline" size={20} color={COLORS.primary} />
          <Text style={styles.partnerBtnText}>انضم كشريك (بائع أو مندوب)</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.primary} />
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },

  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },

  backBtn: {
    marginTop: 54,
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  brandSection: {
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 8,
  },

  brandIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#FCE7F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },

  brandName: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },

  title: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.textPrimary,
    textAlign: 'right',
    marginTop: 24,
  },

  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 28,
  },

  inputGroup: {
    marginBottom: 16,
  },

  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textAlign: 'right',
    marginBottom: 8,
  },

  inputWrapper: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    minHeight: 52,
  },

  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
    paddingVertical: 14,
  },

  inputIcon: {
    marginLeft: 10,
  },

  loginBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 8,
    gap: 10,
  },

  loginBtnDisabled: {
    opacity: 0.7,
  },

  loginBtnText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#fff',
  },

  registerLink: {
    alignItems: 'center',
    marginTop: 18,
  },

  registerLinkText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },

  registerHighlight: {
    color: COLORS.primary,
    fontWeight: '800',
  },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
    gap: 10,
  },

  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },

  dividerText: {
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: '600',
  },

  partnerBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FCE7F3',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: '#F9A8D4',
  },

  partnerBtnText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primary,
    textAlign: 'center',
  },
});

export default CustomerLoginScreen;
