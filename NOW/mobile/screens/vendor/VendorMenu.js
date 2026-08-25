import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import useAppStore from '../../store/appStore';
import { storeService } from '../../services/storeService';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';

const VendorMenu = ({ navigation }) => {
  const { user } = useAppStore();

  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const [updatingItemId, setUpdatingItemId] = useState(null);
  const [deletingItemId, setDeletingItemId] = useState(null);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  /*
   * ==========================================
   * STORE ID
   * ==========================================
   */

  const storeId = user?.storeId || user?.store?.id || user?.id;

  /*
   * ==========================================
   * LOAD MENU
   * ==========================================
   */

  const fetchMenu = useCallback(
    async ({ silent = false } = {}) => {
      if (!storeId) {
        if (mountedRef.current) {
          setMenu([]);
          setLoading(false);
        }

        return;
      }

      if (!silent) {
        setLoading(true);
      }

      try {
        const result = await storeService.getMenu(storeId);

        if (!mountedRef.current) return;

        if (result?.success) {
          setMenu(
            Array.isArray(result.menu)
              ? result.menu
              : []
          );
        } else {
          setMenu([]);

          if (!silent) {
            Alert.alert(
              'تعذر تحميل المنيو',
              result?.message || 'حدث خطأ أثناء تحميل الأصناف'
            );
          }
        }
      } catch (error) {
        console.error('VENDOR MENU LOAD ERROR:', error);

        if (!mountedRef.current) return;

        setMenu([]);

        if (!silent) {
          Alert.alert(
            'خطأ',
            'تعذر الاتصال بالسيرفر'
          );
        }
      } finally {
        if (mountedRef.current && !silent) {
          setLoading(false);
        }
      }
    },
    [storeId]
  );

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  /*
   * ==========================================
   * REFRESH
   * ==========================================
   */

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);

    try {
      await fetchMenu({ silent: true });
    } finally {
      if (mountedRef.current) {
        setRefreshing(false);
      }
    }
  }, [fetchMenu]);

  /*
   * ==========================================
   * SEARCH + FILTER
   * ==========================================
   */

  const filteredMenu = useMemo(() => {
    const query = search.trim().toLowerCase();

    return menu.filter((item) => {
      const name = String(
        item?.name || ''
      ).toLowerCase();

      const description = String(
        item?.description || ''
      ).toLowerCase();

      const matchesSearch =
        !query ||
        name.includes(query) ||
        description.includes(query);

      if (!matchesSearch) {
        return false;
      }

      if (filter === 'available') {
        return item?.isAvailable === true;
      }

      if (filter === 'unavailable') {
        return item?.isAvailable === false;
      }

      return true;
    });
  }, [menu, search, filter]);

  /*
   * ==========================================
   * STATISTICS
   * ==========================================
   */

  const statistics = useMemo(() => {
    const total = menu.length;

    const available = menu.filter(
      (item) => item?.isAvailable === true
    ).length;

    const unavailable = menu.filter(
      (item) => item?.isAvailable === false
    ).length;

    return {
      total,
      available,
      unavailable,
    };
  }, [menu]);

  /*
   * ==========================================
   * TOGGLE AVAILABILITY
   * ==========================================
   */

  const toggleAvailability = useCallback(
    async (item) => {
      const itemId = item?.id;

      if (!itemId || !storeId) {
        Alert.alert(
          'خطأ',
          'بيانات الصنف أو المتجر غير موجودة'
        );
        return;
      }

      if (updatingItemId || deletingItemId) {
        return;
      }

      const newAvailability = !Boolean(
        item.isAvailable
      );

      setUpdatingItemId(itemId);

      /*
       * Optimistic UI
       * تحديث الواجهة مباشرة
       */
      setMenu((currentMenu) =>
        currentMenu.map((currentItem) =>
          String(currentItem.id) === String(itemId)
            ? {
                ...currentItem,
                isAvailable: newAvailability,
              }
            : currentItem
        )
      );

      try {
        const result =
          await storeService.updateMenuItem(
            storeId,
            itemId,
            {
              ...item,
              isAvailable: newAvailability,
            }
          );

        if (!mountedRef.current) return;

        if (!result?.success) {
          /*
           * Rollback
           */
          setMenu((currentMenu) =>
            currentMenu.map((currentItem) =>
              String(currentItem.id) === String(itemId)
                ? {
                    ...currentItem,
                    isAvailable:
                      !newAvailability,
                  }
                : currentItem
            )
          );

          Alert.alert(
            'لم يتم التحديث',
            result?.message ||
              'فشل تغيير حالة الصنف'
          );

          return;
        }

        /*
         * لو السيرفر رجع نسخة محدثة من الصنف
         */
        if (result?.menuItem) {
          setMenu((currentMenu) =>
            currentMenu.map((currentItem) =>
              String(currentItem.id) === String(itemId)
                ? {
                    ...currentItem,
                    ...result.menuItem,
                  }
                : currentItem
            )
          );
        }
      } catch (error) {
        console.error(
          'TOGGLE MENU ITEM ERROR:',
          error
        );

        if (!mountedRef.current) return;

        /*
         * Rollback
         */
        setMenu((currentMenu) =>
          currentMenu.map((currentItem) =>
            String(currentItem.id) === String(itemId)
              ? {
                  ...currentItem,
                  isAvailable:
                    !newAvailability,
                }
              : currentItem
          )
        );

        Alert.alert(
          'خطأ',
          'تعذر تحديث حالة الصنف'
        );
      } finally {
        if (mountedRef.current) {
          setUpdatingItemId(null);
        }
      }
    },
    [
      storeId,
      updatingItemId,
      deletingItemId,
    ]
  );

  /*
   * ==========================================
   * DELETE ITEM
   * ==========================================
   */

  const deleteItem = useCallback(
    (item) => {
      const itemId = item?.id;

      if (!itemId || !storeId) {
        Alert.alert(
          'خطأ',
          'بيانات الصنف أو المتجر غير موجودة'
        );
        return;
      }

      if (updatingItemId || deletingItemId) {
        return;
      }

      Alert.alert(
        'حذف الصنف',
        `هل أنت متأكد من حذف "${item?.name || 'هذا الصنف'}"؟\n\nلا يمكن التراجع عن هذه العملية.`,
        [
          {
            text: 'إلغاء',
            style: 'cancel',
          },
          {
            text: 'حذف',
            style: 'destructive',
            onPress: async () => {
              setDeletingItemId(itemId);

              try {
                const result =
                  await storeService.deleteMenuItem(
                    storeId,
                    itemId
                  );

                if (!mountedRef.current) return;

                if (result?.success) {
                  setMenu((currentMenu) =>
                    currentMenu.filter(
                      (currentItem) =>
                        String(currentItem.id) !==
                        String(itemId)
                    )
                  );

                  Alert.alert(
                    'تم الحذف',
                    'تم حذف الصنف بنجاح'
                  );
                } else {
                  Alert.alert(
                    'لم يتم الحذف',
                    result?.message ||
                      'فشل حذف الصنف'
                  );
                }
              } catch (error) {
                console.error(
                  'DELETE MENU ITEM ERROR:',
                  error
                );

                if (mountedRef.current) {
                  Alert.alert(
                    'خطأ',
                    'تعذر حذف الصنف'
                  );
                }
              } finally {
                if (mountedRef.current) {
                  setDeletingItemId(null);
                }
              }
            },
          },
        ]
      );
    },
    [
      storeId,
      updatingItemId,
      deletingItemId,
    ]
  );

  /*
   * ==========================================
   * EDIT ITEM
   * ==========================================
   */

  const editItem = useCallback(
    (item) => {
      navigation.navigate(
        'EditMenuItem',
        {
          item,
          storeId,
        }
      );
    },
    [navigation, storeId]
  );

  /*
   * ==========================================
   * ADD ITEM
   * ==========================================
   */

  const addItem = useCallback(() => {
    navigation.navigate(
      'AddMenuItem',
      {
        storeId,
      }
    );
  }, [navigation, storeId]);

  /*
   * ==========================================
   * ITEM CARD
   * ==========================================
   */

  const renderItem = useCallback(
    ({ item }) => {
      const itemId = item?.id;

      const isUpdating =
        String(updatingItemId) ===
        String(itemId);

      const isDeleting =
        String(deletingItemId) ===
        String(itemId);

      const isAvailable =
        item?.isAvailable === true;

      const price = Number(
        item?.price ?? 0
      );

      return (
        <View
          style={[
            styles.card,
            !isAvailable &&
              styles.cardUnavailable,
          ]}
        >
          {/* ================= HEADER ================= */}

          <View style={styles.cardHeader}>
            <View style={styles.itemInfo}>
              <Text
                style={[
                  styles.itemName,
                  !isAvailable &&
                    styles.disabledText,
                ]}
                numberOfLines={2}
              >
                {item?.name || 'صنف بدون اسم'}
              </Text>

              {!!item?.description && (
                <Text
                  style={styles.itemDescription}
                  numberOfLines={2}
                >
                  {item.description}
                </Text>
              )}
            </View>

            <View
              style={[
                styles.statusBadge,
                isAvailable
                  ? styles.statusAvailable
                  : styles.statusUnavailable,
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor:
                      isAvailable
                        ? COLORS.success
                        : COLORS.error,
                  },
                ]}
              />

              <Text
                style={[
                  styles.statusText,
                  {
                    color: isAvailable
                      ? COLORS.success
                      : COLORS.error,
                  },
                ]}
              >
                {isAvailable
                  ? 'متاح'
                  : 'غير متاح'}
              </Text>
            </View>
          </View>

          {/* ================= PRICE ================= */}

          <View style={styles.priceRow}>
            <View>
              <Text style={styles.priceLabel}>
                السعر
              </Text>

              <Text
                style={[
                  styles.price,
                  !isAvailable &&
                    styles.disabledText,
                ]}
              >
                {Number.isFinite(price)
                  ? price.toFixed(2)
                  : '0.00'}{' '}
                ج.م
              </Text>
            </View>

            {!!item?.category && (
              <View
                style={styles.categoryBadge}
              >
                <Ionicons
                  name="restaurant-outline"
                  size={14}
                  color={
                    COLORS.textSecondary
                  }
                />

                <Text
                  style={
                    styles.categoryText
                  }
                >
                  {item.category}
                </Text>
              </View>
            )}
          </View>

          {/* ================= ACTIONS ================= */}

          <View style={styles.actions}>
            {/* Availability */}

            <TouchableOpacity
              style={[
                styles.actionButton,
                isAvailable
                  ? styles.availabilityOn
                  : styles.availabilityOff,
              ]}
              onPress={() =>
                toggleAvailability(item)
              }
              disabled={
                isUpdating ||
                isDeleting
              }
              activeOpacity={0.8}
            >
              {isUpdating ? (
                <ActivityIndicator
                  size="small"
                  color={COLORS.primary}
                />
              ) : (
                <>
                  <Ionicons
                    name={
                      isAvailable
                        ? 'eye-outline'
                        : 'eye-off-outline'
                    }
                    size={18}
                    color={
                      isAvailable
                        ? COLORS.success
                        : COLORS.error
                    }
                  />

                  <Text
                    style={[
                      styles.actionText,
                      {
                        color:
                          isAvailable
                            ? COLORS.success
                            : COLORS.error,
                      },
                    ]}
                  >
                    {isAvailable
                      ? 'إيقاف'
                      : 'تفعيل'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Edit */}

            <TouchableOpacity
              style={[
                styles.iconButton,
                styles.editButton,
              ]}
              onPress={() =>
                editItem(item)
              }
              disabled={
                isUpdating ||
                isDeleting
              }
              activeOpacity={0.8}
            >
              <Ionicons
                name="create-outline"
                size={20}
                color={COLORS.primary}
              />
            </TouchableOpacity>

            {/* Delete */}

            <TouchableOpacity
              style={[
                styles.iconButton,
                styles.deleteButton,
              ]}
              onPress={() =>
                deleteItem(item)
              }
              disabled={
                isUpdating ||
                isDeleting
              }
              activeOpacity={0.8}
            >
              {isDeleting ? (
                <ActivityIndicator
                  size="small"
                  color={COLORS.error}
                />
              ) : (
                <Ionicons
                  name="trash-outline"
                  size={20}
                  color={COLORS.error}
                />
              )}
            </TouchableOpacity>
          </View>
        </View>
      );
    },
    [
      updatingItemId,
      deletingItemId,
      toggleAvailability,
      editItem,
      deleteItem,
    ]
  );

  /*
   * ==========================================
   * EMPTY STATE
   * ==========================================
   */

  const renderEmpty = useCallback(() => {
    if (loading) {
      return null;
    }

    if (
      search.trim() ||
      filter !== 'all'
    ) {
      return (
        <View style={styles.emptySearch}>
          <Ionicons
            name="search-outline"
            size={50}
            color={COLORS.textLight}
          />

          <Text
            style={styles.emptyTitle}
          >
            لا توجد نتائج
          </Text>

          <Text
            style={styles.emptyText}
          >
            لم نجد أصنافًا مطابقة للبحث
            أو الفلتر الحالي.
          </Text>

          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => {
              setSearch('');
              setFilter('all');
            }}
          >
            <Text
              style={
                styles.clearButtonText
              }
            >
              مسح البحث والفلتر
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <EmptyState
        icon="restaurant-outline"
        title="المنيو فارغة"
        message="ابدأ بإضافة أول صنف إلى منيو متجرك"
      />
    );
  }, [
    loading,
    search,
    filter,
  ]);

  /*
   * ==========================================
   * HEADER
   * ==========================================
   */

  const renderHeader = useCallback(
    () => (
      <View>
        {/* TOP HEADER */}

        <View style={styles.header}>
          <TouchableOpacity
            onPress={() =>
              navigation.goBack()
            }
            style={styles.headerIcon}
          >
            <Ionicons
              name="arrow-back"
              size={25}
              color={
                COLORS.textPrimary
              }
            />
          </TouchableOpacity>

          <View
            style={styles.headerTitleBox}
          >
            <Text
              style={styles.headerTitle}
            >
              إدارة المنيو
            </Text>

            <Text
              style={styles.headerSubtitle}
            >
              {statistics.total}{' '}
              {statistics.total === 1
                ? 'صنف'
                : 'أصناف'}
            </Text>
          </View>

          <TouchableOpacity
            onPress={addItem}
            style={styles.addButton}
            activeOpacity={0.8}
          >
            <Ionicons
              name="add"
              size={27}
              color="#fff"
            />
          </TouchableOpacity>
        </View>

        {/* STATS */}

        <View style={styles.stats}>
          <View style={styles.statCard}>
            <View
              style={[
                styles.statIcon,
                styles.statBlue,
              ]}
            >
              <Ionicons
                name="restaurant-outline"
                size={19}
                color={COLORS.primary}
              />
            </View>

            <Text
              style={styles.statNumber}
            >
              {statistics.total}
            </Text>

            <Text
              style={styles.statLabel}
            >
              إجمالي
            </Text>
          </View>

          <View style={styles.statCard}>
            <View
              style={[
                styles.statIcon,
                styles.statGreen,
              ]}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={19}
                color={COLORS.success}
              />
            </View>

            <Text
              style={styles.statNumber}
            >
              {statistics.available}
            </Text>

            <Text
              style={styles.statLabel}
            >
              متاح
            </Text>
          </View>

          <View style={styles.statCard}>
            <View
              style={[
                styles.statIcon,
                styles.statRed,
              ]}
            >
              <Ionicons
                name="eye-off-outline"
                size={19}
                color={COLORS.error}
              />
            </View>

            <Text
              style={styles.statNumber}
            >
              {statistics.unavailable}
            </Text>

            <Text
              style={styles.statLabel}
            >
              متوقف
            </Text>
          </View>
        </View>

        {/* SEARCH */}

        <View
          style={styles.searchContainer}
        >
          <Ionicons
            name="search-outline"
            size={21}
            color={
              COLORS.textSecondary
            }
          />

          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="ابحث عن صنف..."
            placeholderTextColor={
              COLORS.textLight
            }
            textAlign="right"
            returnKeyType="search"
          />

          {search.length > 0 && (
            <TouchableOpacity
              onPress={() =>
                setSearch('')
              }
            >
              <Ionicons
                name="close-circle"
                size={20}
                color={
                  COLORS.textSecondary
                }
              />
            </TouchableOpacity>
          )}
        </View>

        {/* FILTERS */}

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={
            false
          }
          data={[
            {
              id: 'all',
              label: 'الكل',
            },
            {
              id: 'available',
              label: 'متاح',
            },
            {
              id: 'unavailable',
              label: 'غير متاح',
            },
          ]}
          keyExtractor={(item) =>
            item.id
          }
          contentContainerStyle={
            styles.filters
          }
          renderItem={({ item }) => {
            const active =
              filter === item.id;

            return (
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  active &&
                    styles.filterButtonActive,
                ]}
                onPress={() =>
                  setFilter(item.id)
                }
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.filterText,
                    active &&
                      styles.filterTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />

        <Text
          style={styles.sectionTitle}
        >
          الأصناف
        </Text>
      </View>
    ),
    [
      navigation,
      statistics,
      addItem,
      search,
      filter,
    ]
  );

  /*
   * ==========================================
   * LOADING
   * ==========================================
   */

  if (loading) {
    return (
      <Loading
        text="جاري تحميل المنيو..."
      />
    );
  }

  /*
   * ==========================================
   * RENDER
   * ==========================================
   */

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredMenu}
        renderItem={renderItem}
        keyExtractor={(item, index) =>
          String(
            item?.id ?? index
          )
        }
        ListHeaderComponent={
          renderHeader
        }
        ListEmptyComponent={
          renderEmpty
        }
        contentContainerStyle={[
          styles.list,
          filteredMenu.length ===
            0 &&
            styles.emptyList,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={
              handleRefresh
            }
            colors={[
              COLORS.primary,
            ]}
            tintColor={
              COLORS.primary
            }
          />
        }
        showsVerticalScrollIndicator={
          false
        }
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor:
      COLORS.background,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor:
      COLORS.border,
  },

  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent:
      'center',
  },

  headerTitleBox: {
    flex: 1,
    alignItems: 'center',
  },

  headerTitle: {
    fontSize: 19,
    fontWeight: '900',
    color:
      COLORS.textPrimary,
  },

  headerSubtitle: {
    marginTop: 2,
    fontSize: 11,
    color:
      COLORS.textSecondary,
  },

  addButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent:
      'center',
    backgroundColor:
      COLORS.primary,
  },

  stats: {
    flexDirection: 'row',
    gap: 9,
    paddingHorizontal: 14,
    paddingTop: 13,
  },

  statCard: {
    flex: 1,
    minHeight: 96,
    borderRadius: 16,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    backgroundColor:
      COLORS.white || '#fff',
    alignItems: 'center',
    justifyContent:
      'center',
  },

  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent:
      'center',
    marginBottom: 5,
  },

  statBlue: {
    backgroundColor:
      '#FCE7F3',
  },

  statGreen: {
    backgroundColor:
      '#DCFCE7',
  },

  statRed: {
    backgroundColor:
      '#FEE2E2',
  },

  statNumber: {
    fontSize: 20,
    fontWeight: '900',
    color:
      COLORS.textPrimary,
  },

  statLabel: {
    fontSize: 10,
    marginTop: 1,
    color:
      COLORS.textSecondary,
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 51,
    marginHorizontal: 14,
    marginTop: 14,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 14,
    backgroundColor:
      COLORS.white || '#fff',
  },

  searchInput: {
    flex: 1,
    fontSize: 14,
    color:
      COLORS.textPrimary,
    paddingHorizontal: 9,
    paddingVertical: 11,
  },

  filters: {
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 8,
  },

  filterButton: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    backgroundColor:
      COLORS.white || '#fff',
  },

  filterButtonActive: {
    backgroundColor:
      COLORS.primary,
    borderColor:
      COLORS.primary,
  },

  filterText: {
    fontSize: 12,
    fontWeight: '800',
    color:
      COLORS.textSecondary,
  },

  filterTextActive: {
    color: '#fff',
  },

  sectionTitle: {
    marginHorizontal: 16,
    marginBottom: 10,
    fontSize: 18,
    fontWeight: '900',
    color:
      COLORS.textPrimary,
    textAlign: 'right',
  },

  list: {
    paddingBottom: 30,
  },

  emptyList: {
    flexGrow: 1,
  },

  card: {
    marginHorizontal: 14,
    marginBottom: 12,
    padding: 15,
    borderRadius: 18,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    backgroundColor:
      COLORS.white || '#fff',
  },

  cardUnavailable: {
    opacity: 0.88,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent:
      'space-between',
  },

  itemInfo: {
    flex: 1,
    marginRight: 12,
  },

  itemName: {
    fontSize: 16,
    fontWeight: '900',
    color:
      COLORS.textPrimary,
    textAlign: 'right',
  },

  itemDescription: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 18,
    color:
      COLORS.textSecondary,
    textAlign: 'right',
  },

  disabledText: {
    color:
      COLORS.textLight,
  },

  statusBadge: {
    flexDirection:
      'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
  },

  statusAvailable: {
    backgroundColor:
      '#DCFCE7',
  },

  statusUnavailable: {
    backgroundColor:
      '#FEE2E2',
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginLeft: 6,
  },

  statusText: {
    fontSize: 11,
    fontWeight: '900',
  },

  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
    marginTop: 15,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor:
      COLORS.border,
  },

  priceLabel: {
    fontSize: 10,
    color:
      COLORS.textSecondary,
    textAlign: 'right',
  },

  price: {
    marginTop: 2,
    fontSize: 19,
    fontWeight: '900',
    color:
      COLORS.primary,
    textAlign: 'right',
  },

  categoryBadge: {
    flexDirection:
      'row-reverse',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor:
      '#F3F4F6',
  },

  categoryText: {
    fontSize: 10,
    color:
      COLORS.textSecondary,
    fontWeight: '700',
  },

  actions: {
    flexDirection:
      'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },

  actionButton: {
    flex: 1,
    minHeight: 45,
    borderRadius: 13,
    flexDirection:
      'row-reverse',
    alignItems: 'center',
    justifyContent:
      'center',
    gap: 7,
  },

  availabilityOn: {
    backgroundColor:
      '#DCFCE7',
  },

  availabilityOff: {
    backgroundColor:
      '#FEE2E2',
  },

  actionText: {
    fontSize: 12,
    fontWeight: '900',
  },

  iconButton: {
    width: 45,
    height: 45,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent:
      'center',
  },

  editButton: {
    backgroundColor:
      '#FCE7F3',
  },

  deleteButton: {
    backgroundColor:
      '#FEE2E2',
  },

  emptySearch: {
    alignItems: 'center',
    justifyContent:
      'center',
    paddingHorizontal: 30,
    paddingVertical: 55,
  },

  emptyTitle: {
    marginTop: 14,
    fontSize: 19,
    fontWeight: '900',
    color:
      COLORS.textPrimary,
  },

  emptyText: {
    marginTop: 7,
    fontSize: 13,
    lineHeight: 20,
    color:
      COLORS.textSecondary,
    textAlign: 'center',
  },

  clearButton: {
    marginTop: 18,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 13,
    backgroundColor:
      COLORS.primary,
  },

  clearButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },
});

export default VendorMenu;