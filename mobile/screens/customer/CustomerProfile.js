import React from 'react';
import {
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { authService } from '../../services/authService';
import useAppStore from '../../store/appStore';

const PROFILE_ACCENT = '#9BEAF5';

const CustomerProfile = ({ navigation }) => {
  const user = useAppStore((state) => state.user);
  const logout = useAppStore((state) => state.logout);
  const profileImage = user?.profileImage;

  const handleLogout = () => {
    Alert.alert(
      'تسجيل الخروج',
      'هل أنت متأكد أنك تريد تسجيل الخروج؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'تسجيل الخروج',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'حذف الحساب',
      'هل تريد حذف حسابك؟ سيتم تعطيل الحساب وحذف بياناته الشخصية، ولا يمكن التراجع عن ذلك.',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'تأكيد الحذف',
          style: 'destructive',
          onPress: async () => {
            const result = await authService.deleteAccount();
            if (!result?.success) {
              Alert.alert('تعذر الحذف', result?.message || 'حدث خطأ أثناء حذف الحساب');
              return;
            }
            await useAppStore.getState().logout();
          },
        },
      ],
      { cancelable: true }
    );
  };

  const menuItems = [
    {
      icon: 'person-outline',
      label: 'إدارة الحساب',
      onPress: () => navigation.navigate('AccountSettings'),
    },
    {
      icon: 'headset-outline',
      label: 'الشكاوى والدعم',
      onPress: () => navigation.navigate('Support'),
    },
    {
      icon: 'settings-outline',
      label: 'تغيير إعدادات الحساب',
      onPress: () => navigation.navigate('AccountSettings'),
    },
    {
      icon: 'call-outline',
      label: 'رقم الهاتف المسجل',
      value: user?.phone || 'غير متوفر',
      onPress: () => Alert.alert('رقم الهاتف المسجل', user?.phone || 'غير متوفر'),
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.logo}>
            <Text style={styles.logoNow}>N</Text>
            <Text style={styles.logoRest}>OW</Text>
          </Text>
        </View>

        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{user?.name?.charAt(0)?.toUpperCase() || 'U'}</Text>
            )}
          </View>
          <Text style={styles.userName}>{user?.name || 'مستخدم NOW'}</Text>
        </View>

        <View style={styles.menu}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.menuItem, index < menuItems.length - 1 && styles.menuDivider]}
              onPress={item.onPress}
              activeOpacity={0.75}
            >
              <View style={styles.menuIcon}>
                <Ionicons name={item.icon} size={31} color="#1684A0" />
              </View>
              <View style={styles.menuTextWrap}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                {item.value ? <Text style={styles.menuValue}>{item.value}</Text> : null}
              </View>
              <Ionicons name="chevron-back" size={21} color="#8AA4AA" />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
          <Ionicons name="trash-outline" size={20} color="#B42318" />
          <Text style={styles.deleteText}>حذف الحساب</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#1684A0" />
          <Text style={styles.logoutText}>تسجيل الخروج</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { paddingBottom: 18 },
  hero: {
    height: 182,
    backgroundColor: PROFILE_ACCENT,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 22,
  },
  logo: { fontSize: 58, fontWeight: '900', letterSpacing: -6 },
  logoNow: { color: '#050505' },
  logoRest: { color: '#D9283E' },
  profileSection: {
    alignItems: 'center',
    marginTop: -58,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
  },
  avatar: {
    width: 156,
    height: 156,
    borderRadius: 78,
    backgroundColor: '#DDF8FC',
    borderWidth: 5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { fontSize: 62, fontWeight: '900', color: '#1684A0' },
  userName: {
    color: '#050505',
    fontSize: 28,
    fontWeight: '900',
    marginTop: 5,
    textAlign: 'center',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 18,
    marginTop: 22,
    paddingVertical: 13,
    borderRadius: 13,
    backgroundColor: '#FFF4F2',
    borderWidth: 1,
    borderColor: '#F5B8B1',
  },
  deleteText: { color: '#B42318', fontSize: 15, fontWeight: '800' },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 18,
    marginTop: 12,
    paddingVertical: 13,
    borderRadius: 13,
    backgroundColor: '#F2FCFD',
    borderWidth: 1,
    borderColor: '#1684A0',
  },
  logoutText: { color: '#1684A0', fontSize: 15, fontWeight: '800' },
  menu: { paddingHorizontal: 18, marginTop: 4 },
  menuItem: {
    minHeight: 82,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 13,
    paddingVertical: 9,
  },
  menuDivider: { borderBottomWidth: 1, borderBottomColor: '#F0F4F5' },
  menuIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: '#E8FAFD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTextWrap: { flex: 1, alignItems: 'flex-end' },
  menuLabel: { color: '#050505', fontSize: 20, fontWeight: '900', textAlign: 'right' },
  menuValue: { color: '#6C858B', fontSize: 14, marginTop: 2 },
});

export default CustomerProfile;
// مسودة المشروع - البشمهندس حسن ياسر
