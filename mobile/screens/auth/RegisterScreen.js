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

const RegisterScreen = ({ navigation }) => {
  const storeCountry = useAppStore((state) => state.country);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneE164, setPhoneE164] = useState('');
  const [phoneValid, setPhoneValid] = useState(false);
  const [country, setCountry] = useState(storeCountry);
  const [email, setEmail] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [role, setRole] = useState('customer');
  const [storeName, setStoreName] = useState('');

  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [nameFocused, setNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [storeFocused, setStoreFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);

  const handlePhoneChange = ({ national, e164, isValid, countryCode }) => {
    setPhone(national);
    setPhoneE164(e164);
    setPhoneValid(isValid);
    setCountry(countryCode);
  };

  // ==========================================
  // VALIDATION
  // ==========================================

  const validateForm = () => {
    const cleanName = name.trim();
    const cleanEmail = email.trim();
    const cleanStoreName = storeName.trim();

    if (!cleanName) {
      Alert.alert('تنبيه', 'من فضلك أدخل الاسم الكامل');
      return false;
    }

    if (cleanName.length < 3) {
      Alert.alert(
        'تنبيه',
        'الاسم يجب أن يكون 3 أحرف على الأقل'
      );
      return false;
    }

    if (!phone) {
      Alert.alert(
        'تنبيه',
        'من فضلك أدخل رقم الهاتف'
      );
      return false;
    }

    if (!phoneValid) {
      Alert.alert(
        'تنبيه',
        'رقم الهاتف غير صحيح لهذه الدولة'
      );
      return false;
    }

    if (cleanEmail) {
      const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(cleanEmail)) {
        Alert.alert(
          'تنبيه',
          'البريد الإلكتروني غير صحيح'
        );
        return false;
      }
    }

    if (role === 'vendor' && !cleanStoreName) {
      Alert.alert(
        'تنبيه',
        'من فضلك أدخل اسم المتجر'
      );
      return false;
    }

    if (!password) {
      Alert.alert(
        'تنبيه',
        'من فضلك أدخل كلمة المرور'
      );
      return false;
    }

    if (password.length < 8) {
      Alert.alert(
        'تنبيه',
        'كلمة المرور يجب أن تكون 8 أحرف على الأقل'
      );
      return false;
    }

    if (!confirmPassword) {
      Alert.alert(
        'تنبيه',
        'من فضلك أكد كلمة المرور'
      );
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert(
        'تنبيه',
        'كلمتا المرور غير متطابقتين'
      );
      return false;
    }

    return true;
  };

  // ==========================================
  // REGISTER
  // ==========================================

  const handleRegister = async () => {
    if (loading) return;

    if (!validateForm()) return;

    try {
      setLoading(true);

      const userData = {
        name: name.trim(),
        phone: phoneE164,
        country,
        password,
        email: email.trim() || undefined,
        role,
        ...(role === 'vendor'
          ? {
              storeName: storeName.trim(),
            }
          : {}),
      };

      let result;
      if (role === 'vendor') {
        result = await authService.registerVendor(userData);
      } else if (role === 'delivery') {
        result = await authService.registerDelivery(userData);
      } else {
        result = await authService.registerCustomer(userData);
      }

      if (!result?.success) {
        Alert.alert(
          'تعذر إنشاء الحساب',
          result?.message ||
            'حدث خطأ أثناء إنشاء الحساب'
        );

        return;
      }

      Alert.alert(
        '🎉 تم بنجاح',
        'تم إنشاء حسابك بنجاح',
        [
          {
            text: 'متابعة',
            onPress: () => {
              /*
               * لا نحدد الشاشة هنا يدويًا.
               *
               * بعد نجاح التسجيل:
               * authService -> appStore
               * RootNavigator يحدد الشاشة حسب Role.
               */
            },
          },
        ],
        {
          cancelable: false,
        }
      );
    } catch (error) {
      console.log(
        'REGISTER SCREEN ERROR:',
        error?.response?.data || error?.message
      );

      Alert.alert(
        'خطأ',
        'حدث خطأ غير متوقع، حاول مرة أخرى'
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // ROLE
  // ==========================================

  const handleRoleChange = (selectedRole) => {
    if (loading) return;

    setRole(selectedRole);

    if (selectedRole !== 'vendor') {
      setStoreName('');
    }
  };

  // ==========================================
  // LOGIN
  // ==========================================

  const goToLogin = () => {
    if (loading) return;

    navigation.navigate('Login');
  };

  // ==========================================
  // ROLE BUTTON
  // ==========================================

  const RoleButton = ({
    value,
    label,
    icon,
  }) => {
    const active = role === value;

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        disabled={loading}
        onPress={() =>
          handleRoleChange(value)
        }
        style={[
          styles.roleButton,
          active && styles.roleButtonActive,
        ]}
      >
        <View
          style={[
            styles.roleIcon,
            active && styles.roleIconActive,
          ]}
        >
          <Ionicons
            name={icon}
            size={25}
            color={
              active
                ? '#FFFFFF'
                : COLORS.textSecondary
            }
          />
        </View>

        <Text
          style={[
            styles.roleText,
            active && styles.roleTextActive,
          ]}
        >
          {label}
        </Text>

        {active && (
          <View style={styles.selectedMark}>
            <Ionicons
              name="checkmark"
              size={14}
              color="#FFFFFF"
            />
          </View>
        )}
      </TouchableOpacity>
    );
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
        contentContainerStyle={
          styles.scrollContent
        }
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
          <TouchableOpacity
            onPress={() =>
              navigation.goBack()
            }
            disabled={loading}
            style={styles.backButton}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          <View style={styles.headerContent}>
            <View style={styles.logoCircle}>
              <Ionicons
                name="person-add"
                size={34}
                color="#FFFFFF"
              />
            </View>

            <Text style={styles.headerTitle}>
              انضم إلى ناو
            </Text>

            <Text style={styles.headerSubtitle}>
              ابدأ شغلك مع منصة ناو
            </Text>
          </View>
        </LinearGradient>

        {/* ======================================
            FORM CARD
        ====================================== */}

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>
            إنشاء حساب جديد
          </Text>

          <Text style={styles.sectionSubtitle}>
            اختر نوع الحساب وأدخل بياناتك
          </Text>

          {/* ====================================
              ROLE
          ==================================== */}

          <Text style={styles.label}>
            نوع الحساب
          </Text>

          <View style={styles.rolesContainer}>
            <RoleButton
              value="customer"
              label="عميل"
              icon="bag-handle-outline"
            />

            <RoleButton
              value="vendor"
              label="بائع / مطعم"
              icon="storefront-outline"
            />

            <RoleButton
              value="delivery"
              label="مندوب توصيل"
              icon="bicycle-outline"
            />
          </View>

          {/* ====================================
              STORE
          ==================================== */}

          {role === 'vendor' && (
            <>
              <Text style={styles.label}>
                اسم المتجر
              </Text>

              <View
                style={[
                  styles.inputContainer,
                  storeFocused &&
                    styles.inputContainerFocused,
                ]}
              >
                <Ionicons
                  name="storefront-outline"
                  size={21}
                  color={
                    storeFocused
                      ? COLORS.primary
                      : COLORS.textSecondary
                  }
                  style={styles.inputIcon}
                />

                <TextInput
                  style={styles.input}
                  placeholder="مثال: مطعم ناو"
                  placeholderTextColor={
                    COLORS.textLight
                  }
                  value={storeName}
                  onChangeText={setStoreName}
                  autoCapitalize="words"
                  onFocus={() =>
                    setStoreFocused(true)
                  }
                  onBlur={() =>
                    setStoreFocused(false)
                  }
                />
              </View>
            </>
          )}

          {/* ====================================
              NAME
          ==================================== */}

          <Text style={styles.label}>
            الاسم الكامل
          </Text>

          <View
            style={[
              styles.inputContainer,
              nameFocused &&
                styles.inputContainerFocused,
            ]}
          >
            <Ionicons
              name="person-outline"
              size={21}
              color={
                nameFocused
                  ? COLORS.primary
                  : COLORS.textSecondary
              }
              style={styles.inputIcon}
            />

            <TextInput
              style={styles.input}
              placeholder="أدخل اسمك بالكامل"
              placeholderTextColor={
                COLORS.textLight
              }
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              onFocus={() =>
                setNameFocused(true)
              }
              onBlur={() =>
                setNameFocused(false)
              }
            />
          </View>

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
              EMAIL
          ==================================== */}

          <Text style={styles.label}>
            البريد الإلكتروني
            <Text style={styles.optional}>
              {' '}
              (اختياري)
            </Text>
          </Text>

          <View
            style={[
              styles.inputContainer,
              emailFocused &&
                styles.inputContainerFocused,
            ]}
          >
            <Ionicons
              name="mail-outline"
              size={21}
              color={
                emailFocused
                  ? COLORS.primary
                  : COLORS.textSecondary
              }
              style={styles.inputIcon}
            />

            <TextInput
              style={styles.input}
              placeholder="example@email.com"
              placeholderTextColor={
                COLORS.textLight
              }
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              onFocus={() =>
                setEmailFocused(true)
              }
              onBlur={() =>
                setEmailFocused(false)
              }
            />
          </View>

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
              placeholder="8 أحرف على الأقل"
              placeholderTextColor={
                COLORS.textLight
              }
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="new-password"
              textContentType="newPassword"
              onFocus={() =>
                setPasswordFocused(true)
              }
              onBlur={() =>
                setPasswordFocused(false)
              }
            />

            <TouchableOpacity
              onPress={() =>
                setShowPassword(
                  (value) => !value
                )
              }
              style={styles.eyeButton}
              disabled={loading}
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
              CONFIRM PASSWORD
          ==================================== */}

          <Text style={styles.label}>
            تأكيد كلمة المرور
          </Text>

          <View
            style={[
              styles.inputContainer,
              confirmFocused &&
                styles.inputContainerFocused,
            ]}
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={21}
              color={
                confirmFocused
                  ? COLORS.primary
                  : COLORS.textSecondary
              }
              style={styles.inputIcon}
            />

            <TextInput
              style={styles.input}
              placeholder="أعد كتابة كلمة المرور"
              placeholderTextColor={
                COLORS.textLight
              }
              value={confirmPassword}
              onChangeText={
                setConfirmPassword
              }
              secureTextEntry={
                !showConfirmPassword
              }
              autoComplete="new-password"
              textContentType="newPassword"
              onFocus={() =>
                setConfirmFocused(true)
              }
              onBlur={() =>
                setConfirmFocused(false)
              }
              onSubmitEditing={
                handleRegister
              }
              returnKeyType="done"
            />

            <TouchableOpacity
              onPress={() =>
                setShowConfirmPassword(
                  (value) => !value
                )
              }
              style={styles.eyeButton}
              disabled={loading}
            >
              <Ionicons
                name={
                  showConfirmPassword
                    ? 'eye-outline'
                    : 'eye-off-outline'
                }
                size={21}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {/* ====================================
              INFO
          ==================================== */}

          <View style={styles.infoBox}>
            <Ionicons
              name="information-circle-outline"
              size={21}
              color={COLORS.primary}
            />

            <Text style={styles.infoText}>
              بعد التسجيل سيتم إنشاء حسابك حسب نوع
              الحساب الذي اخترته.
            </Text>
          </View>

          {/* ====================================
              REGISTER BUTTON
          ==================================== */}

          <TouchableOpacity
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
            style={[
              styles.registerButton,
              loading &&
                styles.registerButtonDisabled,
            ]}
          >
            <LinearGradient
              colors={[
                COLORS.primary,
                COLORS.primaryDark,
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator
                    size="small"
                    color="#FFFFFF"
                  />

                  <Text style={styles.loadingText}>
                    جاري إنشاء الحساب...
                  </Text>
                </View>
              ) : (
                <View style={styles.buttonContent}>
                  <Text style={styles.buttonText}>
                    إنشاء الحساب
                  </Text>

                  <Ionicons
                    name="arrow-forward"
                    size={21}
                    color="#FFFFFF"
                  />
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* ====================================
              LOGIN
          ==================================== */}

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>
              لديك حساب بالفعل؟
            </Text>

            <TouchableOpacity
              onPress={goToLogin}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={styles.loginLink}>
                تسجيل الدخول
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ======================================
            FOOTER
        ====================================== */}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            ناو © 2026
          </Text>

          <Text style={styles.footerSubText}>
            شريكك في التوصيل
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
    minHeight: 230,
    paddingTop: 45,
    paddingHorizontal: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 42,
    borderBottomRightRadius: 42,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor:
      'rgba(255,255,255,0.18)',
    alignSelf: 'flex-start',
  },

  headerContent: {
    alignItems: 'center',
    marginTop: 10,
  },

  logoCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor:
      'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor:
      'rgba(255,255,255,0.25)',
    marginBottom: 10,
  },

  headerTitle: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
  },

  headerSubtitle: {
    color: '#FFFFFF',
    fontSize: 14,
    opacity: 0.9,
    marginTop: 4,
  },

  // ========================================
  // FORM
  // ========================================

  formCard: {
    backgroundColor: COLORS.background,
    marginHorizontal: 16,
    marginTop: -22,
    borderRadius: 28,
    padding: 21,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.08,
    shadowRadius: 15,

    elevation: 5,
  },

  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 25,
    fontWeight: '800',
    textAlign: 'right',
  },

  sectionSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'right',
    marginTop: 5,
    marginBottom: 23,
  },

  label: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'right',
    marginBottom: 8,
  },

  optional: {
    color: COLORS.textLight,
    fontSize: 12,
    fontWeight: '400',
  },

  // ========================================
  // ROLES
  // ========================================

  rolesContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },

  roleButton: {
    flex: 1,
    minHeight: 110,
    borderRadius: 17,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },

  roleButtonActive: {
    backgroundColor: '#FFF5FA',
    borderColor: COLORS.primary,
  },

  roleIcon: {
    width: 47,
    height: 47,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginBottom: 7,
  },

  roleIconActive: {
    backgroundColor: COLORS.primary,
  },

  roleText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },

  roleTextActive: {
    color: COLORS.primary,
  },

  selectedMark: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 23,
    height: 23,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },

  // ========================================
  // INPUT
  // ========================================

  inputContainer: {
    minHeight: 55,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    marginBottom: 17,
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
  // INFO
  // ========================================

  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: '#FFF5FA',
    borderRadius: 13,
    padding: 12,
    marginTop: 2,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#FCE4EC',
  },

  infoText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: 12.5,
    lineHeight: 19,
    textAlign: 'right',
  },

  // ========================================
  // BUTTON
  // ========================================

  registerButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },

  registerButtonDisabled: {
    opacity: 0.75,
  },

  gradientButton: {
    minHeight: 58,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },

  buttonContent: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },

  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  loadingText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  // ========================================
  // LOGIN
  // ========================================

  loginContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 22,
  },

  loginText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },

  loginLink: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '800',
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

export default RegisterScreen;