import React from 'react';
import {
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const GuestAccountScreen = ({ navigation }) => {
  const goToRegistration = () => {
    navigation.navigate('Register', { role: 'customer' });
  };

  const goHome = () => navigation.navigate('GuestHome');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityLabel="رجوع"
        >
          <Ionicons name="arrow-forward" size={24} color="#111111" />
        </TouchableOpacity>

        <View style={styles.banner}>
          <Text style={styles.logo}>
            <Text style={styles.logoRed}>N</Text>
            <Text style={styles.logoBlack}>OW</Text>
          </Text>
          <Text style={styles.bannerTitle}>اكثر من ١٠٠ مليون منتج</Text>
          <Text style={styles.bannerTitle}>من ماركات عالمية</Text>
          <Text style={styles.bannerSubtitle}>توصيل كل يوم لباب جديد</Text>
        </View>

        <TouchableOpacity
          style={styles.accountButton}
          onPress={goToRegistration}
          activeOpacity={0.85}
        >
          <Text style={styles.accountButtonText}>
            تسجيل الدخول / إنشاء حساب
          </Text>
        </TouchableOpacity>

        <View style={styles.countryRow}>
          <Ionicons name="globe-outline" size={26} color="#4D5661" />
          <Text style={styles.rowLabel}>البلد</Text>
          <View style={styles.countryValue}>
            <Text style={styles.flag}>🇪🇬</Text>
            <Text style={styles.countryText}>مصر</Text>
          </View>
          <Ionicons name="chevron-back" size={20} color="#4D5661" />
        </View>

        <View style={styles.socialRow}>
          <SocialIcon name="logo-tiktok" color="#111111" />
          <SocialIcon name="logo-youtube" color="#E00000" />
          <SocialIcon name="logo-facebook" color="#1877F2" />
          <SocialIcon name="logo-instagram" color="#D94676" />
        </View>
      </View>

      <View style={styles.bottomNav}>
        <BottomItem icon="person" label="حسابي" active />
        <BottomItem
          icon="hand-left-outline"
          label="انضم كشريك"
          onPress={() => navigation.navigate('Register', { role: 'vendor' })}
        />
        <BottomItem icon="home-outline" label="الرئيسية" onPress={goHome} />
        <BottomItem
          icon="receipt-outline"
          label="طلباتك"
          onPress={goToRegistration}
        />
        <BottomItem
          icon="people-outline"
          label="عنا"
          onPress={() => navigation.navigate('About')}
        />
      </View>
    </SafeAreaView>
  );
};

const SocialIcon = ({ name, color }) => (
  <View style={styles.socialIcon}>
    <Ionicons name={name} size={32} color={color} />
  </View>
);

const BottomItem = ({ icon, label, active, onPress }) => (
  <TouchableOpacity
    style={styles.bottomItem}
    onPress={onPress}
    disabled={!onPress}
  >
    <Ionicons name={icon} size={24} color={active ? '#19B9D8' : '#6BAFC0'} />
    <Text style={[styles.bottomLabel, active && styles.bottomLabelActive]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 14 : 5,
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: 8,
  },
  banner: {
    minHeight: 282,
    backgroundColor: '#08C2E4',
    borderWidth: 7,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    marginTop: 4,
  },
  logo: {
    fontSize: 68,
    fontWeight: '900',
    letterSpacing: -6,
    marginBottom: 8,
  },
  logoRed: {
    color: '#E31E2C',
  },
  logoBlack: {
    color: '#050505',
  },
  bannerTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    textShadowColor: '#111111',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 1,
  },
  bannerSubtitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    marginTop: 8,
  },
  accountButton: {
    minHeight: 76,
    borderRadius: 30,
    backgroundColor: '#08C6E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 4,
    elevation: 5,
  },
  accountButtonText: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '800',
  },
  countryRow: {
    minHeight: 72,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 12,
  },
  rowLabel: {
    flex: 1,
    color: '#20242A',
    fontSize: 19,
    fontWeight: '700',
    textAlign: 'right',
  },
  countryValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  flag: {
    fontSize: 25,
  },
  countryText: {
    color: '#4D5661',
    fontSize: 16,
    fontWeight: '700',
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    paddingTop: 26,
  },
  socialIcon: {
    width: 58,
    height: 58,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F7F8',
  },
  bottomNav: {
    minHeight: 78,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#E2F4F7',
    backgroundColor: '#FFFFFF',
    paddingBottom: Platform.OS === 'ios' ? 8 : 2,
  },
  bottomItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  bottomLabel: {
    color: '#6BAFC0',
    fontSize: 10,
    fontWeight: '700',
  },
  bottomLabelActive: {
    color: '#19B9D8',
  },
});

export default GuestAccountScreen;
