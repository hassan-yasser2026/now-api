import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { COLORS } from '../../constants/colors';
import { authService } from '../../services/authService';
import PhoneInput from '../../components/PhoneInput';
import useAppStore from '../../store/appStore';

const LoginScreen = ({ navigation }) => {
  const storeCountry = useAppStore((state) => state.country);

  const [phone, setPhone] = useState('');
  const [phoneE164, setPhoneE164] = useState('');
  const [phoneValid, setPhoneValid] = useState(false);
  const [country, setCountry] = useState(storeCountry);
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [passwordFocused, setPasswordFocused] = useState(false);

  const handlePhoneChange = ({ national, e164, isValid, countryCode }) => {
    setPhone(national);
    setPhoneE164(e164);
    setPhoneValid(isValid);
    setCountry(countryCode);
  };

  // ==========================================
  // LOGIN
  // ==========================================

  const handleLogin = async () => {
    if (!phone) {
      Alert.alert('تنبيه', 'من فضلك أدخل رقم الهاتف');
      return;
    }

    if (!password) {
      Alert.alert('تنبيه', 'من فضلك أدخل كلمة المرور');
      return;
    }

    if (!phoneValid) {
      Alert.alert('تنبيه', 'رقم الهاتف غير صحيح لهذه الدولة');
      return;
    }

    try {
      setLoading(true);

      // السيرفر هو المسؤول عن تحديد Role المستخدم
      const result = await authService.login(
        phoneE164,
        password
      );

      if (!result?.success) {
        Alert.alert(
          'تعذر تسجيل الدخول',
          result?.message || 'بيانات الدخول غير صحيحة'
        );

        return;
      }

      /*
        لا نعمل navigation يدوي هنا.

        RootNavigator هو المسؤول عن قراءة
        حالة المستخدم وتحديد الشاشة المناسبة:

        CUSTOMER
        VENDOR
        DELIVERY
        ADMIN
      */

    } catch (error) {
      console.log('LOGIN SCREEN ERROR:', error);

      Alert.alert(
        'خطأ',
        'حدث خطأ غير متوقع، حاول مرة أخرى'
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // GUEST
  // ==========================================

  const handleGuestMode = () => {
    navigation.replace('GuestHome');
  };

  // ==========================================
  // REGISTER
  // ==========================================

  const handleRegister = () => {
    navigation.navigate('Register');
  };

  // ==========================================
  // ABOUT
  // ==========================================

  const handleAbout = () => {
    navigation.navigate('About');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : undefined
      }
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        {/* ======================================
            HEADER
        ====================================== */}

        <LinearGradient
          colors={[
            COLORS.primary,
            COLORS.secondary,
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.logoCircle}>
            <Ionicons
              name="flash"
              size={42}
              color="#FFFFFF"
            />
          </View>

          <Text style={styles.title}>
            ناو
          </Text>

          <Text style={styles.subtitle}>
            كل طلباتك... في مكان واحد
          </Text>
        </LinearGradient>

        {/* ======================================
            FORM
        ====================================== */}

        <View style={styles.formCard}>
          <Text style={styles.welcomeTitle}>
            أهلاً بيك 👋
          </Text>

          <Text style={styles.welcomeSubtitle}>
            سجل دخولك علشان تكمل استخدام ناو
          </Text>

          {/* ====================================
              PHONE
          ==================================== */}

          <Text style={styles.label}>
            رقم الهاتف
          </Text>

          <PhoneInput
            value={phone}
            countryCode={country}
            onChange={handlePhoneChange}
          />

          {/* ====================================
              PASSWORD
          ==================================== */}

          <Text style={styles.label}>
            كلمة المرور
          </Text>

          <View
            style={[
              styles.inputContainer,
              passwordFocused &&
                styles.inputContainerFocused,
            ]}
          >
            <Ionicons
              name="lock-closed-outline"
              size={21}
              color={
                passwordFocused
                  ? COLORS.primary
                  : COLORS.textSecondary
              }
              style={styles.inputIcon}
            />

            <TextInput
              style={styles.input}
              placeholder="أدخل كلمة المرور"
              placeholderTextColor={COLORS.textLight}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="password"
              textContentType="password"
              onFocus={() =>
                setPasswordFocused(true)
              }
              onBlur={() =>
                setPasswordFocused(false)
              }
              onSubmitEditing={handleLogin}
              returnKeyType="done"
            />

            <TouchableOpacity
              onPress={() =>
                setShowPassword(
                  (previous) => !previous
                )
              }
              style={styles.eyeButton}
              activeOpacity={0.7}
            >
              <Ionicons
                name={
                  showPassword
                    ? 'eye-outline'
                    : 'eye-off-outline'
                }
                size={21}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {/* ====================================
              LOGIN BUTTON
          ==================================== */}

          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            accessibilityLabel="تسجيل الدخول"
            activeOpacity={0.85}
            style={[
              styles.loginButton,
              loading && styles.loginButtonDisabled,
            ]}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.loginGradient}
            >
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                </View>
              ) : (
                <View style={styles.buttonContent}>
                  <Ionicons name="arrow-forward" size={26} color="#FFFFFF" />
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* ====================================
              REGISTER
          ==================================== */}

          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>
              لسه معندكش حساب؟
            </Text>

            <TouchableOpacity
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={styles.registerLink}>
                إنشاء حساب
              </Text>
            </TouchableOpacity>
          </View>

          {/* ====================================
              GUEST
          ==================================== */}

          <TouchableOpacity
            onPress={handleGuestMode}
            disabled={loading}
            style={styles.guestButton}
            activeOpacity={0.7}
          >
            <Ionicons
              name="bag-handle-outline"
              size={20}
              color={COLORS.primary}
            />

            <Text style={styles.guestText}>
              تصفح كزائر
            </Text>
          </TouchableOpacity>

          {/* ====================================
              ABOUT
          ==================================== */}

          <TouchableOpacity
            onPress={handleAbout}
            disabled={loading}
            style={styles.aboutButton}
            activeOpacity={0.7}
          >
            <Ionicons
              name="information-circle-outline"
              size={18}
              color={COLORS.textSecondary}
            />

            <Text style={styles.aboutText}>
              حول تطبيق ناو
            </Text>
          </TouchableOpacity>
        </View>

        {/* ======================================
            FOOTER
        ====================================== */}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            ناو © 2026
          </Text>

          <Text style={styles.footerSubText}>
            طلبك يوصل... في وقته
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// ==========================================
// STYLES
// ==========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  scrollContent: {
    flexGrow: 1,
    paddingBottom: 25,
  },

  // ========================================
  // HEADER
  // ========================================

  header: {
    height: 250,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 20,
    borderBottomLeftRadius: 42,
    borderBottomRightRadius: 42,
  },

  logoCircle: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },

  title: {
    color: '#FFFFFF',
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: 1,
  },

  subtitle: {
    color: '#FFFFFF',
    fontSize: 15,
    opacity: 0.9,
    marginTop: 5,
  },

  // ========================================
  // FORM
  // ========================================

  formCard: {
    backgroundColor: COLORS.background,
    marginHorizontal: 16,
    marginTop: -25,
    borderRadius: 28,
    padding: 22,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.08,
    shadowRadius: 15,

    elevation: 5,
  },

  welcomeTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'right',
    marginBottom: 5,
  },

  welcomeSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'right',
    marginBottom: 25,
  },

  label: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'right',
    marginBottom: 8,
  },

  // ========================================
  // INPUT
  // ========================================

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    marginBottom: 17,
    minHeight: 55,
  },

  inputContainerFocused: {
    borderColor: COLORS.primary,
    backgroundColor: '#FFF9FC',
  },

  inputIcon: {
    marginRight: 9,
  },

  input: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 16,
    paddingVertical: 13,
    textAlign: 'right',
  },

  eyeButton: {
    padding: 7,
    marginLeft: 5,
  },

  // ========================================
  // LOGIN BUTTON
  // ========================================

  loginButton: {
    marginTop: 5,
    borderRadius: 28,
    overflow: 'hidden',
    alignSelf: 'center',
    width: 72,
    height: 72,
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 7,
  },

  loginButtonDisabled: {
    opacity: 0.75,
  },

  loginGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },

  buttonContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ========================================
  // REGISTER
  // ========================================

  registerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 23,
    gap: 5,
  },

  registerText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },

  registerLink: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '800',
  },

  // ========================================
  // GUEST
  // ========================================

  guestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 20,
    paddingVertical: 13,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: '#FFF8FB',
  },

  guestText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '700',
  },

  // ========================================
  // ABOUT
  // ========================================

  aboutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
  },

  aboutText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },

  // ========================================
  // FOOTER
  // ========================================

  footer: {
    alignItems: 'center',
    marginTop: 20,
  },

  footerText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },

  footerSubText: {
    color: COLORS.textLight,
    fontSize: 12,
    marginTop: 4,
  },
});

export default LoginScreen;