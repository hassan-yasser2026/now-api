import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  I18nManager,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { COLORS } from '../../constants/colors';
import useAppStore from '../../store/appStore';

import storeService from '../../services/storeService';

import Loading from '../../components/Loading';
import LocationPickerModal from '../../components/LocationPickerModal';
import { formatPrice } from '../../utils/formatters';

const HOME_ACCENT = '#0B8FA3';
const HOME_DARK = '#151515';

const CustomerHome = ({ navigation }) => {
  const {
    user,
    isAuthenticated,
    isGuest,
    cart = [],
    language,
    deliveryLocation,
    scheduledDate,
    setDeliveryLocation,
    logout,
  } = useAppStore();

  const isRTL = language === 'ar' || I18nManager.isRTL;

  const handleLogout = () => {
    Alert.alert('تسجيل الخروج', 'هل أنت متأكد أنك تريد تسجيل الخروج؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'تسجيل الخروج', style: 'destructive', onPress: logout },
    ]);
  };

  const [stores, setStores] = useState([]);
  const [featuredItems, setFeaturedItems] = useState([]);
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);

  const [, setRefreshing] = useState(false);
  const [status, setStatus] = useState('loading'); // 'loading', 'success', 'error'

  const [searchText, setSearchText] = useState('');

  const loadData = useCallback(async (isRefresh = false) => {
    setStatus(isRefresh ? 'refreshing' : 'loading');

    try {
      const storesPromise = storeService.getStores(deliveryLocation);
      const storesResult = await storesPromise;

      if (storesResult.success) {
        const loadedStores = Array.isArray(storesResult.stores) ? storesResult.stores : [];
        setStores(loadedStores);

        const menuResults = await Promise.all(
          loadedStores.map(async (store) => {
            if (Array.isArray(store.menuItems)) {
              return store.menuItems.slice(0, 4).map((item) => ({
                ...item,
                storeId: store.id,
                storeName: store.name,
                storeImage: store.image || store.logo,
              }));
            }

            const menuResult = await storeService.getMenu(store.id);
            if (!menuResult.success) return [];
            return (menuResult.menu || []).slice(0, 4).map((item) => ({
              ...item,
              storeId: store.id,
              storeName: store.name,
              storeImage: store.image || store.logo,
            }));
          })
        );
        setFeaturedItems(menuResults.flat().slice(0, 12));
      } else {
        throw new Error(storesResult.message || 'فشل تحميل المتاجر');
      }

      setStatus('success');
    } catch (err) {
      setStatus('error');
      if (!isRefresh) {
        Alert.alert('خطأ', err.message);
      }
    } finally {
      setRefreshing(false);
    }
  }, [deliveryLocation]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(() => {
    loadData(true);
  }, [loadData]);

  const visibleProducts = useMemo(() => {
    const search = searchText.trim().toLowerCase();
    if (!search) return featuredItems;
    return featuredItems.filter((item) => String(item.name || '').toLowerCase().includes(search));
  }, [featuredItems, searchText]);

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
  }, [navigation]);

  const handleStartOrder = useCallback(() => {
    if (cartByStore.length > 0) {
      navigation.navigate('Cart');
      return;
    }

    Alert.alert('اطلب أوردر', 'اختار متجر وأضف منتجات للسلة أولاً.');
  }, [cartByStore.length, navigation]);

  const handleBottomNavigation = useCallback((route) => {
    if (route === 'account') {
      navigation.navigate(isGuest ? 'Settings' : 'CustomerProfile');
      return;
    }

    if (route === 'partner') {
      navigation.navigate('PartnerEntry');
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

  if (status === 'loading') {
    return <Loading text="جاري تحميل المتاجر..." />;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.contentScroll}
        contentContainerStyle={styles.contentScrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={status === 'refreshing'}
            onRefresh={onRefresh}
            colors={[HOME_ACCENT]}
            tintColor={HOME_ACCENT}
          />
        }
      >
      <View style={styles.hero}>
        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.brandMark}>NOW</Text>
            <Text style={styles.greeting}>
              {isGuest ? 'أهلاً بك 👋' : `أهلاً ${user?.name || ''}`}
            </Text>
            <Text style={styles.subGreeting}>
              {isGuest ? 'اكتشف المنتجات واطلب اللي نفسك فيه' : 'اكتشف المنتجات القريبة منك'}
            </Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.profileButton} onPress={handleSettingsPress} activeOpacity={0.8}>
              <Ionicons name="settings-outline" size={20} color={HOME_ACCENT} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => navigation.navigate(isGuest ? 'Login' : 'Cart')}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="السلة"
            >
              <Ionicons name="cart-outline" size={22} color="#fff" />
              {cart.length > 0 && (
                <View style={styles.cartBadgeHeader}>
                  <Text style={styles.cartBadgeTextHeader}>{cart.length > 9 ? '9+' : cart.length}</Text>
                </View>
              )}
            </TouchableOpacity>

            {isAuthenticated && (
              <TouchableOpacity
                style={styles.profileButton}
                onPress={() => navigation.navigate('CustomerProfile')}
                activeOpacity={0.8}
              >
                <Ionicons name="person-outline" size={20} color={HOME_ACCENT} />
              </TouchableOpacity>
            )}
            {isAuthenticated && (
              <TouchableOpacity
                style={styles.profileButton}
                onPress={handleLogout}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="تسجيل الخروج"
              >
                <Ionicons name="log-out-outline" size={20} color={HOME_ACCENT} />
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

        <View style={styles.deliveryOptions}>
          {deliveryLocation && scheduledDate && (
            <TouchableOpacity style={styles.orderNowButton} onPress={handleStartOrder} activeOpacity={0.85}>
              <Text style={styles.orderNowText}>اطلب أوردر</Text>
              <Ionicons name="arrow-forward" size={17} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={21} color={HOME_ACCENT} />
          <TextInput
            style={[styles.searchInput, isRTL ? styles.searchInputRTL : styles.searchInputLTR]}
            placeholder="ابحث عن منتج..."
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
          showSchedule={false}
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
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.8}
          >
            <Text style={styles.guestBannerBtnText}>دخول</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.productsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>المنتجات المتاحة</Text>
          <Text style={styles.productCount}>{visibleProducts.length} منتج</Text>
        </View>
        {visibleProducts.length > 0 ? (
          <View style={styles.productsList}>
            {visibleProducts.map((item, index) => (
            <TouchableOpacity
              key={`${item.storeId}-${item.id}-${index}`}
              style={styles.productCard}
              onPress={() => handleStorePress(stores.find((store) => store.id === item.storeId))}
              accessibilityLabel={item.name || 'منتج'}
              activeOpacity={0.85}
            >
              <View style={styles.productImageFrame}>
                <Image
                  source={{
                    uri: item.image || item.img || 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80',
                  }}
                  style={styles.productImage}
                  resizeMode="cover"
                />
                <ProductImageDetails item={item} />
              </View>
            </TouchableOpacity>
            ))}
          </View>
        ) : (
          <Text style={styles.productsEmpty}>
            {searchText ? 'لا توجد منتجات مطابقة للبحث' : 'المنتجات ستظهر هنا قريباً'}
          </Text>
        )}
      </View>

      </ScrollView>

      {isGuest && (
        <View style={styles.guestBottomNav}>
          {[
            { key: 'account', label: 'حسابي', icon: 'person-outline' },
            { key: 'partner', label: 'انضم كشريك', icon: 'hand-left-outline' },
            { key: 'home', label: 'الرئيسية', icon: 'home', active: true },
            { key: 'orders', label: 'طلباتي', icon: 'receipt-outline' },
            { key: 'about', label: 'حول تطبيق NOW', icon: 'information-circle-outline' },
          ].map((item) => (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              style={({ pressed }) => [
                styles.guestBottomNavItem,
                item.key === 'partner' && styles.partnerNavItem,
                pressed && styles.guestBottomNavItemPressed,
              ]}
              onPress={() => handleBottomNavigation(item.key)}
            >
              <Ionicons
                name={item.icon}
                size={20}
                color={item.key === 'partner' ? HOME_ACCENT : item.active ? HOME_ACCENT : COLORS.textSecondary}
              />
              <Text style={[
                styles.guestBottomNavLabel,
                item.active && styles.guestBottomNavLabelActive,
                item.key === 'partner' && styles.partnerNavLabel,
              ]}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
};

const ProductImageDetails = ({ item }) => {
  const ratingCount = Number(item.ratingsCount ?? item.ratingCount ?? 0);
  const averageRating = Number(item.averageRating ?? item.ratingAverage ?? 0);
  const hasDiscount = Number(item.discountValue || 0) > 0 && Number(item.originalPrice) > Number(item.price);
  const categoryName = item.category?.nameAr || item.category?.name || item.categoryName || item.category;

  return (
    <View style={styles.productImageDetails}>
      <Text style={styles.productNameOverlay} numberOfLines={1}>{item.name}</Text>
      <View style={styles.productDetailsRow}>
        <Text style={styles.productPriceOverlay}>{formatPrice(item.price)}</Text>
        {categoryName ? <Text style={styles.productTypeOverlay} numberOfLines={1}>{categoryName}</Text> : null}
        {ratingCount > 0 ? <Text style={styles.productRatingOverlay}>⭐ {averageRating.toFixed(1)} ({ratingCount})</Text> : null}
      </View>
      {hasDiscount ? (
        <View style={styles.productDiscountRow}>
          <Text style={styles.productDiscountOverlay}>
            خصم {item.discountPercentage ? `${item.discountPercentage}%` : formatPrice(item.discountValue)}
          </Text>
          <Text style={styles.productOriginalOverlay}>{formatPrice(item.originalPrice)}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentScroll: {
    flex: 1,
  },
  contentScrollContainer: {
    paddingBottom: 24,
  },
  hero: {
    backgroundColor: HOME_ACCENT,
    paddingTop: 4,
    paddingBottom: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 6,
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
    fontSize: 19,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  subGreeting: {
    fontSize: 12,
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
    marginBottom: 8,
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
  deliveryOptions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  deliveryOption: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: '#D7EEF1',
  },
  deliveryOptionText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
  },
  orderNowButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 13,
    borderRadius: 14,
    backgroundColor: HOME_ACCENT,
  },
  orderNowText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
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
    height: 40,
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
    height: 26,
  },
  brandLogoText: {
    fontSize: 24,
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
  productsSection: {
    marginTop: 12,
    marginBottom: 4,
  },
  productsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  productCard: {
    width: '48%',
    marginBottom: 14,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D7EEF1',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#0B8FA3',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 7,
  },
  productImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#E9FAFD',
  },
  productImageFrame: {
    position: 'relative',
  },
  productImageDetails: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  productNameOverlay: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'right',
  },
  productDetailsRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 3,
  },
  productPriceOverlay: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  productTypeOverlay: {
    color: '#BAE6FD',
    fontSize: 10,
    fontWeight: '700',
    maxWidth: '38%',
  },
  productRatingOverlay: {
    color: '#FDE68A',
    fontSize: 10,
    fontWeight: '700',
  },
  productDiscountRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  productDiscountOverlay: {
    color: '#FECACA',
    fontSize: 10,
    fontWeight: '800',
  },
  productOriginalOverlay: {
    color: '#CBD5E1',
    fontSize: 10,
    textDecorationLine: 'line-through',
  },
  productsEmpty: {
    color: COLORS.textSecondary,
    fontSize: 13,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  ordersSection: {
    marginTop: 4,
    marginBottom: 8,
    paddingBottom: 8,
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
  productCount: {
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
  partnerNavItem: {
    marginVertical: 7,
    borderRadius: 15,
    backgroundColor: '#FFF1F7',
  },
  guestBottomNavItemPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.94 }],
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
  partnerNavLabel: {
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
// مسودة المشروع - البشمهندس حسن ياسر