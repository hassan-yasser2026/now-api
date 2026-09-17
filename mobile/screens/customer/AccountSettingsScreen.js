import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import PasswordInput from '../../components/PasswordInput';

import PhoneInput from '../../components/PhoneInput';
import { authService } from '../../services/authService';
import useAppStore from '../../store/appStore';

const AccountSettingsScreen = ({ navigation }) => {
  const user = useAppStore((state) => state.user);
  const updateUser = useAppStore((state) => state.updateUser);
  const country = useAppStore((state) => state.country);
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [phoneE164, setPhoneE164] = useState(user?.phone || '');
  const [phoneValid, setPhoneValid] = useState(true);
  const [phoneCountry, setPhoneCountry] = useState(country);
  const [profileImage, setProfileImage] = useState(user?.profileImage || null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const pickProfileImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('السماح بالصور مطلوب', 'اسمح للتطبيق باختيار الصورة الشخصية.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const saveChanges = async () => {
    if (!name.trim() || !phoneValid) {
      Alert.alert('تنبيه', 'تأكد من الاسم ورقم الهاتف');
      return;
    }

    if (newPassword || confirmPassword || currentPassword) {
      if (!currentPassword || !newPassword || newPassword !== confirmPassword) {
        Alert.alert('تنبيه', 'أدخل كلمات المرور وتأكد من تطابق كلمة المرور الجديدة');
        return;
      }
    }

    setLoading(true);
    try {
      const result = await authService.updateProfile({
        name: name.trim(),
        phone: phoneE164 || phone,
        email: email.trim() || null,
        profileImage,
        ...(newPassword
          ? { currentPassword, newPassword }
          : {}),
      });

      if (!result.success) {
        Alert.alert('تعذر الحفظ', result.message);
        return;
      }

      await updateUser(result.user);
      Alert.alert(
        'تم الحفظ',
        'تم تحديث بيانات حسابك بنجاح',
        [{ text: 'حسنًا', onPress: () => navigation.goBack() }],
        { cancelable: false }
      );
    } catch (error) {
      Alert.alert(
        'تعذر الحفظ',
        error?.response?.data?.message
          || error?.message
          || 'حدث خطأ غير متوقع أثناء حفظ بيانات الحساب.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>إعدادات الحساب</Text>
          <View style={styles.spacer} />
        </View>

        <TouchableOpacity style={styles.photoButton} onPress={pickProfileImage}>
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.photo} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Ionicons name="person-outline" size={42} color="#1684A0" />
            </View>
          )}
          <View style={styles.cameraBadge}>
            <Ionicons name="camera" size={17} color="#FFFFFF" />
          </View>
          <Text style={styles.photoLabel}>
            {profileImage ? 'تغيير الصورة الشخصية' : 'إضافة صورة شخصية'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>بيانات الحساب</Text>
        <Text style={styles.label}>الاسم</Text>
        <View style={styles.inputContainer}>
          <TextInput style={styles.input} value={name} onChangeText={setName} />
        </View>

        <Text style={styles.label}>رقم الهاتف</Text>
        <PhoneInput
          value={phone}
          countryCode={phoneCountry}
          onChange={({ national, e164, isValid, countryCode }) => {
            setPhone(national);
            setPhoneE164(e164);
            setPhoneValid(isValid);
            setPhoneCountry(countryCode);
          }}
        />

        <Text style={styles.label}>البريد الإلكتروني</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="اختياري"
            placeholderTextColor="#9AAEB2"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <Text style={styles.sectionTitle}>تغيير كلمة المرور</Text>
        <Text style={styles.label}>كلمة المرور الحالية</Text>
        <View style={styles.inputContainer}>
          <PasswordInput
            containerStyle={styles.inputContainer}
            inputStyle={styles.input}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="أدخل كلمة المرور الحالية"
            placeholderTextColor="#9AAEB2"
          />
        </View>

        <Text style={styles.label}>كلمة المرور الجديدة</Text>
        <View style={styles.inputContainer}>
          <PasswordInput
            containerStyle={styles.inputContainer}
            inputStyle={styles.input}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="6 أحرف على الأقل وبها رقم"
            placeholderTextColor="#9AAEB2"
          />
        </View>

        <Text style={styles.label}>تأكيد كلمة المرور الجديدة</Text>
        <View style={styles.inputContainer}>
          <PasswordInput
            containerStyle={styles.inputContainer}
            inputStyle={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="أعد كتابة كلمة المرور الجديدة"
            placeholderTextColor="#9AAEB2"
          />
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={saveChanges} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark" size={21} color="#FFFFFF" />
              <Text style={styles.saveText}>حفظ التعديلات</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { paddingBottom: 30 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#0B8FA3',
  },
  backButton: { padding: 4 },
  spacer: { width: 32 },
  title: { color: '#FFFFFF', fontSize: 21, fontWeight: '900' },
  photoButton: { alignItems: 'center', marginVertical: 24 },
  photo: { width: 116, height: 116, borderRadius: 58 },
  photoPlaceholder: {
    width: 116,
    height: 116,
    borderRadius: 58,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8FAFD',
  },
  cameraBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1684A0',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -30,
    marginLeft: 76,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  photoLabel: { marginTop: 12, color: '#1684A0', fontSize: 15, fontWeight: '800' },
  label: { color: '#172126', fontSize: 15, fontWeight: '800', textAlign: 'right', marginHorizontal: 18, marginTop: 12, marginBottom: 7 },
  sectionTitle: { color: '#0B8FA3', fontSize: 19, fontWeight: '900', textAlign: 'right', marginHorizontal: 18, marginTop: 24, marginBottom: 2 },
  inputContainer: {
    minHeight: 56,
    marginHorizontal: 18,
    paddingHorizontal: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#D8E7E9',
    backgroundColor: '#F8FCFD',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  input: { flex: 1, color: '#172126', fontSize: 16, textAlign: 'right' },
  saveButton: {
    minHeight: 56,
    margin: 24,
    borderRadius: 16,
    backgroundColor: '#0B8FA3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveText: { color: '#FFFFFF', fontSize: 17, fontWeight: '900' },
});

export default AccountSettingsScreen;
