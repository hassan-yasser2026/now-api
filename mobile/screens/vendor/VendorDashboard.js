import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import useAppStore from '../../store/appStore';
import storeService from '../../services/storeService';
import { orderService } from '../../services/orderService';

const ORDER_STATUS_LABELS = {
  PENDING: 'جديد',
  ACCEPTED: 'مقبول',
  PREPARING: 'قيد التحضير',
  READY: 'جاهز للتوصيل',
  PICKED_UP: 'قيد التوصيل',
  ON_THE_WAY: 'قيد التوصيل',
  DELIVERED: 'مكتمل',
  CANCELLED: 'ملغي',
};

const ORDER_STATUS_COLORS = {
  PENDING: '#0ea5e9',
  ACCEPTED: '#0891b2',
  PREPARING: '#8b5cf6',
  READY: '#f59e0b',
  PICKED_UP: '#14b8a6',
  ON_THE_WAY: '#14b8a6',
  DELIVERED: '#16a34a',
  CANCELLED: '#dc2626',
};

const MENU_ITEMS = [
  { label: 'الرئيسية', icon: '🏠', route: 'VendorDashboard' },
  { label: 'اللغة', icon: '🌐', languageAction: true },
  { label: 'الطلبات', icon: '📦', route: 'VendorOrders' },
  { label: 'الخدمات / المنتجات', icon: '🛍️', route: 'VendorMenu' },
  { label: 'العروض والخصومات', icon: '🏷️', route: 'VendorOffers' },
  { label: 'المحفظة والأرباح', icon: '💰', route: 'VendorEarnings' },
  { label: 'التقييمات', icon: '⭐', route: 'VendorRatings' },
  { label: 'الدعم', icon: '💬', supportPhone: '01067254988' },
  { label: 'الإشعارات', icon: '🔔', route: 'VendorNotifications' },
  { label: 'الملف الشخصي', icon: '👤', route: 'VendorProfile' },
  { label: 'حالة المتجر', icon: '🟢', statusAction: true },
  { label: 'الموقع', icon: '📍', route: 'StoreSettings' },
  { label: 'الإعدادات', icon: '⚙️', route: 'AccountSettings' },
];

const VendorDashboard = ({ navigation }) => {
  const { user, logout, language, setLanguage } = useAppStore();
  const { width } = useWindowDimensions();
  const isCompact = width < 720;
  const [storeId, setStoreId] = useState(user?.store?.id || null);
  const [storeOpen, setStoreOpen] = useState(user?.store?.isOpen !== false);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const displayName = user?.name && !user.name.includes('?') ? user.name : 'المهندس حسن';

  useEffect(() => {
    if (!user?.id) return;

    const loadVendorStore = async () => {
      try {
        const result = await storeService.getVendorStore(user.id);
        if (result.success && result.store?.id) {
          setStoreId(result.store.id);
          setStoreOpen(result.store.isOpen !== false);
          return;
        }
        throw new Error(result.message || 'تعذر تحميل المتجر');
      } catch (error) {
        console.error('Unable to load vendor store:', error);
      }
    };

    loadVendorStore();
  }, [storeId, user?.id]);

  useEffect(() => {
    let mounted = true;
    const loadOrders = async () => {
      setOrdersLoading(true);
      const result = await orderService.getVendorOrders();
      if (mounted) {
        setOrders(result.success && Array.isArray(result.orders) ? result.orders : []);
        setOrdersLoading(false);
      }
    };
    loadOrders();
    return () => { mounted = false; };
  }, [user?.id]);

  const orderCount = (statuses) => orders.filter((order) => statuses.includes(order.status)).length;
  const salesTotal = orders.reduce((total, order) => total + Number(order.totalPrice || 0), 0);
  const completedOrders = orderCount(['DELIVERED']);
  const chartValues = [
    orderCount(['PENDING']), orderCount(['ACCEPTED', 'PREPARING']), orderCount(['READY']),
    orderCount(['PICKED_UP', 'ON_THE_WAY']), completedOrders,
  ];
  const chartMax = Math.max(...chartValues, 1);

  const handleMenuPress = (item) => {
    if (item.languageAction) {
      setLanguageModalVisible(true);
      return;
    }

    if (item.statusAction) {
      handleStoreStatus();
      return;
    }

    if (item.route) {
      navigation.navigate(item.route);
      return;
    }

    if (item.supportPhone) {
      const whatsappNumber = item.supportPhone.replace(/^0/, '20');
      Linking.openURL(`https://wa.me/${whatsappNumber}`);
      return;
    }

    Alert.alert(item.label, 'هذا القسم سيكون متاحًا قريبًا.');
  };

  const updateStoreStatus = async (isOpen) => {
    if (!storeId) {
      Alert.alert('خطأ', 'تعذر تحديد المتجر الخاص بهذا الحساب.');
      return;
    }

    setStatusUpdating(true);
    try {
      const result = await storeService.updateStore(storeId, { isOpen });
      if (!result.success) {
        throw new Error(result.message || 'تعذر تغيير حالة المتجر');
      }
      setStoreOpen(isOpen);
      setStatusModalVisible(false);
      Alert.alert('تم بنجاح', isOpen ? 'تم فتح المتجر واستقبال الطلبات.' : 'تم قفل المتجر وإيقاف استقبال الطلبات.');
    } catch (error) {
      console.error('Unable to update store status:', error);
      Alert.alert('خطأ', 'تعذر تغيير حالة المتجر.');
    } finally {
      setStatusUpdating(false);
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

      <View style={[styles.body, isCompact && styles.bodyCompact]}>
        <ScrollView
          horizontal={isCompact}
          style={[styles.sidebar, isCompact && styles.sidebarCompact]}
          contentContainerStyle={[
            styles.sidebarContent,
            isCompact && styles.sidebarContentCompact,
          ]}
          showsVerticalScrollIndicator={false}
        >
          {!isCompact && <Text style={styles.sidebarTitle}>لوحة تحكم</Text>}

          {!isCompact && <View style={styles.profileCard}>
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
          }

          {MENU_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.sidebarItem, isCompact && styles.sidebarItemCompact]}
              onPress={() => handleMenuPress(item)}
            >
              <Text style={styles.sidebarIcon}>
                {item.statusAction ? (storeOpen ? '🟢' : '🔴') : item.icon}
              </Text>
              {!isCompact && (
                <Text style={styles.sidebarLabel}>
                  {item.statusAction && !storeOpen ? 'حالة المتجر (مغلق)' : item.label}
                </Text>
              )}
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={[styles.logoutItem, isCompact && styles.logoutItemCompact]} onPress={handleLogout}>
            {!isCompact && <Text style={styles.logoutText}>تسجيل الخروج</Text>}
          </TouchableOpacity>
        </ScrollView>

        <View style={[styles.content, isCompact && styles.contentCompact]}>
          <ScrollView contentContainerStyle={styles.dashboardContent} showsVerticalScrollIndicator={false}>
            <View style={styles.dashboardHeader}>
              <View>
                <Text style={styles.breadcrumb}>لوحة البائع / الرئيسية</Text>
                <Text style={styles.dashboardTitle}>مرحبًا، {displayName}</Text>
                <Text style={styles.dashboardSubtitle}>إليك ملخص أداء متجرك اليوم</Text>
              </View>
              <TouchableOpacity style={styles.notificationButton} onPress={() => navigation.navigate('VendorNotifications')}>
                <Text style={styles.notificationIcon}>🔔</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.storeBanner, !storeOpen && styles.storeBannerClosed]}>
              <View style={styles.storeBannerCopy}>
                <Text style={styles.storeBannerEyebrow}>حالة المتجر</Text>
                <Text style={styles.storeBannerTitle}>{storeOpen ? 'المتجر مفتوح ويستقبل الطلبات' : 'المتجر مغلق مؤقتًا'}</Text>
                <Text style={styles.storeBannerText}>{storeOpen ? 'يمكن للعملاء الآن تصفح منتجاتك وإرسال طلبات جديدة.' : 'الطلبات الحالية مستمرة، ولن تصل طلبات جديدة حتى إعادة الفتح.'}</Text>
              </View>
              <TouchableOpacity style={[styles.storeStatusButton, !storeOpen && styles.storeStatusButtonClosed]} onPress={handleStoreStatus}>
                <Text style={styles.storeStatusDot}>{storeOpen ? '●' : '●'}</Text>
                <Text style={styles.storeStatusButtonText}>{storeOpen ? 'المتجر مفتوح' : 'المتجر مغلق'}</Text>
                <Text style={styles.storeStatusAction}>تغيير الحالة</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.metricsGrid}>
              {[
                ['إجمالي الطلبات', orders.length, 'هذا الشهر', '📦', '#e0f7fb'],
                ['الطلبات الجديدة', orderCount(['PENDING']), 'تحتاج مراجعة', '＋', '#eaf5ff'],
                ['قيد التنفيذ', orderCount(['ACCEPTED', 'PREPARING', 'READY', 'PICKED_UP', 'ON_THE_WAY']), 'طلب نشط', '◷', '#fff6df'],
                ['الطلبات المكتملة', completedOrders, 'تم التوصيل', '✓', '#e9fbf1'],
                ['الطلبات الملغاة', orderCount(['CANCELLED']), 'هذا الشهر', '×', '#fff0f1'],
                ['إجمالي المبيعات', `${salesTotal.toFixed(2)} ج.م`, 'من الطلبات الحالية', 'ج.م', '#eaf5ff'],
              ].map(([label, value, hint, icon, iconBg]) => (
                <View key={label} style={styles.metricCard}>
                  <View style={[styles.metricIcon, { backgroundColor: iconBg }]}><Text style={styles.metricIconText}>{icon}</Text></View>
                  <View style={styles.metricCopy}><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricValue}>{ordersLoading ? '...' : value}</Text><Text style={styles.metricHint}>{hint}</Text></View>
                </View>
              ))}
            </View>

            <View style={styles.analyticsRow}>
              <View style={styles.chartCard}>
                <View style={styles.cardHeader}><View><Text style={styles.cardTitle}>ملخص الطلبات</Text><Text style={styles.cardHint}>بيانات فعلية من طلبات متجرك</Text></View><Text style={styles.rangeLabel}>الحالي</Text></View>
                <View style={styles.chartArea}>{chartValues.map((value, index) => <View key={index} style={styles.chartColumn}><View style={styles.chartTrack}><View style={[styles.chartBar, { height: `${Math.max((value / chartMax) * 88, value ? 12 : 3)}%` }]} /></View><Text style={styles.chartValue}>{value}</Text><Text style={styles.chartLabel}>{['جديد', 'تحضير', 'جاهز', 'توصيل', 'مكتمل'][index]}</Text></View>)}</View>
              </View>
              <View style={styles.ratingCard}>
                <View style={styles.cardHeader}><View><Text style={styles.cardTitle}>تقييم المتجر</Text><Text style={styles.cardHint}>آخر تقييمات العملاء</Text></View><Text style={styles.star}>★</Text></View>
                <Text style={styles.ratingValue}>{user?.store?.ratingAverage || '—'}</Text>
                <Text style={styles.ratingText}>متوسط التقييم</Text>
                <View style={styles.ratingStars}><Text>★★★★★</Text></View>
                <TouchableOpacity style={styles.secondaryAction} onPress={() => navigation.navigate('VendorRatings')}><Text style={styles.secondaryActionText}>عرض التقييمات</Text></TouchableOpacity>
              </View>
            </View>

            <View style={styles.ordersCard}>
              <View style={styles.cardHeader}><View><Text style={styles.cardTitle}>آخر الطلبات</Text><Text style={styles.cardHint}>تابع حالة طلبات العملاء بسرعة</Text></View><TouchableOpacity onPress={() => navigation.navigate('VendorOrders')}><Text style={styles.viewAll}>عرض كل الطلبات ‹</Text></TouchableOpacity></View>
              {ordersLoading ? <Text style={styles.emptyText}>جار تحميل الطلبات...</Text> : orders.length === 0 ? <Text style={styles.emptyText}>لا توجد طلبات حاليًا.</Text> : orders.slice(0, 5).map((order) => <TouchableOpacity key={order.id} style={styles.orderRow} onPress={() => navigation.navigate('VendorOrderDetails', { order, orderId: order.id })}><Text style={styles.orderId}>#{order.id}</Text><View style={styles.orderCustomer}><Text style={styles.orderCustomerName}>{order.customerName || order.customer?.name || 'عميل'}</Text><Text style={styles.orderDate}>{order.createdAt ? new Date(order.createdAt).toLocaleDateString('ar-EG') : '—'}</Text></View><Text style={styles.orderTotal}>{Number(order.totalPrice || 0).toFixed(2)} ج.م</Text><Text style={[styles.orderStatus, { color: ORDER_STATUS_COLORS[order.status] || '#64748b' }]}>{ORDER_STATUS_LABELS[order.status] || order.status}</Text><Text style={styles.orderChevron}>‹</Text></TouchableOpacity>)}
            </View>
          </ScrollView>
        </View>
      </View>

      <Modal
        visible={languageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.statusModal}>
            <Text style={styles.modalTitle}>اللغة</Text>
            <TouchableOpacity
              style={[styles.languageOption, language === 'ar' && styles.languageOptionActive]}
              onPress={() => {
                setLanguage('ar');
                setLanguageModalVisible(false);
              }}
            >
              <Text style={styles.languageOptionText}>العربية</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.languageOption, language === 'en' && styles.languageOptionActive]}
              onPress={() => {
                setLanguage('en');
                setLanguageModalVisible(false);
              }}
            >
              <Text style={styles.languageOptionText}>English</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setLanguageModalVisible(false)}>
              <Text style={styles.cancelText}>إلغاء</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
            <TouchableOpacity style={styles.openButton} onPress={() => updateStoreStatus(true)} disabled={statusUpdating}>
              <Text style={styles.statusButtonText}>{statusUpdating ? 'جار الحفظ...' : 'فتح المتجر'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeButton} onPress={() => updateStoreStatus(false)} disabled={statusUpdating}>
              <Text style={styles.statusButtonText}>{statusUpdating ? 'جار الحفظ...' : 'قفل المتجر'}</Text>
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
    backgroundColor: '#f3f9fc',
  },
  topBar: {
    height: 68,
    backgroundColor: '#09b5d7',
    borderBottomWidth: 1,
    borderBottomColor: '#0aa6c6',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingLeft: 24,
  },
  logo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoRed: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -8,
  },
  logoBlack: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -8,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
  },
  bodyCompact: {
    flexDirection: 'column',
  },
  content: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#f3f9fc',
  },
  contentCompact: {
    width: '100%',
  },
  dashboardContent: {
    padding: 24,
    paddingBottom: 40,
    maxWidth: 1180,
    width: '100%',
    alignSelf: 'center',
  },
  sidebar: {
    width: 220,
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 220,
    backgroundColor: '#06a9cf',
    borderRightWidth: 1,
    borderRightColor: '#0799bc',
  },
  sidebarCompact: {
    width: '100%',
    height: 64,
    flexGrow: 0,
    flexBasis: 64,
    borderRightWidth: 0,
    borderBottomWidth: 1,
  },
  sidebarContent: {
    paddingBottom: 0,
  },
  sidebarContentCompact: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    paddingHorizontal: 6,
  },
  sidebarTitle: {
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,.14)',
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  profileCard: {
    minHeight: 94,
    paddingHorizontal: 12,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,.14)',
  },
  avatar: {
    width: 57,
    height: 57,
    borderRadius: 29,
    backgroundColor: '#c7f3fa',
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
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  profileEmail: {
    color: '#d4f7fb',
    fontSize: 10,
    marginTop: 2,
  },
  profilePhone: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  sidebarItem: {
    minHeight: 45,
    paddingHorizontal: 15,
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  sidebarItemCompact: {
    minHeight: 48,
    minWidth: 48,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  sidebarIcon: {
    width: 35,
    fontSize: 19,
    textAlign: 'center',
  },
  sidebarLabel: {
    flex: 1,
    marginRight: 12,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
  },
  logoutItem: {
    minHeight: 48,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutItemCompact: {
    minHeight: 48,
    minWidth: 48,
    marginTop: 0,
    borderTopWidth: 0,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,.14)',
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  dashboardHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  breadcrumb: { color: '#0b9dbc', fontSize: 11, fontWeight: '700', textAlign: 'right', marginBottom: 5 },
  dashboardTitle: { color: '#15345b', fontSize: 25, fontWeight: '900', textAlign: 'right' },
  dashboardSubtitle: { color: '#7b8fa3', fontSize: 12, textAlign: 'right', marginTop: 5 },
  notificationButton: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e1edf3' },
  notificationIcon: { fontSize: 19 },
  storeBanner: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderRadius: 16, backgroundColor: '#dff8fc', borderWidth: 1, borderColor: '#b9edf4', marginBottom: 16 },
  storeBannerClosed: { backgroundColor: '#fff2f3', borderColor: '#ffd1d5' },
  storeBannerCopy: { flex: 1, alignItems: 'flex-end', marginLeft: 18 },
  storeBannerEyebrow: { color: '#078ca9', fontSize: 11, fontWeight: '800', textAlign: 'right' },
  storeBannerTitle: { color: '#15345b', fontSize: 18, fontWeight: '900', textAlign: 'right', marginTop: 5 },
  storeBannerText: { color: '#6c8795', fontSize: 11, textAlign: 'right', marginTop: 5 },
  storeStatusButton: { minWidth: 150, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 11, backgroundColor: '#fff', borderWidth: 1, borderColor: '#b7e9ef', alignItems: 'center' },
  storeStatusButtonClosed: { borderColor: '#ffc6cc' },
  storeStatusDot: { color: '#16a34a', fontSize: 20, lineHeight: 20 },
  storeStatusButtonClosedText: { color: '#dc2626' },
  storeStatusButtonText: { color: '#078da8', fontSize: 13, fontWeight: '900', marginTop: 3 },
  storeStatusAction: { color: '#8da0ae', fontSize: 10, marginTop: 4 },
  metricsGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', marginHorizontal: -5, marginBottom: 16 },
  metricCard: { flexGrow: 1, flexBasis: 155, minHeight: 94, flexDirection: 'row-reverse', alignItems: 'center', padding: 13, margin: 5, borderRadius: 13, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2edf2' },
  metricIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginLeft: 10 },
  metricIconText: { color: '#079cb9', fontSize: 19, fontWeight: '900' },
  metricCopy: { flex: 1, alignItems: 'flex-end' },
  metricLabel: { color: '#758a9e', fontSize: 10, textAlign: 'right' },
  metricValue: { color: '#19365a', fontSize: 18, fontWeight: '900', textAlign: 'right', marginTop: 4 },
  metricHint: { color: '#18a977', fontSize: 9, textAlign: 'right', marginTop: 3 },
  analyticsRow: { flexDirection: 'row-reverse', marginHorizontal: -6, marginBottom: 16 },
  chartCard: { flex: 1, minHeight: 255, margin: 6, padding: 17, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2edf2' },
  ratingCard: { width: 230, minHeight: 255, margin: 6, padding: 17, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2edf2' },
  cardHeader: { flexDirection: 'row-reverse', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 },
  cardTitle: { color: '#19365a', fontSize: 15, fontWeight: '900', textAlign: 'right' },
  cardHint: { color: '#8ca0ae', fontSize: 10, textAlign: 'right', marginTop: 4 },
  rangeLabel: { color: '#078da8', backgroundColor: '#e5f9fc', borderRadius: 7, paddingVertical: 6, paddingHorizontal: 9, fontSize: 10, fontWeight: '800' },
  chartArea: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', paddingTop: 12, borderBottomWidth: 1, borderBottomColor: '#eaf1f4' },
  chartColumn: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: 175 },
  chartTrack: { width: 25, height: 125, justifyContent: 'flex-end', backgroundColor: '#f0f8fa', borderRadius: 8, overflow: 'hidden' },
  chartBar: { width: '100%', minHeight: 3, borderRadius: 8, backgroundColor: '#24b6d6' },
  chartValue: { color: '#315979', fontSize: 10, fontWeight: '800', marginTop: 5 },
  chartLabel: { color: '#8b9dab', fontSize: 9, marginTop: 4 },
  star: { color: '#f5b425', fontSize: 23 },
  ratingValue: { color: '#19365a', fontSize: 38, fontWeight: '900', textAlign: 'center', marginTop: 16 },
  ratingText: { color: '#8395a5', fontSize: 11, textAlign: 'center', marginTop: 4 },
  ratingStars: { color: '#f5b425', fontSize: 18, textAlign: 'center', marginVertical: 13 },
  secondaryAction: { paddingVertical: 10, borderRadius: 9, backgroundColor: '#e5f9fc', alignItems: 'center' },
  secondaryActionText: { color: '#078da8', fontSize: 11, fontWeight: '800' },
  ordersCard: { padding: 17, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2edf2' },
  viewAll: { color: '#079bb9', fontSize: 11, fontWeight: '800' },
  emptyText: { color: '#8b9dab', fontSize: 12, textAlign: 'center', paddingVertical: 30 },
  orderRow: { flexDirection: 'row-reverse', alignItems: 'center', minHeight: 57, borderTopWidth: 1, borderTopColor: '#edf3f5', paddingVertical: 9 },
  orderId: { width: 52, color: '#0a94b2', fontSize: 11, fontWeight: '900', textAlign: 'right' },
  orderCustomer: { flex: 1, alignItems: 'flex-end', paddingHorizontal: 8 },
  orderCustomerName: { color: '#294866', fontSize: 12, fontWeight: '800', textAlign: 'right' },
  orderDate: { color: '#9aabb7', fontSize: 9, marginTop: 3, textAlign: 'right' },
  orderTotal: { width: 82, color: '#19365a', fontSize: 11, fontWeight: '800', textAlign: 'right' },
  orderStatus: { width: 90, fontSize: 10, fontWeight: '800', textAlign: 'right' },
  orderChevron: { width: 18, color: '#9aabb7', fontSize: 22, textAlign: 'center' },
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
  languageOption: {
    paddingVertical: 13,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    marginTop: 10,
  },
  languageOptionActive: {
    borderColor: '#10C7E8',
    backgroundColor: '#E0F8FC',
  },
  languageOptionText: {
    color: '#1E293B',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default VendorDashboard;
