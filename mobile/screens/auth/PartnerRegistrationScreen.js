import React, { useState } from 'react';
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
import useAppStore from '../../store/appStore';
import { authService } from '../../services/authService';

const PARTNER_ROLES = {
  vendor: {
    title: 'بائع NOW',
    subtitle: 'سجّل متجرك واعرض منتجاتك للعملاء',
    icon: 'storefront-outline',
    color: '#0B8FA3',
  },
  delivery: {
    title: 'مندوب NOW',
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

const PartnerRegistrationScreen = ({ navigation, route }) => {
  const role = route?.params?.role === 'delivery' ? 'delivery' : 'vendor';
  const [name, setName] = useState('');
  const [phoneNational, setPhoneNational] = useState('');
  const [phoneE164, setPhoneE164] = useState('');
  const [phoneValid, setPhoneValid] = useState(false);
  const [country, setCountry] = useState(useAppStore.getState().country);
  const [email, setEmail] = useState('');
  const [storeName, setStoreName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [idImage, setIdImage] = useState(null);
  const [motorcycleImage, setMotorcycleImage] = useState(null);
  const [motorcycleCardImage, setMotorcycleCardImage] = useState(null);
  const [location, setLocation] = useState(null);
  const [locationLabel, setLocationLabel] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const selectedRole = PARTNER_ROLES[role];

  const chooseImage = async (setImage, label) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('الصلاحية مطلوبة', `اسمح للتطبيق بالوصول إلى الصور لاختيار ${label}`);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setImage(await optimizeWebImage(result.assets[0].uri));
    }
  };

  const chooseLocation = async () => {
    try {
      setLocationLoading(true);
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('الصلاحية مطلوبة', 'اسمح للتطبيق بالوصول إلى موقعك أو اكتب العنوان يدويًا');
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
      Alert.alert('تعذر تحديد الموقع', 'اكتب عنوانك يدويًا في خانة الموقع');
    } finally {
      setLocationLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim() || !phoneValid || password.length < 8) {
      Alert.alert('تنبيه', 'الاسم والهاتف وكلمة مرور من 8 أحرف على الأقل مطلوبة');
      return;
    }
    if (role === 'vendor' && !storeName.trim()) {
      Alert.alert('تنبيه', 'اسم المتجر مطلوب للبائع');
      return;
    }
    if (
      !profileImage
      || !idImage
      || (role === 'delivery' && (!motorcycleImage || !motorcycleCardImage))
      || !locationLabel.trim()
    ) {
      Alert.alert(
        'تنبيه',
        role === 'delivery'
          ? 'الصورة الشخصية والبطاقة وصورة المتوسكل وبطاقة المتوسكل والعنوان أو الموقع مطلوبة لإكمال التسجيل'
          : 'الصورة الشخصية والبطاقة والعنوان أو الموقع مطلوبة لإكمال التسجيل'
      );
      return;
    }

    try {
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
        Alert.alert('تعذر إنشاء الحساب', result?.message || 'حاول مرة أخرى');
        return;
      }

      Alert.alert(
        'تم استلام طلب التسجيل',
        result.pendingApproval
          ? 'حسابك في انتظار مراجعة الإدارة لمدة تصل إلى 48 ساعة. ستتمكن من الدخول بعد الموافقة.'
          : 'تم إنشاء حسابك بنجاح'
      );
      navigation.navigate('PartnerLogin');
    } catch (error) {
      Alert.alert(
        'خطأ',
        error?.response?.data?.message
          || error?.message
          || 'تعذر الاتصال بالخادم، حاول مرة أخرى'
      );
    } finally {
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
          <Text style={styles.logoAccent}>N</Text>OW
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
        <Text style={styles.subtitle}>اختار نوع الحساب الذي تريد التسجيل به</Text>

        <View style={styles.roleCard}>
          <View style={[styles.roleIcon, { backgroundColor: `${selectedRole.color}18` }]}>
            <Ionicons name={selectedRole.icon} size={42} color={selectedRole.color} />
          </View>
          <Text style={styles.roleTitle}>{selectedRole.title}</Text>
          <Text style={styles.roleSubtitle}>{selectedRole.subtitle}</Text>

          <View style={styles.form}>
            <View style={styles.inputRow}>
              <Ionicons name="person-outline" size={20} color={selectedRole.color} />
              <TextInput
                style={styles.input}
                placeholder="الاسم الكامل"
                placeholderTextColor={COLORS.textLight}
                value={name}
                onChangeText={setName}
              />
            </View>

            {role === 'vendor' && (
              <View style={styles.inputRow}>
                <Ionicons name="storefront-outline" size={20} color={selectedRole.color} />
                <TextInput
                  style={styles.input}
                  placeholder="اسم المتجر (إجباري)"
                  placeholderTextColor={COLORS.textLight}
                  value={storeName}
                  onChangeText={setStoreName}
                />
              </View>
            )}

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

            <View style={styles.inputRow}>
              <Ionicons name="lock-closed-outline" size={20} color={selectedRole.color} />
              <TextInput
                style={styles.input}
                placeholder="كلمة المرور"
                placeholderTextColor={COLORS.textLight}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword((value) => !value)}>
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.inputRow}>
              <Ionicons name="mail-outline" size={20} color={selectedRole.color} />
              <TextInput
                style={styles.input}
                placeholder="البريد الإلكتروني (اختياري)"
                placeholderTextColor={COLORS.textLight}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

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
              <Text style={[styles.actionText, profileImage && { color: selectedRole.color }]}>
                {profileImage ? 'تم اختيار الصورة الشخصية' : 'الصورة الشخصية (إجباري)'}
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
              <Text style={[styles.actionText, idImage && { color: selectedRole.color }]}>
                {idImage ? 'تم اختيار صورة البطاقة' : 'صورة البطاقة (إجباري)'}
              </Text>
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

            <View style={styles.inputRow}>
              <Ionicons
                name={location ? 'checkmark-circle-outline' : 'location-outline'}
                size={22}
                color={selectedRole.color}
              />
              <TextInput
                style={styles.input}
                placeholder="اكتب العنوان أو حدد موقعك"
                placeholderTextColor={COLORS.textLight}
                value={locationLabel}
                onChangeText={(value) => {
                  setLocationLabel(value);
                  setLocation(null);
                }}
              />
              <TouchableOpacity onPress={chooseLocation} disabled={locationLoading}>
                {locationLoading ? (
                  <ActivityIndicator size="small" color={selectedRole.color} />
                ) : (
                  <Ionicons name="navigate-outline" size={22} color={selectedRole.color} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.continueButton, { backgroundColor: selectedRole.color }]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Text style={styles.continueText}>إنشاء الحساب</Text>
              <Ionicons name="arrow-back" size={20} color={COLORS.white} />
            </>
          )}
        </TouchableOpacity>

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

      <View style={styles.bottomNav}>
        {[
          ['account', 'حسابي', 'person-outline'],
          ['partner', 'انضم كشريك', 'hand-left-outline'],
          ['home', 'الرئيسية', 'home-outline'],
          ['orders', 'طلباتك', 'receipt-outline'],
          ['about', 'عني', 'information-circle-outline'],
        ].map(([key, label, icon]) => (
          <TouchableOpacity
            key={key}
            style={styles.bottomNavItem}
            onPress={() => {
              if (key === 'home') navigation.goBack();
              else if (key === 'account' || key === 'orders') navigation.navigate('PartnerLogin');
              else if (key === 'about') Alert.alert('عن NOW', 'تطبيق NOW للتوصيل');
            }}
            activeOpacity={0.65}
          >
            <Ionicons
              name={icon}
              size={21}
              color={key === 'partner' ? selectedRole.color : COLORS.textSecondary}
            />
            <Text style={[styles.bottomNavText, key === 'partner' && { color: selectedRole.color }]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
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
  logo: { fontSize: 34, fontWeight: '900', color: '#111827' },
  logoAccent: { color: '#E11D48' },
  contentScroll: { flex: 1 },
  content: { flexGrow: 1, padding: 20, paddingBottom: 110 },
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
    marginTop: 24,
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
  bottomNav: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    height: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 5,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 8,
  },
  bottomNavItem: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  bottomNavText: { color: COLORS.textSecondary, fontSize: 10, fontWeight: '700', textAlign: 'center' },
});

export default PartnerRegistrationScreen;
