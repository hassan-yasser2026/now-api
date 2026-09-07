import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  I18nManager,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { COLORS } from '../../constants/colors';
import useAppStore from '../../store/appStore';

import storeService from '../../services/storeService';
import { orderService } from '../../services/orderService';

import StoreCard from '../../components/StoreCard';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';
import LocationPickerModal from '../../components/LocationPickerModal';

const HOME_ACCENT = '#0B8FA3';
const HOME_DARK = '#151515';

const STATUS_LABELS = {
  PENDING: 'في انتظار المتجر',
  PREPARING: 'جاري التحضير',
  READY: 'جاهز للاستلام',
  PICKED_UP: 'خرج للتوصيل',
  DELIVERED: 'تم التوصيل',
  CANCELLED: 'ملغي',

  Pending: 'في انتظار المتجر',
  Preparing: 'جاري التحضير',
  Ready: 'جاهز للاستلام',
  Picked_Up: 'خرج للتوصيل',
  Delivered: 'تم التوصيل',
  Cancelled: 'ملغي',
};

const CustomerHome = ({ navigation }) => {
  const {
    user,
    isAuthenticated,
    isGuest,
    cart = [],
    language,
  } = useAppStore();

  const isRTL = language === 'ar' || I18nManager.isRTL;

  const [stores, setStores] = useState([]);
  const [orders, setOrders] = useState([]);
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);
  const [deliveryLocation, setDeliveryLocation] = useState(null);

  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState('loading'); // 'loading', 'success', 'error'
  const [error, setError] = useState(null);

  const [searchText, setSearchText] = useState('');
  const [showOpenOnly, setShowOpenOnly] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    setStatus(isRefresh ? 'refreshing' : 'loading');
    setError(null);

    try {
      const storesPromise = storeService.getStores();
      const ordersPromise = (isAuthenticated && !isGuest)
        ? orderService.getCustomerOrders()
        : Promise.resolve({ success: true, orders: [] });

      const [storesResult, ordersResult] = await Promise.all([
        storesPromise,
        ordersPromise,
      ]);

      if (storesResult.success) {
        setStores(Array.isArray(storesResult.stores) ? storesResult.stores : []);
      } else {
        throw new Error(storesResult.message || 'فشل تحميل المتاجر');
      }

      if (ordersResult.success) {
        setOrders(Array.isArray(ordersResult.orders) ? ordersResult.orders : []);
      } else {
        console.warn('Could not fetch customer orders:', ordersResult.message);
        setOrders([]);
      }

      setStatus('success');
    } catch (err) {
      setError(err.message);
      setStatus('error');
      if (!isRefresh) {
        Alert.alert('خطأ', err.message);
      }
    } finally {
      setRefreshing(false);
    }
  }, [isAuthenticated, isGuest]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(() => {
    loadData(true);
  }, [loadData]);

  const activeOrders = useMemo(
    () =>
      orders.filter((order) => {
        const orderStatus = String(order.status || '').toUpperCase();
        return orderStatus !== 'DELIVERED' && orderStatus !== 'CANCELLED';
      }),
    [orders]
  );

  const filteredStores = useMemo(
    () =>
      stores.filter((store) => {
        const search = searchText.trim().toLowerCase();
        const storeName = String(store.name || '').toLowerCase();
        const description = String(store.description || '').toLowerCase();
        const matchesSearch = !search || storeName.includes(search) || description.includes(search);
        const matchesOpen = !showOpenOnly || store.isOpen === true;
        return matchesSearch && matchesOpen;
      }),
    [stores, searchText, showOpenOnly]
  );

  const handleStorePress = useCallback(
    (store) => {
      if (!store?.id) {
        Alert.alert('خطأ', 'بيانات المتجر غير صحيحة');
        return;
      }

      if (!store.isOpen) {
        Alert.alert(
          'المتجر مغلق',
          'هذا المتجر مغلق حالياً، يمكنك العودة لاحقاً.'
        );
        return;
      }

      navigation.navigate('StoreMenu', {
        storeId: store.id,
        storeName: store.name,
      });
    },
    [navigation]
  );

  const handleOrderPress = useCallback(
    (order) => {
      if (!order?.id) return;

      navigation.navigate('OrderTracking', {
        orderId: order.id,
      });
    },
    [navigation]
  );

  const cartByStore = useMemo(() => {
    if (!cart || cart.length === 0) return [];

    const grouped = cart.reduce((acc, item) => {
      const storeId = item.storeId;
      if (!acc[storeId]) {
        const storeDetails = stores.find(s => s.id === storeId);
        acc[storeId] = {
          storeId,
          storeName: storeDetails?.name || 'متجر غير معروف',
          items: [],
          totalItems: 0,
          totalPrice: 0,
        };
      }
      acc[storeId].items.push(item);
      acc[storeId].totalItems += item.quantity;
      acc[storeId].totalPrice += item.price * item.quantity;
      return acc;
    }, {});

    return Object.values(grouped);
  }, [cart, stores]);

  const handleSettingsPress = useCallback(() => {
    navigation.navigate('Settings');
  }, [isGuest, navigation]);

  const handleCartStorePress = useCallback((storeId) => {
    if (isGuest) {
      navigation.navigate('Register', { role: 'customer' });
      return;
    }

    navigation.navigate('OrderConfirmation', { storeId });
  }, [isGuest, navigation]);

  const handleBottomNavigation = useCallback((route) => {
    if (route === 'account') {
      navigation.navigate(isGuest ? 'Settings' : 'CustomerProfile');
      return;
    }

    if (route === 'partner') {
      navigation.navigate('Register', { role: 'vendor' });
      return;
    }

    if (route === 'orders') {
      navigation.navigate(isGuest ? 'Login' : 'Orders');
      return;
    }

    if (route === 'about') {
      navigation.navigate('About');
    }
  }, [isGuest, navigation]);

  const openStoresCount = useMemo(
    () => stores.filter((store) => store.isOpen === true).length,
    [stores]
  );

  const categoryItems = useMemo(
    () =>
      stores.slice(0, 6).map((store, index) => ({
        ...store,
        categoryIcon: ['restaurant-outline', 'cart-outline', 'cafe-outline', 'fast-food-outline', 'storefront-outline', 'ice-cream-outline'][index % 6],
      })),
    [stores]
  );

  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0),
    [cart]
  );

  const statsCards = [
    {
      key: 'stores',
      label: 'متاجر الآن',
      value: `${openStoresCount}`,
      icon: 'storefront-outline',
    },
    {
      key: 'orders',
      label: 'طلباتك',
      value: `${activeOrders.length}`,
      icon: 'receipt-outline',
    },
    {
      key: 'cart',
      label: 'السلة',
      value: `${cart.length}`,
      icon: 'cart-outline',
    },
    {
      key: 'total',
      label: 'إجمالي',
      value: `${cartTotal.toFixed(2)} ج.م`,
      icon: 'cash-outline',
    },
  ];

  const featuredOffers = [
    {
      id: 'offer-fast',
      title: 'توصيل سريع',
      subtitle: 'من المتاجر القريبة خلال 25 دقيقة',
      gradient: ['#EC4899', '#F97316'],
      icon: 'flash-outline',
    },
    {
      id: 'offer-sale',
      title: 'خصومات اليوم',
      subtitle: 'وفر حتى 30% على طلباتك الأولى',
      gradient: ['#8B5CF6', '#EC4899'],
      icon: 'pricetag-outline',
    },
    {
      id: 'offer-fresh',
      title: 'مميز اليوم',
      subtitle: 'أصناف طازجة ومميزة من أفضل المتاجر',
      gradient: ['#14B8A6', '#0EA5E9'],
      icon: 'sparkles-outline',
    },
  ];

  const getStatusLabel = (orderStatus) => {
    return STATUS_LABELS[orderStatus] || orderStatus || 'غير معروف';
  };

  if (status === 'loading') {
    return <Loading text="جاري تحميل المتاجر..." />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.brandMark}>NOW</Text>
            <Text style={styles.greeting}>
              {isGuest ? 'أهلاً بك 👋' : `أهلاً ${user?.name || ''}`}
            </Text>
            <Text style={styles.subGreeting}>
              {isGuest ? 'اكتشف المتاجر واطلب اللي نفسك فيه' : 'اكتشف المتاجر القريبة منك'}
            </Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.profileButton} onPress={handleSettingsPress} activeOpacity={0.8}>
              <Ionicons name="settings-outline" size={20} color={HOME_ACCENT} />
            </TouchableOpacity>
            {orders.length > 0 && (
              <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('Orders')} activeOpacity={0.8}>
                <Ionicons name="bag-handle-outline" size={22} color="#fff" />
                <View style={styles.cartBadgeHeader}>
                  <Text style={styles.cartBadgeTextHeader}>{orders.length > 9 ? '9+' : orders.length}</Text>
                </View>
              </TouchableOpacity>
            )}

            {isAuthenticated && (
              <TouchableOpacity
                style={styles.profileButton}
                onPress={() => navigation.navigate('CustomerProfile')}
                activeOpacity={0.8}
              >
                <Ionicons name="person-outline" size={20} color={HOME_ACCENT} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={styles.locationPill}
          onPress={() => setLocationPickerVisible(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="location" size={17} color={HOME_ACCENT} />
          <View style={styles.locationText}>
            <Text style={styles.locationLabel}>موقع التوصيل</Text>
            <Text style={styles.locationValue}>
              {deliveryLocation ? 'تم تحديد الموقع' : 'تحديد الموقع على الخريطة'}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={16} color={COLORS.textSecondary} />
        </TouchableOpacity>

        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={21} color={HOME_ACCENT} />
          <TextInput
            style={[styles.searchInput, isRTL ? styles.searchInputRTL : styles.searchInputLTR]}
            placeholder="ابحث عن مطعم أو متجر..."
            placeholderTextColor={COLORS.textLight}
            value={searchText}
            onChangeText={setSearchText}
            returnKeyType="search"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')} style={styles.clearSearch}>
              <Ionicons name="close-circle" size={21} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.brandLogo}>
          <Text style={styles.brandLogoText}>
            <Text style={styles.logoRed}>N</Text>
            <Text style={styles.logoDark}>OW</Text>
          </Text>
        </View>
        <LocationPickerModal
          visible={locationPickerVisible}
          initial={deliveryLocation}
          onConfirm={setDeliveryLocation}
          onClose={() => setLocationPickerVisible(false)}
        />
      </View>

      {/* Guest Banner */}
      {isGuest && (
        <View style={styles.guestBanner}>
          <View style={styles.guestBannerContent}>
            <Text style={styles.guestBannerTitle}>🛒 تصفح براحتك</Text>
            <Text style={styles.guestBannerSubtitle}>سجل دخولك علشان تقدر تطلب وتتابع طلباتك</Text>
          </View>
          <TouchableOpacity
            style={styles.guestBannerBtn}
            onPress={() => navigation.navigate('Register', { role: 'customer' })}
            activeOpacity={0.8}
          >
            <Text style={styles.guestBannerBtnText}>دخول</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.sectionBlock}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>المتاجر المتاحة</Text>
          <Ionicons name="apps-outline" size={20} color={HOME_ACCENT} />
        </View>
        <FlatList
          horizontal
          inverted={isRTL}
          data={categoryItems}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.categoriesList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.categoryItem}
              onPress={() => handleStorePress(item)}
              activeOpacity={0.85}
            >
              <View style={styles.categoryIcon}>
                {item.image || item.logo ? (
                  <Image
                    source={{ uri: item.image || item.logo }}
                    style={styles.categoryImage}
                  />
                ) : (
                  <Ionicons name={item.categoryIcon} size={25} color={HOME_ACCENT} />
                )}
              </View>
              <Text style={styles.categoryLabel} numberOfLines={1}>{item.name || item.category || 'متجر'}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <View style={styles.offersSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>عروض مميزة</Text>
          <Ionicons name="sparkles-outline" size={20} color={HOME_ACCENT} />
        </View>
        <FlatList
          horizontal
          inverted={isRTL}
          data={featuredOffers}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.offersList}
          renderItem={({ item }) => (
            <View style={[styles.offerCard, { backgroundColor: item.gradient[0] }]}>
              <View style={styles.offerGlow} />
              <View style={styles.offerRow}>
                <View style={styles.offerIconWrap}>
                  <Ionicons name={item.icon} size={18} color="#fff" />
                </View>
                <Text style={styles.offerTitle}>{item.title}</Text>
              </View>
              <Text style={styles.offerSubtitle}>{item.subtitle}</Text>
            </View>
          )}
        />
      </View>

      {/* Filters */}
      <View style={styles.filtersRow}>
        <TouchableOpacity
          style={[styles.filterButton, !showOpenOnly && styles.filterButtonActive]}
          onPress={() => setShowOpenOnly(false)}
        >
          <Ionicons
            name="apps-outline"
            size={18}
            color={!showOpenOnly ? '#fff' : COLORS.textSecondary}
          />
          <Text style={[styles.filterText, !showOpenOnly && styles.filterTextActive]}>الكل</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, showOpenOnly && styles.filterButtonActive]}
          onPress={() => setShowOpenOnly(true)}
        >
          <Ionicons
            name="checkmark-circle-outline"
            size={18}
            color={showOpenOnly ? '#fff' : COLORS.textSecondary}
          />
          <Text style={[styles.filterText, showOpenOnly && styles.filterTextActive]}>مفتوح الآن</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsGrid}>
        {statsCards.map((stat) => (
          <View key={stat.key} style={styles.statCard}>
            <View style={styles.statIconWrap}>
              <Ionicons name={stat.icon} size={18} color={HOME_ACCENT} />
            </View>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Active Orders */}
      {isAuthenticated && activeOrders.length > 0 && (
        <View style={styles.ordersSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>طلباتك الحالية</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Orders')}>
              <Text style={styles.seeAll}>عرض الكل</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            horizontal
            inverted
            data={activeOrders}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.orderCard}
                onPress={() => handleOrderPress(item)}
                activeOpacity={0.85}
              >
                <View style={styles.orderTopRow}>
                  <View style={styles.orderIcon}>
                    <Ionicons name="receipt-outline" size={20} color={HOME_ACCENT} />
                  </View>
                  <Text style={styles.orderId}>#{item.id}</Text>
                </View>

                <Text style={styles.orderStatus} numberOfLines={1}>
                  {getStatusLabel(item.status)}
                </Text>

                <Text style={styles.orderTotal}>
                  {Number(item.totalPrice || 0).toFixed(2)} ج.م
                </Text>

                <View style={styles.trackRow}>
                  <Text style={styles.trackText}>تتبع الطلب</Text>
                  <Ionicons name="arrow-back" size={16} color={HOME_ACCENT} />
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Stores */}
      <View style={styles.storesSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>المتاجر المتاحة</Text>
          <Text style={styles.storeCount}>{filteredStores.length} متجر</Text>
        </View>

        <FlatList
          data={filteredStores}
          renderItem={({ item }) => (
            <StoreCard store={item} onPress={() => handleStorePress(item)} />
          )}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.storesList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={status === 'refreshing'}
              onRefresh={onRefresh}
              colors={[HOME_ACCENT]}
              tintColor={HOME_ACCENT}
            />
          }
          ListEmptyComponent={
            status === 'error' ? (
              <EmptyState
                icon="cloud-offline-outline"
                title="حدث خطأ"
                message={error || 'فشل تحميل البيانات، حاول التحديث.'}
                onRetry={onRefresh}
              />
            ) : (
              <EmptyState
                icon="storefront-outline"
                title={searchText ? 'لا توجد نتائج' : 'لا توجد متاجر'}
                message={
                  searchText
                    ? 'جرّب البحث بكلمة مختلفة أو غيّر الفلتر.'
                    : 'لا توجد متاجر متاحة في منطقتك حالياً.'
                }
              />
            )
          }
        />
      </View>

      <TouchableOpacity
        onPress={() => navigation.navigate('Assistant')}
        style={[
          styles.assistantFab,
          isRTL ? { right: 20, left: 'auto' } : { left: 20, right: 'auto' },
          cartByStore.length > 0 && styles.assistantFabAboveCart,
        ]}
        activeOpacity={0.9}
      >
        <Ionicons name="sparkles" size={22} color="#fff" />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => navigation.navigate('About')}
        style={styles.aboutLink}
        activeOpacity={0.7}
      >
        <Ionicons name="information-circle-outline" size={18} color={HOME_ACCENT} />
        <Text style={styles.aboutText}>حول تطبيق ناو</Text>
      </TouchableOpacity>

      {/* Cart Bars */}
      {cartByStore.length > 0 && (
        <View style={styles.cartBarsContainer}>
          {cartByStore.map((cartStore) => (
            <TouchableOpacity
              key={cartStore.storeId}
              style={styles.cartBar}
              onPress={() => handleCartStorePress(cartStore.storeId)}
              activeOpacity={0.9}
            >
              <View style={styles.cartInfo}>
                <View style={styles.cartBadgeBar}>
                  <Text style={styles.cartBadgeTextBar}>{cartStore.totalItems}</Text>
                </View>
                <View>
                  <Text style={styles.cartTotal}>{cartStore.totalPrice.toFixed(2)} ج.م</Text>
                  <Text style={styles.cartStoreName}>من {cartStore.storeName}</Text>
                </View>
              </View>
              <View style={styles.cartBtn}>
                <Text style={styles.cartBtnText}>عرض السلة</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {isGuest && (
        <View style={styles.guestBottomNav}>
          {[
            { key: 'account', label: 'حسابي', icon: 'person-outline' },
            { key: 'partner', label: 'انضم كشريك', icon: 'hand-left-outline' },
            { key: 'home', label: 'الرئيسية', icon: 'home', active: true },
            { key: 'orders', label: 'طلباتي', icon: 'receipt-outline' },
            { key: 'about', label: 'حول تطبيق ناو', icon: 'information-circle-outline' },
          ].map((item) => (
            <TouchableOpacity
              key={item.key}
              style={styles.guestBottomNavItem}
              onPress={() => handleBottomNavigation(item.key)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={item.icon}
                size={20}
                color={item.active ? HOME_ACCENT : COLORS.textSecondary}
              />
              <Text style={[styles.guestBottomNavLabel, item.active && styles.guestBottomNavLabelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  hero: {
    backgroundColor: HOME_ACCENT,
    paddingTop: 8,
    paddingBottom: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTextContainer: {
    flex: 1,
  },
  brandMark: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 3,
    marginBottom: 5,
  },
  greeting: {
    fontSize: 21,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  subGreeting: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.88)',
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginLeft: 10,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    elevation: 4,
    shadowColor: '#007A91',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  profileButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
  },
  cartBadgeHeader: {
    position: 'absolute',
    right: -3,
    top: -3,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: HOME_ACCENT,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeTextHeader: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  guestBanner: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 4,
    padding: 15,
    borderRadius: 18,
    backgroundColor: '#E9FAFD',
    borderWidth: 1,
    borderColor: '#B7EEF5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  guestBannerContent: {
    flex: 1,
    paddingRight: 12,
  },
  guestBannerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  guestBannerSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  guestBannerBtn: {
    backgroundColor: HOME_ACCENT,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  guestBannerBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: '#D7D7D7',
  },
  locationText: {
    marginHorizontal: 8,
  },
  locationLabel: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
  locationValue: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 1,
  },
  offersSection: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 14,
  },
  offersList: {
    paddingRight: 2,
  },
  offerCard: {
    width: 244,
    minHeight: 124,
    borderRadius: 22,
    padding: 17,
    marginRight: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  offerGlow: {
    position: 'absolute',
    right: -30,
    top: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  offerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  offerIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  offerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
  offerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 18,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    paddingHorizontal: 14,
    height: 52,
    borderRadius: 15,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: HOME_DARK,
    elevation: 2,
    shadowColor: '#7D3158',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  brandLogo: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 58,
  },
  brandLogoText: {
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: -4,
  },
  logoRed: {
    color: '#E51D35',
  },
  logoDark: {
    color: HOME_DARK,
  },
  searchInput: {
    flex: 1,
    marginHorizontal: 10,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  searchInputRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  searchInputLTR: {
    textAlign: 'left',
    writingDirection: 'ltr',
  },
  clearSearch: {
    padding: 4,
  },
  filtersRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 12,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterButtonActive: {
    backgroundColor: HOME_ACCENT,
    borderColor: HOME_ACCENT,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  filterTextActive: {
    color: '#fff',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  statCard: {
    width: '47%',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    marginBottom: 8,
  },
  statIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#E2F9FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 3,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  quickActionCard: {
    width: '22%',
    minWidth: 72,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E2F9FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  sectionBlock: {
    marginHorizontal: 16,
    marginTop: 17,
    marginBottom: 4,
  },
  categoriesList: {
    paddingVertical: 4,
  },
  categoryItem: {
    width: 78,
    alignItems: 'center',
    marginRight: 14,
  },
  categoryIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D9D9D9',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 7,
  },
  categoryImage: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
  },
  categoryLabel: {
    width: 78,
    marginTop: 8,
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  ordersSection: {
    marginTop: 4,
    marginBottom: 8,
    paddingBottom: 8,
  },
  storesSection: {
    flex: 1,
    marginTop: 4,
    paddingBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '700',
    color: HOME_ACCENT,
  },
  storeCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  horizontalList: {
    paddingHorizontal: 16,
  },
  orderCard: {
    width: 185,
    marginRight: 12,
    padding: 15,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  orderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E2F9FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 9,
  },
  orderId: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  orderStatus: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 10,
  },
  orderTotal: {
    fontSize: 17,
    fontWeight: '800',
    color: HOME_ACCENT,
    marginTop: 6,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  trackText: {
    fontSize: 12,
    fontWeight: '700',
    color: HOME_ACCENT,
  },
  storesList: {
    paddingHorizontal: 16,
    paddingBottom: 156,
  },
  guestBottomNav: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    height: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 6,
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#D9D9D9',
    elevation: 10,
    shadowColor: '#6B2148',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    zIndex: 20,
  },
  guestBottomNavItem: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  guestBottomNavLabel: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  guestBottomNavLabelActive: {
    color: HOME_ACCENT,
    fontWeight: '900',
  },
  assistantFab: {
    position: 'absolute',
    right: 20,
    bottom: 110,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: HOME_ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    zIndex: 10,
  },
  assistantFabAboveCart: {
    bottom: 180,
  },
  aboutLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
  },
  aboutText: {
    color: HOME_ACCENT,
    fontSize: 14,
    fontWeight: '700',
  },
  cartBarsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 8,
  },
  cartBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: HOME_ACCENT,
    borderRadius: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  cartInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cartBadgeBar: {
    backgroundColor: '#fff',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cartBadgeTextBar: {
    color: HOME_ACCENT,
    fontWeight: 'bold',
    fontSize: 14,
  },
  cartTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  cartStoreName: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
  },
  cartBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cartBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default CustomerHome;