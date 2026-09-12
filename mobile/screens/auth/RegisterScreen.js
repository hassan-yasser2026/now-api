import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

import { COLORS } from '../../constants/colors';
import { authService } from '../../services/authService';
import PhoneInput from '../../components/PhoneInput';
import useAppStore from '../../store/appStore';
import { getCurrentLocation } from '../../utils/location';

const RegisterScreen = ({ navigation, route }) => {
  const role = route?.params?.role === 'vendor' || route?.params?.role === 'delivery'
    ? route.params.role
    : 'customer';
  const roleTitle = role === 'vendor'
    ? 'تسجيل بائع NOW'
    : role === 'delivery'
      ? 'تسجيل مندوب NOW'
      : 'إنشاء حساب جديد';
  const storeCountry = useAppStore((state) => state.country);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneE164, setPhoneE164] = useState('');
  const [phoneValid, setPhoneValid] = useState(false);
  const [country, setCountry] = useState(storeCountry);
  const [email, setEmail] = useState('');
  const [storeName, setStoreName] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [profileImage, setProfileImage] = useState(null);
  const [location, setLocation] = useState(null);

  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [nameFocused, setNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);

  const handlePhoneChange = ({ national, e164, isValid, countryCode }) => {
    setPhone(national);
    setPhoneE164(e164);
    setPhoneValid(isValid);
    setCountry(countryCode);
  };

  const pickProfileImage = async () => {
    if (loading) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'السماح بالصور مطلوب',
        'اسمح للتطبيق بالوصول إلى الصور لاختيار الصورة الشخصية.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const pickLocation = async () => {
    if (loading) return;

    try {
      const point = await getCurrentLocation();
      setLocation(point);
      Alert.alert('تم تحديد الموقع', 'تم حفظ موقعك الحالي بنجاح.');
    } catch (error) {
      Alert.alert(
        'تعذر تحديد الموقع',
        error?.message || 'اسمح بالوصول إلى الموقع ثم حاول مرة أخرى.'
      );
    }
  };

  // ==========================================
  // VALIDATION
  // ==========================================

  const validateForm = () => {
    const cleanName = name.trim();
    const cleanEmail = email.trim();

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
        storeName: role === 'vendor' ? storeName.trim() || undefined : undefined,
        role,
        profileImage: profileImage || undefined,
        latitude: location?.latitude,
        longitude: location?.longitude,
      };

      const register = role === 'vendor'
        ? authService.registerVendor
        : role === 'delivery'
          ? authService.registerDelivery
          : authService.registerCustomer;
      const result = await register(userData);

      if (!result?.success) {
        Alert.alert(
          'تعذر إنشاء الحساب',
          result?.message ||
            'حدث خطأ أثناء إنشاء الحساب'
        );

        return;
      }

      if (role === 'customer' && result.phoneVerificationRequired) {
        navigation.navigate('VerifyPhone', { phone: phoneE164 });
      } else {
        Alert.alert(
          result.pendingApproval ? 'تم استلام طلب التسجيل' : 'تم بنجاح',
          result.pendingApproval
            ? 'حسابك في انتظار مراجعة الإدارة لمدة تصل إلى 48 ساعة. ستتمكن من الدخول بعد الموافقة.'
            : 'تم إنشاء حسابك بنجاح',
          [{ text: 'حسنًا' }],
          { cancelable: false }
        );
      }
    } catch (error) {
      console.log(
        'REGISTER SCREEN ERROR:',
        error?.response?.data || error?.message
      );

      Alert.alert(
        'خطأ',
        error?.response?.data?.message
          || error?.message
          || 'حدث خطأ غير متوقع، حاول مرة أخرى'
      );
    } finally {
      setLoading(false);
    }
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

        <View style={styles.header}>
          <TouchableOpacity
            onPress={() =>
              navigation.goBack()
            }
            disabled={loading}
            style={styles.backButton}
          >
            <Ionicons name="arrow-forward" size={24} color="#111827" />
          </TouchableOpacity>

          <View style={styles.headerContent}>
            <Text style={styles.logoText}>
              <Text style={styles.logoNow}>N</Text>
              <Text style={styles.logoBlack}>OW</Text>
            </Text>
          </View>
        </View>

        {/* ======================================
            FORM CARD
        ====================================== */}

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>
            {roleTitle}
          </Text>

          <Text style={styles.sectionSubtitle}>
            أدخل بياناتك لإنشاء حسابك في NOW
          </Text>

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

          <Text style={styles.label}>
            الموقع
            <Text style={styles.optional}> (اختياري)</Text>
          </Text>

          <TouchableOpacity
            style={[styles.optionalPicker, location && styles.optionalPickerSelected]}
            onPress={pickLocation}
            disabled={loading}
          >
            <Ionicons
              name={location ? 'checkmark-circle-outline' : 'location-outline'}
              size={22}
              color="#27B8D5"
            />
            <Text style={styles.optionalPickerText}>
              {location ? 'تم تحديد موقعك' : 'تحديد موقعي'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.label}>
            الصورة الشخصية
            <Text style={styles.optional}> (اختياري)</Text>
          </Text>

          <TouchableOpacity
            style={[styles.optionalPicker, profileImage && styles.optionalPickerSelected]}
            onPress={pickProfileImage}
            disabled={loading}
          >
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profilePreview} />
            ) : (
              <Ionicons name="camera-outline" size={22} color="#27B8D5" />
            )}
            <Text style={styles.optionalPickerText}>
              {profileImage ? 'تم اختيار الصورة' : 'اختيار صورة شخصية'}
            </Text>
          </TouchableOpacity>

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
              البريد الإلكتروني والموقع والصورة الشخصية بيانات اختيارية ويمكنك إضافتها لاحقًا.
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

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>
              لديك حساب بالفعل؟
            </Text>

            <TouchableOpacity
              onPress={() => navigation.navigate(role === 'customer' ? 'Login' : 'PartnerLogin', role === 'customer' ? undefined : { role })}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={styles.loginLink}>
                {role === 'customer' ? 'تسجيل الدخول' : 'تسجيل دخول الشريك'}
              </Text>
            </TouchableOpacity>
          </View>

        </View>

      </ScrollView>

      <View style={styles.bottomNav}>
        {[
          { key: 'account', label: 'حسابي', icon: 'person-outline' },
          { key: 'home', label: 'الرئيسية', icon: 'home-outline' },
          { key: 'orders', label: 'طلباتك', icon: 'receipt-outline' },
          { key: 'about', label: 'عنا', icon: 'people-outline' },
        ].map((item) => (
          <TouchableOpacity
            key={item.key}
            style={styles.bottomNavItem}
            onPress={() => {
              const routeNames = navigation.getState()?.routeNames || [];
              if (item.key === 'about' && routeNames.includes('About')) {
                navigation.navigate('About');
              } else if (
                item.key === 'home' &&
                routeNames.includes('GuestHome')
              ) {
                navigation.navigate('GuestHome');
              } else if (item.key === 'account') {
                navigation.navigate('Login');
              } else if (item.key === 'orders') {
                navigation.navigate('Login');
              }
            }}
          >
            <Ionicons
              name={item.icon}
              size={22}
              color="#6FAEC0"
            />
            <Text
              style={[
                styles.bottomNavLabel,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </KeyboardAvoidingView>
  );
};

// ==========================================
// STYLES
// ==========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  scrollContent: {
    flexGrow: 1,
    paddingBottom: 18,
  },

  // ========================================
  // HEADER
  // ========================================

  header: {
    minHeight: 205,
    paddingTop: 32,
    paddingHorizontal: 18,
    paddingBottom: 18,
    backgroundColor: '#B9F2FB',
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.65)',
    alignSelf: 'flex-start',
  },

  headerContent: {
    alignItems: 'center',
    marginTop: 4,
  },

  logoText: {
    fontSize: 62,
    fontWeight: '900',
    letterSpacing: -5,
    marginBottom: 12,
  },

  logoNow: {
    color: '#E51B2B',
  },

  logoBlack: {
    color: '#0E1114',
  },

  // ========================================
  // FORM
  // ========================================

  formCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 24,
    padding: 12,
  },

  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 23,
    fontWeight: '800',
    textAlign: 'right',
  },

  sectionSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'right',
    marginTop: 5,
    marginBottom: 17,
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

  optionalPicker: {
    minHeight: 58,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 29,
    borderWidth: 2,
    borderColor: '#D8D8D8',
    backgroundColor: COLORS.surface,
    marginBottom: 15,
    overflow: 'hidden',
  },

  optionalPickerSelected: {
    borderColor: '#65C9DE',
    backgroundColor: '#F3FDFF',
  },

  optionalPickerText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: '700',
  },

  profilePreview: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },

  // ========================================
  // INPUT
  // ========================================

  inputContainer: {
    minHeight: 61,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: '#D8D8D8',
    borderRadius: 31,
    paddingHorizontal: 16,
    marginBottom: 15,
  },

  inputContainerFocused: {
    borderColor: '#65C9DE',
    backgroundColor: '#FFFFFF',
  },

  inputIcon: {
    marginLeft: 9,
    color: '#65C9DE',
  },

  input: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 16,
    paddingVertical: 13,
    textAlign: 'right',
  },

  idCardPicker: {
    minHeight: 82,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#D8D8D8',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },

  idCardPickerSelected: {
    borderColor: '#65C9DE',
    borderStyle: 'solid',
  },

  idCardPlaceholder: {
    color: '#65C9DE',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },

  idCardPreview: {
    width: '100%',
    height: 145,
    resizeMode: 'cover',
  },

  eyeButton: {
    padding: 7,
    marginRight: 5,
  },

  // ========================================
  // INFO
  // ========================================

  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: '#EAFBFE',
    borderRadius: 13,
    padding: 12,
    marginTop: 2,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#B9EAF2',
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
    borderRadius: 30,
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

  bottomNav: {
    minHeight: 76,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5F5F8',
    paddingHorizontal: 5,
    paddingBottom: Platform.OS === 'ios' ? 10 : 3,
  },

  bottomNavItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },

  bottomNavLabel: {
    color: '#6FAEC0',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },

  bottomNavLabelActive: {
    color: '#27B8D5',
  },

  loginContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 18,
  },

  loginText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },

  loginLink: {
    color: '#27B8D5',
    fontSize: 14,
    fontWeight: '800',
  },
});

export default RegisterScreen;