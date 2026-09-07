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

const RegisterScreen = ({ navigation, route }) => {
  const storeCountry = useAppStore((state) => state.country);
  const initialRole = route?.params?.role === 'vendor' ? 'vendor' : 'customer';

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneE164, setPhoneE164] = useState('');
  const [phoneValid, setPhoneValid] = useState(false);
  const [country, setCountry] = useState(storeCountry);
  const [email, setEmail] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [role, setRole] = useState(initialRole);
  const [storeName, setStoreName] = useState('');
  const [idCardImage, setIdCardImage] = useState(null);

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

  const pickIdCardImage = async () => {
    if (loading) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'السماح بالصور مطلوب',
        'اسمح للتطبيق بالوصول إلى الصور لاختيار صورة البطاقة.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setIdCardImage(result.assets[0].uri);
    }
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
            idCardImage,
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

      if (role === 'vendor') {
        Alert.alert(
          '🎉 تم بنجاح',
          'تم استلام طلب انضمامك كشريك. سيظل حسابك داخل شاشة الشراكة لحين استكمال المراجعة.',
          [{ text: 'حسناً' }],
          { cancelable: false }
        );
        return;
      }

      Alert.alert(
        '🎉 تم بنجاح',
        'تم إنشاء حسابك بنجاح',
        [
          {
            text: 'حسناً',
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

  const goToPartnerLogin = () => {
    if (loading) return;

    navigation.navigate('PartnerLogin');
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
            انضم كشريك
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
              value="vendor"
              label="بائع NOW"
              icon="storefront-outline"
            />

            <RoleButton
              value="delivery"
              label="مندوب NOW"
              icon="bicycle-outline"
            />
            {initialRole !== 'vendor' && (
              <RoleButton
                value="customer"
                label="عميل"
                icon="bag-handle-outline"
              />
            )}
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

              <Text style={styles.label}>
                صورة البطاقة
              </Text>

              <TouchableOpacity
                style={[
                  styles.idCardPicker,
                  idCardImage && styles.idCardPickerSelected,
                ]}
                onPress={pickIdCardImage}
                disabled={loading}
                activeOpacity={0.8}
              >
                {idCardImage ? (
                  <Image
                    source={{ uri: idCardImage }}
                    style={styles.idCardPreview}
                  />
                ) : (
                  <>
                    <Ionicons
                      name="camera-outline"
                      size={27}
                      color="#65C9DE"
                    />
                    <Text style={styles.idCardPlaceholder}>
                      اضغط لاختيار صورة البطاقة
                    </Text>
                  </>
                )}
              </TouchableOpacity>
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

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>
              لديك حساب شريك بالفعل؟
            </Text>

            <TouchableOpacity
              onPress={goToPartnerLogin}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={styles.loginLink}>
                تسجيل دخول الشريك
              </Text>
            </TouchableOpacity>
          </View>

        </View>

      </ScrollView>

      <View style={styles.bottomNav}>
        {[
          { key: 'account', label: 'حسابي', icon: 'person-outline' },
          { key: 'partner', label: 'انضم كشريك', icon: 'hand-left-outline' },
          { key: 'home', label: 'الرئيسية', icon: 'home-outline' },
          { key: 'orders', label: 'طلباتك', icon: 'receipt-outline' },
          { key: 'about', label: 'عنا', icon: 'people-outline' },
        ].map((item) => (
          <TouchableOpacity
            key={item.key}
            style={styles.bottomNavItem}
            onPress={() => {
              const routeNames = navigation.getState()?.routeNames || [];
              if (item.key === 'partner') return;
              if (item.key === 'about' && routeNames.includes('About')) {
                navigation.navigate('About');
              } else if (
                item.key === 'home' &&
                routeNames.includes('GuestHome')
              ) {
                navigation.navigate('GuestHome');
              } else if (
                item.key === 'home' &&
                routeNames.includes('CustomerTabs')
              ) {
                navigation.navigate('CustomerTabs');
              } else if (
                item.key === 'orders' &&
                routeNames.includes('Orders')
              ) {
                navigation.navigate('Orders');
              } else if (item.key === 'account') {
                navigation.navigate('Register', { role: 'customer' });
              }
            }}
          >
            <Ionicons
              name={item.icon}
              size={22}
              color={item.key === 'partner' ? '#27B8D5' : '#6FAEC0'}
            />
            <Text
              style={[
                styles.bottomNavLabel,
                item.key === 'partner' && styles.bottomNavLabelActive,
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

  // ========================================
  // ROLES
  // ========================================

  rolesContainer: {
    flexDirection: 'row',
    gap: 0,
    marginBottom: 19,
    borderRadius: 28,
    backgroundColor: '#32B7D7',
    padding: 2,
  },

  roleButton: {
    flex: 1,
    minHeight: 55,
    borderRadius: 27,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },

  roleButtonActive: {
    backgroundColor: '#FFFFFF',
  },

  roleIcon: {
    display: 'none',
    width: 0,
    height: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    marginBottom: 0,
  },

  roleIconActive: {
    backgroundColor: 'transparent',
  },

  roleText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },

  roleTextActive: {
    color: '#333333',
  },

  selectedMark: {
    position: 'absolute',
    display: 'none',
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