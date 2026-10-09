import React, { useRef, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import {
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { COLORS } from '../../constants/colors';
import PhoneInput from '../../components/PhoneInput';
import { authService } from '../../services/authService';
import { SELLER_LEGAL_VERSION } from '../../constants/sellerLegalDocuments';

const REQUIRED_SELLER_CONSENTS = [
  { id: 'terms', documentId: 'terms', title: 'شروط استخدام التطبيق' },
  { id: 'privacy', documentId: 'privacy', title: 'سياسة الخصوصية' },
  { id: 'seller', documentId: 'seller', title: 'اتفاقية البائع والعمولات' },
  { id: 'orders', documentId: 'orders', title: 'سياسة الطلبات والإلغاء والاسترجاع' },
];

const PARTNER_ROLES = {
  vendor: {
    title: 'بائع چودي ستار',
    subtitle: 'سجّل متجرك واعرض منتجاتك للعملاء',
    icon: 'storefront-outline',
    color: COLORS.primary,
  },
  delivery: {
    title: 'مندوب چودي ستار',
    subtitle: 'انضم لفريق التوصيل وابدأ استلام الطلبات',
    icon: 'bicycle-outline',
    color: '#2563EB',
  },
};

const optimizeWebImage = async (uri) => {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return uri;
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);
    const maxSize = 1200;
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return canvas.toDataURL('image/jpeg', 0.65);
  } catch {
    return uri;
  }
};

const normalizeImageMimeType = (mimeType) => {
  const normalized = typeof mimeType === 'string' ? mimeType.trim().toLowerCase() : '';
  return ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(normalized)
    ? normalized
    : 'image/jpeg';
};

const isSerializedImage = (value) =>
  typeof value === 'string'
  && /^data:image\/(?:jpeg|jpg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/i.test(value);

const PartnerRegistrationScreen = ({ navigation, route }) => {
  const role = route?.params?.role === 'delivery' ? 'delivery' : 'vendor';
  const [name, setName] = useState('');
  const [phoneNational, setPhoneNational] = useState('');
  const [phoneE164, setPhoneE164] = useState('');
  const [phoneValid, setPhoneValid] = useState(false);
  const [country, setCountry] = useState('EG');
  const [email, setEmail] = useState('');
  const [storeName, setStoreName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [step, setStep] = useState(1);
  const [formError, setFormError] = useState('');
  const [consents, setConsents] = useState({
    terms: false,
    privacy: false,
    seller: false,
    orders: false,
  });
  const [profileImage, setProfileImage] = useState(null);
  const [idImage, setIdImage] = useState(null);
  const [motorcycleImage, setMotorcycleImage] = useState(null);
  const [motorcycleCardImage, setMotorcycleCardImage] = useState(null);
  const [location, setLocation] = useState(null);
  const [locationLabel, setLocationLabel] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const submittingRef = useRef(false);
  const selectedRole = PARTNER_ROLES[role];

  const encodeSelectedImage = async (asset) => {
    if (Platform.OS === 'web') {
      const optimized = await optimizeWebImage(asset.uri);
      if (isSerializedImage(optimized)) return optimized;
    }
    if (typeof asset.base64 === 'string' && /^[A-Za-z0-9+/]+={0,2}$/.test(asset.base64)) {
      return `data:${normalizeImageMimeType(asset.mimeType)};base64,${asset.base64}`;
    }
    throw new Error('تعذر تجهيز الصورة للرفع. اختر الصورة مرة أخرى.');
  };

  const chooseImage = async (setImage, label) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('الصلاحية مطلوبة', `اسمح للتطبيق بالوصول إلى الصور لاختيار ${label}`);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.65,
      base64: true,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      try {
        setImage(await encodeSelectedImage(result.assets[0]));
        setFormError('');
      } catch (error) {
        setFormError(error?.message || 'تعذر تجهيز الصورة للرفع. اختر الصورة مرة أخرى.');
      }
    }
  };

  const chooseLocation = async () => {
    try {
      setLocationLoading(true);
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('الصلاحية مطلوبة', 'اسمح للتطبيق بالوصول إلى الموقع أو تابع دون تحديده الآن');
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      setLocation(position.coords);
      const addresses = await Location.reverseGeocodeAsync(position.coords);
      const address = addresses?.[0];
      const readableAddress = [
        address?.street,
        address?.district || address?.subregion,
        address?.city,
        address?.region,
      ].filter(Boolean).join('، ');
      setLocationLabel(readableAddress || 'تم تحديد موقعك على الخريطة');
    } catch {
      Alert.alert('تعذر تحديد الموقع', 'يمكنك المتابعة دون تحديد الموقع وإكمال بيانات المتجر لاحقًا.');
    } finally {
      setLocationLoading(false);
    }
  };

  const validateAccount = () => {
    if (!name.trim() || name.trim().length < 2) {
      return 'اكتب الاسم الكامل لصاحب الحساب (حرفان على الأقل).';
    }
    if (role === 'vendor' && !storeName.trim()) {
      return 'اسم المتجر مطلوب.';
    }
    if (!phoneNational.trim() || !phoneValid) {
      return 'رقم الهاتف غير صحيح. راجع الدولة ورقم الهاتف.';
    }
    if (password.length < 8) {
      return 'كلمة المرور يجب أن تتكون من 8 أحرف على الأقل.';
    }
    if (password !== confirmPassword) {
      return 'كلمتا المرور غير متطابقتين.';
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return 'البريد الإلكتروني غير صحيح، أو اتركه فارغًا لأنه اختياري.';
    }
    return '';
  };

  const continueToReview = () => {
    const error = validateAccount();
    setFormError(error);
    if (!error) setStep(2);
  };

  const submitRegistration = async () => {
    if (loading || submittingRef.current) return;
    setFormError('');
    const accountError = validateAccount();
    if (accountError) {
      setFormError(accountError);
      setStep(1);
      return;
    }
    if (role === 'vendor' && REQUIRED_SELLER_CONSENTS.some(({ id }) => !consents[id])) {
      setFormError('يجب الموافقة على المستندات الأربعة بشكل منفصل للمتابعة.');
      return;
    }
    if (
      !profileImage
      || !idImage
      || (role === 'delivery' && (!motorcycleImage || !motorcycleCardImage))
    ) {
      setFormError(
        role === 'delivery'
          ? 'النظام الحالي يتطلب الصورة الشخصية وصورة البطاقة وصورة الدراجة وبطاقتها.'
          : 'النظام الحالي يتطلب صورة شخصية وصورة بطاقة لإرسال طلب الشراكة للمراجعة.'
      );
      return;
    }
    const requiredImages = role === 'delivery'
      ? [profileImage, idImage, motorcycleImage, motorcycleCardImage]
      : [profileImage, idImage];
    if (requiredImages.some((image) => !isSerializedImage(image))) {
      setFormError('تعذر تجهيز إحدى الصور للرفع. اختر الصور المطلوبة مرة أخرى.');
      return;
    }
    const imageSize = [profileImage, idImage, motorcycleImage, motorcycleCardImage]
      .filter(Boolean)
      .reduce((total, image) => total + image.length, 0);
    if (imageSize > 1_750_000) {
      setFormError('حجم الصور كبير. اختر صورًا أصغر ثم أعد المحاولة.');
      return;
    }

    try {
      submittingRef.current = true;
      setLoading(true);
      const register = role === 'vendor'
        ? authService.registerVendor
        : authService.registerDelivery;
      const result = await register({
        name: name.trim(),
        phone: phoneE164,
        country,
        email: email.trim() || undefined,
        storeName: role === 'vendor' ? storeName.trim() : undefined,
        profileImage,
        idImage,
        motorcycleImage: role === 'delivery' ? motorcycleImage : undefined,
        motorcycleCardImage: role === 'delivery' ? motorcycleCardImage : undefined,
        latitude: location?.latitude,
        longitude: location?.longitude,
        password,
        role,
      });

      if (!result?.success) {
        setFormError(result?.message || 'تعذر إنشاء الحساب. حاول مرة أخرى.');
        return;
      }

      Alert.alert(
        result.pendingApproval ? 'تم استلام طلبك للمراجعة' : 'تم إنشاء الحساب',
        result.pendingApproval
          ? 'حسابك قيد مراجعة الإدارة. لن تتمكن من البيع قبل اعتماد الحساب والمتجر.'
          : 'تم إنشاء الحساب بنجاح.'
      );
      navigation.navigate('PartnerLogin', { role });
    } catch (error) {
      console.error('PARTNER REGISTRATION SUBMIT ERROR:', error);
      setFormError(
        error?.response?.data?.message
          || error?.message
          || 'تعذر الاتصال بالخادم. تحقق من الإنترنت وحاول مرة أخرى.'
      );
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="رجوع"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-forward" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.logo}>
          GS <Text style={styles.logoAccent}>★</Text>
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.contentScroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>انضم كشريك</Text>
        <Text style={styles.subtitle}>أنشئ حساب متجرك في خطوتين</Text>
        <View style={styles.stepIndicator}>
          {[1, 2].map((item) => (
            <View key={item} style={styles.stepItem}>
              <View style={[styles.stepDot, item <= step && { backgroundColor: selectedRole.color }]}>
                <Text style={[styles.stepNumber, item <= step && styles.stepNumberActive]}>{item}</Text>
              </View>
              <Text style={[styles.stepLabel, item === step && { color: selectedRole.color }]}>
                {item === 1 ? 'بيانات الحساب' : 'المراجعة والموافقات'}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.roleCard}>
          <View style={[styles.roleIcon, { backgroundColor: `${selectedRole.color}18` }]}>
            <Ionicons name={selectedRole.icon} size={42} color={selectedRole.color} />
          </View>
          <Text style={styles.roleTitle}>{selectedRole.title}</Text>
          <Text style={styles.roleSubtitle}>
            {step === 1 ? selectedRole.subtitle : 'راجع المستندات واستكمل متطلبات إرسال طلب المراجعة'}
          </Text>

          <View style={styles.form}>
            {step === 1 ? (
              <>
                <Text style={styles.fieldLabel}>الاسم الكامل لصاحب الحساب *</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="person-outline" size={20} color={selectedRole.color} />
                  <TextInput
                    accessibilityLabel="الاسم الكامل لصاحب الحساب"
                    style={styles.input}
                    placeholder="مثال: أحمد محمد"
                    placeholderTextColor={COLORS.textLight}
                    autoComplete="name"
                    value={name}
                    onChangeText={setName}
                  />
                </View>

                {role === 'vendor' && (
                  <>
                    <Text style={styles.fieldLabel}>اسم المتجر *</Text>
                    <View style={styles.inputRow}>
                      <Ionicons name="storefront-outline" size={20} color={selectedRole.color} />
                      <TextInput
                        accessibilityLabel="اسم المتجر"
                        style={styles.input}
                        placeholder="الاسم الذي سيظهر للعملاء"
                        placeholderTextColor={COLORS.textLight}
                        value={storeName}
                        onChangeText={setStoreName}
                      />
                    </View>
                  </>
                )}

                <Text style={styles.fieldLabel}>رقم الهاتف *</Text>
                <PhoneInput
                  value={phoneNational}
                  countryCode={country}
                  onChange={({ national, e164, isValid, countryCode }) => {
                    setPhoneNational(national);
                    setPhoneE164(e164);
                    setPhoneValid(isValid);
                    setCountry(countryCode);
                  }}
                />

                <Text style={styles.fieldLabel}>كلمة المرور *</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="lock-closed-outline" size={20} color={selectedRole.color} />
                  <TextInput
                    accessibilityLabel="كلمة المرور"
                    style={styles.input}
                    placeholder="8 أحرف على الأقل"
                    placeholderTextColor={COLORS.textLight}
                    secureTextEntry={!showPassword}
                    autoComplete="new-password"
                    value={password}
                    onChangeText={setPassword}
                  />
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                    onPress={() => setShowPassword((value) => !value)}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                      size={20}
                      color={COLORS.textSecondary}
                    />
                  </TouchableOpacity>
                </View>

                <Text style={styles.fieldLabel}>تأكيد كلمة المرور *</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="lock-closed-outline" size={20} color={selectedRole.color} />
                  <TextInput
                    accessibilityLabel="تأكيد كلمة المرور"
                    style={styles.input}
                    placeholder="أعد كتابة كلمة المرور"
                    placeholderTextColor={COLORS.textLight}
                    secureTextEntry={!showConfirmPassword}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                  />
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={showConfirmPassword ? 'إخفاء تأكيد كلمة المرور' : 'إظهار تأكيد كلمة المرور'}
                    onPress={() => setShowConfirmPassword((value) => !value)}
                  >
                    <Ionicons
                      name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                      size={20}
                      color={COLORS.textSecondary}
                    />
                  </TouchableOpacity>
                </View>

                <Text style={styles.fieldLabel}>البريد الإلكتروني (اختياري)</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="mail-outline" size={20} color={selectedRole.color} />
                  <TextInput
                    accessibilityLabel="البريد الإلكتروني اختياري"
                    style={styles.input}
                    placeholder="name@example.com"
                    placeholderTextColor={COLORS.textLight}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>
              </>
            ) : (
              <>
                <View style={styles.noteCard}>
                  <Ionicons name="information-circle-outline" size={21} color={COLORS.primary} />
                  <Text style={styles.noteText}>
                    التسجيل الحالي يحفظ اسم المتجر فقط، ولا يحفظ عنوانًا نصيًا أو تصنيف النشاط أو ساعات العمل. الإحداثيات الاختيارية تُرسل ضمن بيانات صاحب الحساب، وليست عنوانًا محفوظًا للمتجر.
                  </Text>
                </View>

                <Text style={styles.sectionHeading}>مرفقات طلب المراجعة</Text>
                <Text style={styles.helperText}>
                  واجهة التسجيل الحالية والخادم يشترطان صورة شخصية وصورة بطاقة للشريك. لا ترفق مستندات ضريبية أو تجارية غير مطلوبة.
                </Text>
                <TouchableOpacity
                  style={styles.inputRow}
                  onPress={() => chooseImage(setProfileImage, 'الصورة الشخصية')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={profileImage ? 'checkmark-circle-outline' : 'person-circle-outline'}
                    size={22}
                    color={selectedRole.color}
                  />
                  <Text style={styles.actionText}>
                    {profileImage ? 'تم اختيار الصورة الشخصية' : 'الصورة الشخصية (مطلوبة حاليًا بالنظام)'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.inputRow}
                  onPress={() => chooseImage(setIdImage, 'صورة البطاقة')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={idImage ? 'checkmark-circle-outline' : 'camera-outline'}
                    size={22}
                    color={selectedRole.color}
                  />
                  <Text style={styles.actionText}>
                    {idImage ? 'تم اختيار صورة البطاقة' : 'صورة البطاقة (مطلوبة حاليًا بالنظام)'}
                  </Text>
                </TouchableOpacity>

                <Text style={styles.sectionHeading}>موقع النشاط (اختياري الآن)</Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="تحديد موقع النشاط اختياريًا"
                  style={styles.inputRow}
                  onPress={chooseLocation}
                  disabled={locationLoading}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={location ? 'checkmark-circle-outline' : 'location-outline'}
                    size={22}
                    color={selectedRole.color}
                  />
                  <Text style={styles.actionText}>
                    {location ? locationLabel : 'يمكنك تحديد موقع النشاط'}
                  </Text>
                  {locationLoading ? (
                    <ActivityIndicator size="small" color={selectedRole.color} />
                  ) : (
                    <Ionicons name="navigate-outline" size={22} color={selectedRole.color} />
                  )}
                </TouchableOpacity>

                {role === 'delivery' && (
                  <>
                <TouchableOpacity
                  style={styles.inputRow}
                  onPress={() => chooseImage(setMotorcycleImage, 'صورة المتوسكل')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={motorcycleImage ? 'checkmark-circle-outline' : 'bicycle-outline'}
                    size={22}
                    color={selectedRole.color}
                  />
                  <Text style={[styles.actionText, motorcycleImage && { color: selectedRole.color }]}>
                    {motorcycleImage ? 'تم اختيار صورة المتوسكل' : 'صورة المتوسكل (إجباري)'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.inputRow}
                  onPress={() => chooseImage(setMotorcycleCardImage, 'بطاقة المتوسكل')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={motorcycleCardImage ? 'checkmark-circle-outline' : 'document-text-outline'}
                    size={22}
                    color={selectedRole.color}
                  />
                  <Text style={[styles.actionText, motorcycleCardImage && { color: selectedRole.color }]}>
                    {motorcycleCardImage
                      ? 'تم اختيار صورة بطاقة المتوسكل'
                      : 'صورة بطاقة المتوسكل (إجباري)'}
                  </Text>
                </TouchableOpacity>
                  </>
                )}

                {role === 'vendor' && (
                  <View style={styles.legalSection}>
                    <Text style={styles.sectionHeading}>الموافقات المطلوبة</Text>
                    <Text style={styles.helperText}>
                      اقرأ كل مستند، ثم اختر الموافقة المناسبة بنفسك. لا توجد موافقات محددة مسبقًا.
                    </Text>
                    {REQUIRED_SELLER_CONSENTS.map((consent) => (
                      <View key={consent.id} style={styles.consentCard}>
                        <TouchableOpacity
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: consents[consent.id] }}
                          onPress={() => {
                            setConsents((current) => ({
                              ...current,
                              [consent.id]: !current[consent.id],
                            }));
                            setFormError('');
                          }}
                          style={styles.consentToggle}
                        >
                          <Ionicons
                            name={consents[consent.id] ? 'checkbox' : 'square-outline'}
                            size={23}
                            color={consents[consent.id] ? selectedRole.color : COLORS.textLight}
                          />
                          <Text style={styles.consentTitle}>{consent.title}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          accessibilityRole="link"
                          onPress={() => navigation.navigate('SellerLegalDocument', {
                            documentId: consent.documentId,
                          })}
                          style={styles.documentLink}
                        >
                          <Text style={styles.documentLinkText}>قراءة المستند</Text>
                          <Ionicons name="open-outline" size={15} color={selectedRole.color} />
                        </TouchableOpacity>
                      </View>
                    ))}
                    <Text style={styles.legalVersion}>
                      إصدار المستندات: {SELLER_LEGAL_VERSION}
                    </Text>
                    <Text style={styles.legalNotice}>
                      ملاحظة: الواجهة تفرض الموافقة قبل الإرسال، لكن الـBackend الحالي لا يحفظ إصدار المستند أو تاريخ الموافقة كسجل تدقيقي.
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>
        </View>

        {formError ? (
          <View accessibilityRole="alert" style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={20} color={COLORS.error} />
            <Text style={styles.errorText}>{formError}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.continueButton, { backgroundColor: selectedRole.color }]}
          onPress={step === 1 ? continueToReview : submitRegistration}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <>
              <ActivityIndicator color={COLORS.white} />
              <Text style={styles.continueText}>جارٍ إرسال الطلب...</Text>
            </>
          ) : (
            <>
              <Text style={styles.continueText}>
                {step === 1 ? 'متابعة إلى المراجعة' : 'إرسال طلب التسجيل'}
              </Text>
              <Ionicons name={step === 1 ? 'arrow-back' : 'checkmark'} size={20} color={COLORS.white} />
            </>
          )}
        </TouchableOpacity>

        {step === 2 && (
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => {
              setFormError('');
              setStep(1);
            }}
            style={styles.backStepButton}
          >
            <Text style={styles.backStepText}>العودة لتعديل بيانات الحساب</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.loginLink}
          onPress={() => navigation.navigate('PartnerLogin', { role })}
          activeOpacity={0.7}
        >
          <Text style={styles.loginPrompt}>لديك حساب شريك بالفعل؟</Text>
          <Text style={[styles.loginLinkText, { color: selectedRole.color }]}>
            تسجيل الدخول
          </Text>
        </TouchableOpacity>
      </ScrollView>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  backButton: { padding: 6 },
  headerSpacer: { width: 36 },
  logo: { fontSize: 34, fontWeight: '900', color: COLORS.primary },
  logoAccent: { color: COLORS.accent },
  contentScroll: { flex: 1 },
  content: { flexGrow: 1, padding: 20, paddingBottom: 28 },
  stepIndicator: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 4,
  },
  stepItem: { flex: 1, alignItems: 'center', gap: 7 },
  stepDot: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: COLORS.border,
  },
  stepNumber: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '800' },
  stepNumberActive: { color: COLORS.white },
  stepLabel: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  title: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 24,
    textAlign: 'center',
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  switcher: {
    flexDirection: 'row',
    gap: 10,
    padding: 5,
    borderRadius: 18,
    backgroundColor: '#E5E7EB',
  },
  roleTab: {
    flex: 1,
    minHeight: 76,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 14,
  },
  roleTabText: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  activeTabText: { color: COLORS.white },
  roleCard: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    marginTop: 16,
    padding: 22,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  roleIcon: {
    width: 82,
    height: 82,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 41,
  },
  roleTitle: { marginTop: 14, fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  roleSubtitle: {
    marginTop: 6,
    textAlign: 'center',
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  form: { width: '100%', marginTop: 20, gap: 10 },
  fieldLabel: {
    marginTop: 4,
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
  },
  sectionHeading: {
    marginTop: 10,
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'right',
  },
  helperText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 20,
    textAlign: 'right',
  },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    padding: 12,
  },
  noteText: { flex: 1, color: COLORS.primaryDark, fontSize: 13, lineHeight: 21, textAlign: 'right' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
  },
  input: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 15,
    textAlign: 'right',
  },
  actionText: { flex: 1, color: COLORS.textSecondary, fontSize: 15, textAlign: 'right' },
  legalSection: { gap: 10, marginTop: 6 },
  consentCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 13,
    backgroundColor: COLORS.surface,
    padding: 11,
  },
  consentToggle: { flexDirection: 'row', alignItems: 'center', gap: 9, minHeight: 36 },
  consentTitle: { flex: 1, color: COLORS.textPrimary, fontSize: 13, fontWeight: '700', textAlign: 'right' },
  documentLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 5, marginTop: 8, paddingVertical: 4 },
  documentLinkText: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
  legalVersion: { color: COLORS.textLight, fontSize: 11, textAlign: 'right' },
  legalNotice: {
    borderRadius: 10,
    backgroundColor: '#FFF9E9',
    color: '#684A13',
    fontSize: 11,
    lineHeight: 18,
    padding: 10,
    textAlign: 'right',
  },
  errorCard: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1C7C7',
    backgroundColor: '#FFF5F5',
    padding: 12,
  },
  errorText: { flex: 1, color: COLORS.error, fontSize: 13, lineHeight: 21, textAlign: 'right' },
  backStepButton: { alignItems: 'center', paddingVertical: 12 },
  backStepText: { color: COLORS.primary, fontSize: 13, fontWeight: '700' },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 24,
    paddingVertical: 15,
    borderRadius: 14,
  },
  continueText: { color: COLORS.white, fontSize: 16, fontWeight: '800' },
  loginLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
    marginTop: 18,
    paddingVertical: 10,
  },
  loginPrompt: { color: COLORS.textSecondary, fontSize: 14 },
  loginLinkText: { fontSize: 14, fontWeight: '800' },
});

export default PartnerRegistrationScreen;
// مسودة المشروع - البشمهندس حسن ياسر
