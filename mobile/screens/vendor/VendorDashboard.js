import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import useAppStore from '../../store/appStore';
import api from '../../services/api';

const MENU_ITEMS = [
  { label: 'الرئيسية', icon: '🏠', route: 'VendorDashboard' },
  { label: 'الطلبات', icon: '📦', route: 'VendorOrders' },
  { label: 'الخدمات / المنتجات', icon: '🛍️', route: 'VendorMenu' },
  { label: 'المحفظة والأرباح', icon: '💰', route: 'VendorEarnings' },
  { label: 'التقارير', icon: '📊' },
  { label: 'التقييمات', icon: '⭐' },
  { label: 'الدعم', icon: '💬' },
  { label: 'الإشعارات', icon: '🔔' },
  { label: 'الملف الشخصي', icon: '👤', route: 'VendorProfile' },
  { label: 'حالة المتجر', icon: '🟢', statusAction: true },
  { label: 'الموقع', icon: '📍', route: 'StoreSettings' },
  { label: 'الإعدادات', icon: '⚙️', route: 'StoreSettings' },
];

const VendorDashboard = ({ navigation }) => {
  const { user, logout, language, setLanguage } = useAppStore();
  const [storeId, setStoreId] = useState(user?.store?.id || null);
  const [storeOpen, setStoreOpen] = useState(user?.store?.isOpen !== false);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const displayName = user?.name && !user.name.includes('?') ? user.name : 'المهندس حسن';

  useEffect(() => {
    if (language !== 'ar') {
      setLanguage('ar');
    }
  }, [language, setLanguage]);

  useEffect(() => {
    if (storeId || !user?.id) return;

    const loadVendorStore = async () => {
      try {
        const response = await api.get('/stores?includeClosed=true');
        const payload = response.data?.data ?? response.data;
        const stores = Array.isArray(payload) ? payload : payload?.stores || [];
        const vendorStore = stores.find((store) => Number(store.vendorId) === Number(user.id));
        if (vendorStore?.id) {
          setStoreId(vendorStore.id);
          setStoreOpen(vendorStore.isOpen !== false);
        }
      } catch (error) {
        console.error('Unable to load vendor store:', error);
      }
    };

    loadVendorStore();
  }, [storeId, user?.id]);

  const handleMenuPress = (item) => {
    if (item.statusAction) {
      handleStoreStatus();
      return;
    }

    if (item.route) {
      navigation.navigate(item.route);
      return;
    }
    Alert.alert(item.label, 'هذا القسم سيكون متاحًا قريبًا.');
  };

  const updateStoreStatus = async (isOpen) => {
    if (!storeId) {
      Alert.alert('خطأ', 'تعذر تحديد المتجر الخاص بهذا الحساب.');
      return;
    }

    try {
      await api.put(`/stores/${storeId}`, { isOpen });
      setStoreOpen(isOpen);
      setStatusModalVisible(false);
      Alert.alert('تم بنجاح', isOpen ? 'تم فتح المتجر واستقبال الطلبات.' : 'تم قفل المتجر وإيقاف استقبال الطلبات.');
    } catch (error) {
      console.error('Unable to update store status:', error);
      Alert.alert('خطأ', 'تعذر تغيير حالة المتجر.');
    }
  };

  const handleStoreStatus = () => {
    setStatusModalVisible(true);
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.logo}>
          <Text style={styles.logoRed}>N</Text>
          <Text style={styles.logoBlack}>OW</Text>
        </View>
      </View>

      <View style={styles.body}>
        <ScrollView
          style={styles.sidebar}
          contentContainerStyle={styles.sidebarContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sidebarTitle}>لوحة تحكم</Text>

          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              {user?.profileImage ? (
                <Image source={{ uri: user.profileImage }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarFallback}>👤</Text>
              )}
            </View>
            <View style={styles.profileText}>
              <Text style={styles.profileName}>{displayName}</Text>
              <Text style={styles.profileEmail}>{user?.email || 'حساب بائع'}</Text>
              <Text style={styles.profilePhone}>{user?.phone || '01111111111'}</Text>
            </View>
          </View>

          {MENU_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.sidebarItem}
              onPress={() => handleMenuPress(item)}
            >
              <Text style={styles.sidebarIcon}>
                {item.statusAction ? (storeOpen ? '🟢' : '🔴') : item.icon}
              </Text>
              <Text style={styles.sidebarLabel}>
                {item.statusAction && !storeOpen ? 'حالة المتجر (مغلق)' : item.label}
              </Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={styles.logoutItem} onPress={handleLogout}>
            <Text style={styles.logoutText}>تسجيل الخروج</Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.emptyContent} />
      </View>

      <Modal
        visible={statusModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.statusModal}>
            <Text style={styles.modalTitle}>حالة المتجر</Text>
            <Text style={styles.modalHint}>اختر الإجراء المطلوب</Text>
            <TouchableOpacity style={styles.openButton} onPress={() => updateStoreStatus(true)}>
              <Text style={styles.statusButtonText}>فتح المتجر</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeButton} onPress={() => updateStoreStatus(false)}>
              <Text style={styles.statusButtonText}>قفل المتجر</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setStatusModalVisible(false)}>
              <Text style={styles.cancelText}>إلغاء</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEEEEE',
  },
  topBar: {
    height: 148,
    backgroundColor: '#10C7E8',
    borderBottomWidth: 7,
    borderBottomColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoRed: {
    color: '#D92838',
    fontSize: 76,
    fontWeight: '900',
    letterSpacing: -8,
  },
  logoBlack: {
    color: '#050505',
    fontSize: 76,
    fontWeight: '900',
    letterSpacing: -8,
  },
  body: {
    flex: 1,
    flexDirection: 'row-reverse',
  },
  emptyContent: {
    flex: 1,
    backgroundColor: '#EEEEEE',
  },
  sidebar: {
    width: '30%',
    maxWidth: 285,
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 1,
    borderLeftColor: '#D4D4D4',
  },
  sidebarContent: {
    paddingBottom: 0,
  },
  sidebarTitle: {
    paddingVertical: 17,
    borderBottomWidth: 1,
    borderBottomColor: '#D9D9D9',
    color: '#111111',
    fontSize: 27,
    fontWeight: '800',
    textAlign: 'center',
  },
  profileCard: {
    minHeight: 91,
    paddingHorizontal: 12,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#D9D9D9',
  },
  avatar: {
    width: 57,
    height: 57,
    borderRadius: 29,
    backgroundColor: '#10C7E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 29,
  },
  avatarFallback: {
    fontSize: 29,
  },
  profileText: {
    flex: 1,
    marginRight: 9,
    alignItems: 'flex-end',
  },
  profileName: {
    color: '#111111',
    fontSize: 14,
    fontWeight: '700',
  },
  profileEmail: {
    color: '#444444',
    fontSize: 10,
    marginTop: 2,
  },
  profilePhone: {
    color: '#111111',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  sidebarItem: {
    minHeight: 60,
    paddingHorizontal: 15,
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  sidebarIcon: {
    width: 35,
    fontSize: 28,
    textAlign: 'center',
  },
  sidebarLabel: {
    flex: 1,
    marginRight: 12,
    color: '#111111',
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'right',
  },
  logoutItem: {
    minHeight: 64,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#D9D9D9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    color: '#D3214B',
    fontSize: 22,
    fontWeight: '900',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  statusModal: {
    width: '100%',
    maxWidth: 360,
    padding: 24,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
  },
  modalTitle: {
    color: '#111111',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  modalHint: {
    color: '#666666',
    fontSize: 15,
    marginTop: 8,
    marginBottom: 18,
    textAlign: 'center',
  },
  openButton: {
    backgroundColor: '#16A34A',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 8,
  },
  closeButton: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 10,
  },
  statusButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  cancelButton: {
    paddingVertical: 12,
    marginTop: 4,
  },
  cancelText: {
    color: '#555555',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
});

export default VendorDashboard;
