import React, { useEffect, useState } from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import useAppStore from '../store/appStore';
import AuthNavigator from './AuthNavigator';
import CustomerNavigator from './CustomerNavigator';
import VendorNavigator from './VendorNavigator';
import DeliveryNavigator from './DeliveryNavigator';
import Loading from '../components/Loading';

const ADMIN_WEB_URL =
  process.env.EXPO_PUBLIC_ADMIN_URL ||
  'https://now-api-production-ca56.up.railway.app/admin';

const RootNavigator = () => {
  const { isAuthenticated, role, restoreSession, logout } = useAppStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      try {
        await restoreSession();
      } catch (error) {
        console.error("Session restore error:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    init();
    return () => { isMounted = false; };
  }, [restoreSession]);

  if (loading) {
    return <Loading text="جاري تحميل التطبيق..." />;
  }

  if (isAuthenticated && (role === 'admin' || role === 'sub_admin')) {
    return <AdminWebNotice onLogout={logout} />;
  }

  const getNavigator = () => {
    switch (role) {
      case 'vendor':
        return VendorNavigator;
      case 'delivery':
        return DeliveryNavigator;
      case 'customer':
      default:
        return CustomerNavigator;
    }
  };

  const ActiveNavigator = isAuthenticated ? getNavigator() : AuthNavigator;
  return <ActiveNavigator key={isAuthenticated ? `app-${role}` : 'auth'} />;
};

const AdminWebNotice = ({ onLogout }) => (
  <View style={styles.noticeContainer}>
    <Text style={styles.noticeTitle}>لوحة الإدارة أصبحت على الويب</Text>
    <Text style={styles.noticeText}>
      استخدم موقع NOW Admin لإدارة المستخدمين والمتاجر والطلبات والتقارير.
    </Text>
    <TouchableOpacity
      style={styles.noticeButton}
      onPress={() => Linking.openURL(ADMIN_WEB_URL)}
    >
      <Text style={styles.noticeButtonText}>فتح موقع الإدارة</Text>
    </TouchableOpacity>
    <TouchableOpacity onPress={onLogout} style={styles.logoutButton}>
      <Text style={styles.logoutText}>تسجيل الخروج</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  noticeContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#F4F7FB',
  },
  noticeTitle: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '800',
    color: '#102A43',
  },
  noticeText: {
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 24,
    color: '#6B7C93',
  },
  noticeButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#0B8FA3',
  },
  noticeButtonText: { color: '#fff', fontWeight: '800' },
  logoutButton: { marginTop: 16, padding: 12 },
  logoutText: { color: '#D33B5D', fontWeight: '700' },
});

export default RootNavigator;