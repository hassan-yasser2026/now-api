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
  Linking,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

import { COLORS } from '../../constants/colors';
import useAppStore from '../../store/appStore';
import { authService } from '../../services/authService';
import deliveryService from '../../services/deliveryService';


/* =========================================================
   ORDER STATUS
========================================================= */

const ORDER_STATUS = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  PREPARING: 'PREPARING',
  READY: 'READY',
  PICKED_UP: 'PICKED_UP',
  ON_THE_WAY: 'ON_THE_WAY',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
};

const ACTIVE_STATUSES = [
  ORDER_STATUS.READY,
  ORDER_STATUS.PICKED_UP,
  ORDER_STATUS.ON_THE_WAY,
];

const FILTERS = [
  {
    id: 'all',
    label: 'الكل',
    icon: 'apps-outline',
  },
  {
    id: 'pending',
    label: 'متاحة',
    icon: 'time-outline',
  },
  {
    id: 'active',
    label: 'جارية',
    icon: 'bicycle-outline',
  },
  {
    id: 'delivered',
    label: 'مكتملة',
    icon: 'checkmark-circle-outline',
  },
];

/* =========================================================
   HELPERS
========================================================= */

const normalizeId = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  return String(value);
};

const getOrderCustomerName = (order) => {
  return (
    order?.customer?.name ||
    order?.user?.name ||
    order?.customerName ||
    'Railway Customer'
  );
};

const getOrderPhone = (order) => {
  return (
    order?.customer?.phone ||
    order?.user?.phone ||
    order?.customerPhone ||
    order?.phone ||
    null
  );
};

const getOrderAddress = (order) => {
  return (
    order?.address ||
    order?.deliveryAddress ||
    order?.shippingAddress ||
    'العنوان غير محدد'
  );
};

const getOrderTotal = (order) => {
  const value =
    order?.totalPrice ??
    order?.total ??
    order?.amount ??
    0;

  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
};

const getOrderItems = (order) => {
  if (Array.isArray(order?.items)) {
    return order.items;
  }

  if (Array.isArray(order?.orderItems)) {
    return order.orderItems;
  }

  return [];
};

const getItemName = (item) => {
  return (
    item?.menuItem?.name ||
    item?.product?.name ||
    item?.name ||
    item?.menuItemName ||
    'صنف'
  );
};

const getItemQuantity = (item) => {
  const quantity = Number(item?.quantity);

  return Number.isFinite(quantity) && quantity > 0
    ? quantity
    : 1;
};

const getItemPrice = (item) => {
  const value =
    item?.price ??
    item?.unitPrice ??
    item?.menuItem?.price ??
    0;

  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
};

const getStatusText = (status) => {
  switch (status) {
    case ORDER_STATUS.PENDING:
      return 'في الانتظار';
    case ORDER_STATUS.ACCEPTED:
      return 'تم القبول';
    case ORDER_STATUS.PREPARING:
      return 'قيد التحضير';
    case ORDER_STATUS.READY:
      return 'جاهز للاستلام';
    case ORDER_STATUS.PICKED_UP:
      return 'تم الاستلام';
    case ORDER_STATUS.ON_THE_WAY:
      return 'في الطريق';
    case ORDER_STATUS.DELIVERED:
      return 'تم التوصيل';
    case ORDER_STATUS.CANCELLED:
      return 'ملغي';
    default:
      return status || 'غير معروف';
  }
};

const getStatusColor = (status) => {
  switch (status) {
    case ORDER_STATUS.PENDING:
    case ORDER_STATUS.ACCEPTED:
    case ORDER_STATUS.PREPARING:
      return COLORS.warning;
    case ORDER_STATUS.READY:
    case ORDER_STATUS.PICKED_UP:
    case ORDER_STATUS.ON_THE_WAY:
      return COLORS.primary;
    case ORDER_STATUS.DELIVERED:
      return COLORS.success;
    case ORDER_STATUS.CANCELLED:
      return COLORS.error;
    default:
      return COLORS.textSecondary;
  }
};

const formatPaymentMethod = (method) => {
  switch (String(method || '').toUpperCase()) {
    case 'CASH':
      return 'كاش';

    case 'CARD':
      return 'بطاقة';

    case 'VISA':
      return 'فيزا';

    case 'MASTERCARD':
      return 'ماستركارد';

    case 'WALLET':
      return 'محفظة إلكترونية';

    default:
      return method || 'غير محدد';
  }
};

const formatDate = (value) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  try {
    return date.toLocaleString('ar-EG', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return date.toLocaleString();
  }
};

/* =========================================================
   COMPONENT
========================================================= */

const DeliveryDashboard = ({ navigation }) => {
  const { user, logout } = useAppStore();
  const { width } = useWindowDimensions();
  const isCompact = width < 720;

  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locationReady, setLocationReady] = useState(false);

  const [processingOrderId, setProcessingOrderId] =
    useState(null);

  const [expandedOrderId, setExpandedOrderId] =
    useState(null);

  const mountedRef = useRef(true);

  /* =======================================================
     MOUNT
  ======================================================= */

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  /* =======================================================
     FETCH ORDERS
  ======================================================= */

  const ensureCurrentLocation = useCallback(async () => {
    if (!locationReady) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('الموقع مطلوب', 'يجب السماح بالموقع الحالي لاستقبال وإدارة الطلبات.');
        return false;
      }
      setLocationReady(true);
    }

    // نحدّث الموقع الحالي في كل استدعاء حتى تبقى خريطة تتبع العميل محدثة
    // أثناء تحرك المندوب، بدل الاكتفاء بإرسال الموقع مرة واحدة فقط.
    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      await deliveryService.updateLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    } catch (error) {
      console.error('LOCATION UPDATE ERROR:', error);
    }

    return true;
  }, [locationReady]);

  useEffect(() => {
    let subscription;
    let cancelled = false;
    const watchLocation = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || cancelled) return;
      setLocationReady(true);
      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 100,
          timeInterval: 30000,
        },
        ({ coords }) => {
          deliveryService.updateLocation({
            latitude: coords.latitude,
            longitude: coords.longitude,
          }).catch((error) => console.warn('BACKGROUND LOCATION UPDATE ERROR:', error?.message));
        }
      );
    };
    watchLocation().catch((error) => console.warn('LOCATION WATCH ERROR:', error?.message));
    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, []);

  const fetchOrders = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent && mountedRef.current) {
        setLoading(true);
      }

      try {
        if (!user?.id) {
          if (mountedRef.current) {
            setOrders([]);
          }
          return;
        }

        const hasCurrentLocation = await ensureCurrentLocation();
        if (!hasCurrentLocation) {
          setOrders([]);
          return;
        }

        const extractOrders = (result) => {
          if (Array.isArray(result?.data)) return result.data;
          if (Array.isArray(result?.orders)) return result.orders;
          if (Array.isArray(result?.data?.orders)) return result.data.orders;
          return [];
        };

        const [assignedResult, availableResult] = await Promise.all([
          deliveryService.getMyOrders().catch(() => null),
          deliveryService.getAvailableOrders().catch(() => null),
        ]);

        if (!mountedRef.current) {
          return;
        }

        const mergedOrders = [...extractOrders(assignedResult), ...extractOrders(availableResult)];
        const uniqueOrders = Array.from(
          new Map(mergedOrders.map((order) => [String(order?.id), order])).values()
        );

        setOrders(uniqueOrders);

        if (!uniqueOrders.length && !silent && !assignedResult?.success && !availableResult?.success) {
          Alert.alert(
            'تعذر تحميل الطلبات',
            assignedResult?.message || availableResult?.message || 'تعذر تحميل الطلبات حاليًا.'
          );
        }
      } catch (error) {
        console.error(
          'DELIVERY ORDERS ERROR:',
          error?.response?.data || error?.message || error
        );

        if (!mountedRef.current) {
          return;
        }

        setOrders([]);

        if (!silent) {
          Alert.alert(
            'خطأ في الاتصال',
            'تعذر الاتصال بالسيرفر. تأكد من تشغيل السيرفر والاتصال بالإنترنت.'
          );
        }
      } finally {
        if (mountedRef.current && !silent) {
          setLoading(false);
        }
      }
    },
    [ensureCurrentLocation, user?.id]
  );

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  /* =======================================================
     AUTO REFRESH
  ======================================================= */

  useEffect(() => {
    const interval = setInterval(() => {
      fetchOrders({
        silent: true,
      });
    }, 30000);

    return () => {
      clearInterval(interval);
    };
  }, [fetchOrders]);

  /* =======================================================
     MANUAL REFRESH
  ======================================================= */

  const handleRefresh = useCallback(async () => {
    if (refreshing) {
      return;
    }

    setRefreshing(true);

    try {
      await fetchOrders({
        silent: true,
      });
    } finally {
      if (mountedRef.current) {
        setRefreshing(false);
      }
    }
  }, [fetchOrders, refreshing]);

  /* =======================================================
     STATISTICS
  ======================================================= */

  const statistics = useMemo(() => {
    const pendingOrders = orders.filter(
      (order) =>
        order?.status === ORDER_STATUS.READY &&
        !order?.deliveryId
    );

    const activeOrders = orders.filter(
      (order) =>
        ACTIVE_STATUSES.includes(
          order?.status
        ) &&
        normalizeId(order?.deliveryId) ===
          normalizeId(user?.id)
    );

    const deliveredOrders = orders.filter(
      (order) =>
        order?.status ===
        ORDER_STATUS.DELIVERED &&
        normalizeId(order?.deliveryId) ===
          normalizeId(user?.id)
    );

    const deliveredTotal =
      deliveredOrders.reduce(
        (sum, order) =>
          sum + getOrderTotal(order),
        0
      );

    return {
      pending: pendingOrders.length,
      active: activeOrders.length,
      delivered: deliveredOrders.length,
      deliveredTotal,
      total: orders.length,
    };
  }, [orders, user?.id]);

  /* =======================================================
     FILTER + SEARCH
  ======================================================= */

  const filteredOrders = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    return orders
      .filter((order) => {
        switch (filter) {
          case 'pending':
            return (
              order?.status ===
              ORDER_STATUS.READY &&
              !order?.deliveryId
            );

          case 'active':
            return (
              ACTIVE_STATUSES.includes(
                order?.status
              ) &&
              normalizeId(order?.deliveryId) ===
                normalizeId(user?.id)
            );

          case 'delivered':
            return (
              order?.status ===
                ORDER_STATUS.DELIVERED &&
              normalizeId(order?.deliveryId) ===
                normalizeId(user?.id)
            );

          case 'all':
          default:
            return true;
        }
      })
      .filter((order) => {
        if (!query) {
          return true;
        }

        const orderId =
          String(order?.id || '')
            .toLowerCase();

        const customer =
          getOrderCustomerName(order)
            .toLowerCase();

        const address =
          getOrderAddress(order)
            .toLowerCase();

        return (
          orderId.includes(query) ||
          customer.includes(query) ||
          address.includes(query)
        );
      });
  }, [
    orders,
    filter,
    search,
    user?.id,
  ]);

  /* =======================================================
     ACCEPT ORDER
  ======================================================= */

  const acceptOrder = useCallback(
    (order) => {
      const orderId = order?.id;

      if (!orderId) {
        Alert.alert(
          'خطأ',
          'رقم الطلب غير موجود'
        );
        return;
      }

      if (processingOrderId !== null) {
        return;
      }

      Alert.alert(
        'قبول الطلب',
        `هل تريد قبول الطلب #${orderId} وتعيينه لك؟`,
        [
          {
            text: 'إلغاء',
            style: 'cancel',
          },
          {
            text: 'قبول الطلب',
            onPress: async () => {
              if (!mountedRef.current) {
                return;
              }

              try {
                setProcessingOrderId(orderId);

                const result = await deliveryService.acceptOrder(orderId);

                if (!mountedRef.current) {
                  return;
                }

                if (result?.success) {
                  setOrders((current) =>
                    current.map((item) => {
                      if (
                        normalizeId(item?.id) ===
                        normalizeId(orderId)
                      ) {
                        return {
                          ...item,
                          status:
                            ORDER_STATUS.PICKED_UP,
                          deliveryId:
                            user?.id,
                        };
                      }

                      return item;
                    })
                  );

                  Alert.alert(
                    'تم بنجاح ✅',
                    'تم قبول الطلب وإسناده إليك.'
                  );

                  await fetchOrders({
                    silent: true,
                  });
                } else {
                  Alert.alert(
                    'لم يتم قبول الطلب',
                    result?.message ||
                      'فشل قبول الطلب.'
                  );

                  await fetchOrders({
                    silent: true,
                  });
                }
              } catch (error) {
                console.error(
                  'ACCEPT ORDER ERROR:',
                  error?.response?.data ||
                    error?.message ||
                    error
                );

                if (mountedRef.current) {
                  Alert.alert(
                    'خطأ',
                    'حدث خطأ أثناء قبول الطلب.'
                  );
                }
              } finally {
                if (mountedRef.current) {
                  setProcessingOrderId(null);
                }
              }
            },
          },
        ]
      );
    },
    [
      processingOrderId,
      user?.id,
      fetchOrders,
    ]
  );

  /* =======================================================
     COMPLETE ORDER
  ======================================================= */

  const completeOrder = useCallback(
    (order) => {
      const orderId = order?.id;

      if (!orderId) {
        Alert.alert(
          'خطأ',
          'رقم الطلب غير موجود'
        );
        return;
      }

      if (processingOrderId !== null) {
        return;
      }

      Alert.alert(
        'تأكيد التوصيل',
        `هل تم تسليم الطلب #${orderId} للعميل بالفعل؟`,
        [
          {
            text: 'ليس بعد',
            style: 'cancel',
          },
          {
            text: 'نعم، تم التوصيل',
            onPress: async () => {
              if (!mountedRef.current) {
                return;
              }

              try {
                setProcessingOrderId(orderId);

                const result = await deliveryService.updateOrderStatus(
                  orderId,
                  ORDER_STATUS.DELIVERED
                );

                if (!mountedRef.current) {
                  return;
                }

                if (result?.success) {
                  setOrders((current) =>
                    current.map((item) => {
                      if (
                        normalizeId(item?.id) ===
                        normalizeId(orderId)
                      ) {
                        return {
                          ...item,
                          status:
                            ORDER_STATUS.DELIVERED,
                        };
                      }

                      return item;
                    })
                  );

                  Alert.alert(
                    'تم التوصيل 🎉',
                    'تم تسجيل الطلب كمكتمل بنجاح.'
                  );

                  await fetchOrders({
                    silent: true,
                  });
                } else {
                  Alert.alert(
                    'لم يتم تحديث الطلب',
                    result?.message ||
                      'فشل تحديث حالة الطلب.'
                  );
                }
              } catch (error) {
                console.error(
                  'COMPLETE ORDER ERROR:',
                  error?.response?.data ||
                    error?.message ||
                    error
                );

                if (mountedRef.current) {
                  Alert.alert(
                    'خطأ',
                    'حدث خطأ أثناء إنهاء الطلب.'
                  );
                }
              } finally {
                if (mountedRef.current) {
                  setProcessingOrderId(null);
                }
              }
            },
          },
        ]
      );
    },
    [
      processingOrderId,
      fetchOrders,
    ]
  );

  /* =======================================================
     CALL CUSTOMER
  ======================================================= */

  const callCustomer = useCallback(
    async (order) => {
      const phone =
        getOrderPhone(order);

      if (!phone) {
        Alert.alert(
          'غير متاح',
          'رقم هاتف العميل غير موجود.'
        );
        return;
      }

      const url = `tel:${phone}`;

      try {
        const supported =
          await Linking.canOpenURL(url);

        if (!supported) {
          Alert.alert(
            'غير متاح',
            'لا يمكن فتح تطبيق الاتصال.'
          );
          return;
        }

        await Linking.openURL(url);
      } catch (error) {
        console.error(
          'CALL CUSTOMER ERROR:',
          error
        );

        Alert.alert(
          'خطأ',
          'تعذر فتح الاتصال.'
        );
      }
    },
    []
  );

  const callSupport = useCallback(async () => {
    const phone = '+201067254988';
    const url = Platform.OS === 'web'
      ? 'https://wa.me/201067254988?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D8%8C%20%D8%A3%D8%AD%D8%AA%D8%A7%D8%AC%20%D9%85%D8%B3%D8%A7%D8%B9%D8%AF%D8%A9'
      : `tel:${phone}`;

    try {
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert(
        'الدعم',
        'تعذر فتح الاتصال. يمكنك التواصل عبر واتساب على 01067254988.',
        [
          { text: 'إلغاء', style: 'cancel' },
          {
            text: 'فتح واتساب',
            onPress: () => Linking.openURL('https://wa.me/201067254988'),
          },
        ]
      );
    }
  }, []);

  /* =======================================================
     SHARE MY LOCATION
     يرسل موقع المندوب الحالي ليظهر للعميل على خريطة التتبع.
  ======================================================= */

  const [sharingLocation, setSharingLocation] = useState(false);

  const handleShareLocation = useCallback(async () => {
    if (sharingLocation) return;

    setSharingLocation(true);

    try {
      const { status } =
        await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'تنبيه',
          'لم يتم منح إذن الوصول إلى الموقع'
        );
        return;
      }

      const position =
        await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

      await deliveryService.updateLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });

      Alert.alert(
        'تم',
        'تم تحديث موقعك وسيظهر للعميل على خريطة التتبع.'
      );
    } catch (error) {
      console.error(
        'SHARE LOCATION ERROR:',
        error
      );

      Alert.alert(
        'خطأ',
        'تعذر تحديث موقعك الحالي'
      );
    } finally {
      setSharingLocation(false);
    }
  }, [sharingLocation]);

  /* =======================================================
     OPEN MAP
  ======================================================= */

  const openAddress = useCallback(
    async (order) => {
      // نفضل إحداثيات الخريطة إن حددها العميل، وإلا نبحث بالعنوان النصي.
      const lat = Number(order?.deliveryLat);
      const lng = Number(order?.deliveryLng);
      const hasPoint =
        Number.isFinite(lat) &&
        Number.isFinite(lng);

      const address =
        getOrderAddress(order);

      if (
        !hasPoint &&
        (!address ||
          address ===
            'العنوان غير محدد')
      ) {
        Alert.alert(
          'غير متاح',
          'عنوان التوصيل غير موجود.'
        );
        return;
      }

      const url = hasPoint
        ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

      try {
        const supported =
          await Linking.canOpenURL(url);

        if (!supported) {
          Alert.alert(
            'غير متاح',
            'لا يمكن فتح الخرائط.'
          );
          return;
        }

        await Linking.openURL(url);
      } catch (error) {
        console.error(
          'OPEN MAP ERROR:',
          error
        );

        Alert.alert(
          'خطأ',
          'تعذر فتح الخريطة.'
        );
      }
    },
    []
  );

  /* =======================================================
     TOGGLE DETAILS
  ======================================================= */

  const toggleDetails = useCallback(
    (orderId) => {
      setExpandedOrderId(
        (current) =>
          normalizeId(current) ===
          normalizeId(orderId)
            ? null
            : orderId
      );
    },
    []
  );

  /* =======================================================
     LOGOUT
  ======================================================= */

  const handleLogout = useCallback(() => {
    Alert.alert(
      'حذف الحساب',
      'سيتم تعطيل حسابك وحذف بيانات الدخول. لا يمكن التراجع عن هذا الإجراء. هل تريد المتابعة؟',
      [
        {
          text: 'إلغاء',
          style: 'cancel',
        },
        {
          text: 'حذف الحساب',
          style: 'destructive',
          onPress: async () => {
            const result = await authService.deleteAccount();
            if (!result?.success) {
              Alert.alert('تعذر حذف الحساب', result?.message || 'حدث خطأ أثناء حذف الحساب');
              return;
            }
            await logout();
          },
        },
      ]
    );
  }, [logout]);

  const handleSidebarAction = useCallback((item) => {
    const label = item?.label;

    if (label === 'الرئيسية') {
      setFilter('all');
      return;
    }

    if (label === 'الطلبات') {
      setFilter('all');
      navigation.navigate('DeliveryOrders');
      return;
    }

    if (label === 'المحفظة') {
      navigation.navigate('DeliveryEarnings');
      return;
    }

    if (label === 'الرحلات') {
      navigation.navigate('DeliveryOrders');
      return;
    }

    if (label === 'التقييمات') {
      navigation.navigate('DeliveryRatings');
      return;
    }

    if (label === 'الإشعارات') {
      navigation.navigate('DeliveryNotifications');
      return;
    }

    if (label === 'الدعم') {
      callSupport();
      return;
    }

    if (label === 'الملف الشخصي' || label === 'الإعدادات') {
      navigation.navigate('DeliveryProfile');
      return;
    }

    if (item?.action) item.action();
  }, [callSupport, navigation]);

  const handleBottomNavAction = useCallback((item, index) => {
    if (!item) return;

    if (item.label === 'الرئيسية') {
      setFilter('all');
      return;
    }

    if (item.label === 'الطلب' || item.label === 'الرحلات') {
      navigation.navigate('DeliveryOrders');
      return;
    }

    if (item.label === 'المحفظة') {
      navigation.navigate('DeliveryEarnings');
      return;
    }

    if (item.label === 'المزيد') {
      navigation.navigate('DeliveryMore');
      return;
    }

    if (item.action) {
      item.action();
      return;
    }

    if (index === 0) {
      setFilter('all');
    }
  }, [navigation]);

  /* =======================================================
     ORDER CARD
  ======================================================= */

  const renderOrder = useCallback(
    ({ item }) => {
      const orderId = item?.id;

      const isProcessing =
        normalizeId(processingOrderId) ===
        normalizeId(orderId);

      const isPending =
        item?.status ===
        ORDER_STATUS.READY &&
        !item?.deliveryId;

      const isMine =
        normalizeId(
          item?.deliveryId
        ) ===
        normalizeId(user?.id);

      const isActive =
        ACTIVE_STATUSES.includes(
          item?.status
        );

      const isExpanded =
        normalizeId(
          expandedOrderId
        ) ===
        normalizeId(orderId);

      const customerName =
        getOrderCustomerName(item);

      const phone =
        getOrderPhone(item);

      const address =
        getOrderAddress(item);

      const total =
        getOrderTotal(item);

      const items =
        getOrderItems(item);

      const scheduledAt =
        formatDate(
          item?.scheduledAt
        );

      const paymentMethod =
        formatPaymentMethod(
          item?.paymentMethod
        );

      const statusColor =
        getStatusColor(
          item?.status
        );

      return (
        <View style={styles.orderCard}>
          {/* HEADER */}

          <View style={styles.orderHeader}>
            <View style={styles.orderNumberContainer}>
              <Text style={styles.orderNumber}>
                #{orderId}
              </Text>

              <Text style={styles.orderLabel}>
                رقم الطلب
              </Text>
            </View>

            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor:
                    `${statusColor}18`,
                },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor:
                      statusColor,
                  },
                ]}
              />

              <Text
                style={[
                  styles.statusText,
                  {
                    color:
                      statusColor,
                  },
                ]}
              >
                {getStatusText(
                  item?.status
                )}
              </Text>
            </View>
          </View>

          {/* CUSTOMER */}

          <View style={styles.customerSection}>
            <View style={styles.customerIcon}>
              <Ionicons
                name="person-outline"
                size={21}
                color={COLORS.primary}
              />
            </View>

            <View style={styles.customerInfo}>
              <Text style={styles.customerName}>
                {customerName}
              </Text>

              <Text style={styles.customerRole}>
                عميل
              </Text>
            </View>

            {phone ? (
              <TouchableOpacity
                style={styles.callButton}
                onPress={() =>
                  callCustomer(item)
                }
                activeOpacity={0.8}
              >
                <Ionicons
                  name="call-outline"
                  size={21}
                  color={COLORS.primary}
                />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* ADDRESS */}

          <TouchableOpacity
            style={styles.addressBox}
            onPress={() =>
              openAddress(item)
            }
            activeOpacity={0.8}
          >
            <View style={styles.addressIcon}>
              <Ionicons
                name="location-outline"
                size={21}
                color={COLORS.primary}
              />
            </View>

            <View style={styles.addressInfo}>
              <Text style={styles.addressTitle}>
                عنوان التوصيل
              </Text>

              <Text
                style={styles.addressText}
                numberOfLines={2}
              >
                {address}
              </Text>
            </View>

            <Ionicons
              name="navigate-outline"
              size={20}
              color={COLORS.primary}
            />
          </TouchableOpacity>

          {/* ORDER META */}

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons
                name="card-outline"
                size={17}
                color={
                  COLORS.textSecondary
                }
              />

              <Text style={styles.metaText}>
                {paymentMethod}
              </Text>
            </View>

            {scheduledAt ? (
              <View style={styles.metaItem}>
                <Ionicons
                  name="calendar-outline"
                  size={17}
                  color={
                    COLORS.textSecondary
                  }
                />

                <Text style={styles.metaText}>
                  {scheduledAt}
                </Text>
              </View>
            ) : null}
          </View>

          {/* TOTAL */}

          <View style={styles.totalRow}>
            <View>
              <Text style={styles.totalLabel}>
                إجمالي الطلب
              </Text>

              <Text style={styles.totalValue}>
                {total.toFixed(2)} ج.م
              </Text>
            </View>

            <TouchableOpacity
              style={styles.detailsButton}
              onPress={() =>
                toggleDetails(orderId)
              }
              activeOpacity={0.8}
            >
              <Ionicons
                name={
                  isExpanded
                    ? 'chevron-up-outline'
                    : 'chevron-down-outline'
                }
                size={18}
                color={COLORS.primary}
              />

              <Text
                style={styles.detailsButtonText}
              >
                {isExpanded
                  ? 'إخفاء التفاصيل'
                  : 'تفاصيل الطلب'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ITEMS */}

          {isExpanded ? (
            <View style={styles.itemsContainer}>
              <Text style={styles.itemsTitle}>
                محتويات الطلب
              </Text>

              {items.length === 0 ? (
                <Text style={styles.noItemsText}>
                  لا توجد تفاصيل أصناف متاحة.
                </Text>
              ) : (
                items.map(
                  (orderItem, index) => {
                    const quantity =
                      getItemQuantity(
                        orderItem
                      );

                    const price =
                      getItemPrice(
                        orderItem
                      );

                    return (
                      <View
                        key={
                          orderItem?.id ||
                          `${orderId}-${index}`
                        }
                        style={styles.itemRow}
                      >
                        <View
                          style={
                            styles.itemQuantity
                          }
                        >
                          <Text
                            style={
                              styles.itemQuantityText
                            }
                          >
                            ×{quantity}
                          </Text>
                        </View>

                        <View
                          style={
                            styles.itemInfo
                          }
                        >
                          <Text
                            style={
                              styles.itemName
                            }
                          >
                            {getItemName(
                              orderItem
                            )}
                          </Text>
                        </View>

                        <Text
                          style={
                            styles.itemPrice
                          }
                        >
                          {(
                            price *
                            quantity
                          ).toFixed(2)}{' '}
                          ج.م
                        </Text>
                      </View>
                    );
                  }
                )
              )}
            </View>
          ) : null}

          {/* ACTION */}

          {isPending ? (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() =>
                acceptOrder(item)
              }
              disabled={isProcessing}
              activeOpacity={0.8}
            >
              {isProcessing ? (
                <ActivityIndicator
                  color="#fff"
                />
              ) : (
                <>
                  <Ionicons
                    name="bicycle-outline"
                    size={21}
                    color="#fff"
                  />

                  <Text
                    style={
                      styles.primaryButtonText
                    }
                  >
                    قبول الطلب
                  </Text>
                </>
              )}
            </TouchableOpacity>
          ) : null}

          {isActive && isMine ? (
            <TouchableOpacity
              style={styles.successButton}
              onPress={() =>
                completeOrder(item)
              }
              disabled={isProcessing}
              activeOpacity={0.8}
            >
              {isProcessing ? (
                <ActivityIndicator
                  color="#fff"
                />
              ) : (
                <>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={21}
                    color="#fff"
                  />

                  <Text
                    style={
                      styles.primaryButtonText
                    }
                  >
                    تم التوصيل
                  </Text>
                </>
              )}
            </TouchableOpacity>
          ) : null}

          {item?.status ===
          ORDER_STATUS.DELIVERED ? (
            <View style={styles.completedBox}>
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={COLORS.success}
              />

              <Text
                style={
                  styles.completedText
                }
              >
                تم إتمام هذا الطلب بنجاح
              </Text>
            </View>
          ) : null}

          {item?.status ===
          ORDER_STATUS.CANCELLED ? (
            <View style={styles.cancelledBox}>
              <Ionicons
                name="close-circle"
                size={20}
                color={COLORS.error}
              />

              <Text
                style={
                  styles.cancelledText
                }
              >
                تم إلغاء هذا الطلب
              </Text>
            </View>
          ) : null}
        </View>
      );
    },
    [
      processingOrderId,
      expandedOrderId,
      user?.id,
      acceptOrder,
      completeOrder,
      callCustomer,
      openAddress,
      toggleDetails,
    ]
  );

  /* =======================================================
     EMPTY
  ======================================================= */

  const renderEmpty = useCallback(() => {
    if (loading) {
      return null;
    }

    const hasSearch =
      search.trim().length > 0;

    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIcon}>
          <Ionicons
            name={
              hasSearch
                ? 'search-outline'
                : 'bicycle-outline'
            }
            size={48}
            color={COLORS.primary}
          />
        </View>

        <Text style={styles.emptyTitle}>
          {hasSearch
            ? 'لا توجد نتائج'
            : 'لا توجد طلبات'}
        </Text>

        <Text style={styles.emptyText}>
          {hasSearch
            ? 'جرّب البحث بكلمة مختلفة أو غيّر الفلتر.'
            : 'انتظر حتى تظهر طلبات جديدة.'}
        </Text>

        <TouchableOpacity
          style={styles.refreshButton}
          onPress={handleRefresh}
          activeOpacity={0.8}
        >
          <Ionicons
            name="refresh-outline"
            size={18}
            color="#fff"
          />

          <Text
            style={
              styles.refreshButtonText
            }
          >
            تحديث الطلبات
          </Text>
        </TouchableOpacity>
      </View>
    );
  }, [
    loading,
    search,
    handleRefresh,
  ]);

  /* =======================================================
     HEADER
  ======================================================= */

  const renderHeader = useCallback(
    () => (
      <View style={styles.dashboardWrap}>
        <View style={styles.topbar}>
          <View style={styles.topbarRight}>
            <Text style={styles.brand}>NOW</Text>
          </View>

          <View style={styles.topbarActions}>
            <TouchableOpacity style={styles.iconBubble} onPress={handleShareLocation} disabled={sharingLocation} activeOpacity={0.9}>
              {sharingLocation ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Ionicons name="notifications-outline" size={20} color={COLORS.primary} />
              )}
              <View style={styles.notificationDot} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.profileBubble} onPress={() => navigation.navigate('DeliveryProfile')} activeOpacity={0.9}>
              <Ionicons name="person-circle-outline" size={30} color={COLORS.primary} />
            </TouchableOpacity>

            <View style={styles.userTag}>
              <Text style={styles.userTagText}>مندوب</Text>
              <Text style={styles.userName}>{user?.name || 'أحمد محمد'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroTextWrap}>
            <Text style={styles.heroTitle}>مرحبا بعودتك، {user?.name || 'المندوب'}</Text>
            <Text style={styles.heroSubTitle}>حالة المندوب الآن</Text>
            <View style={styles.statusRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.statusText}>متصل ويستقبل الطلبات</Text>
            </View>
            <Text style={styles.heroMeta}>أرباح اليوم: 450.00 ج.م • 12 طلب</Text>
          </View>

          <View style={styles.heroVisual}>
            <Text style={styles.riderBadge}>NOW</Text>
            <Ionicons name="bicycle-outline" size={80} color={COLORS.primary} />
          </View>
        </View>

        <View style={styles.cardGrid}>
          <View style={styles.metricCard}>
            <View style={[styles.metricIcon, styles.metricWarning]}><Ionicons name="time-outline" size={20} color={COLORS.warning} /></View>
            <Text style={styles.metricNumber}>{statistics.pending}</Text>
            <Text style={styles.metricLabel}>طلبات جديدة</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={[styles.metricIcon, styles.metricPrimary]}><Ionicons name="bicycle-outline" size={20} color={COLORS.primary} /></View>
            <Text style={styles.metricNumber}>{statistics.active}</Text>
            <Text style={styles.metricLabel}>قيد التوصيل</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={[styles.metricIcon, styles.metricSuccess]}><Ionicons name="checkmark-circle-outline" size={20} color={COLORS.success} /></View>
            <Text style={styles.metricNumber}>{statistics.delivered}</Text>
            <Text style={styles.metricLabel}>مكتملة</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={[styles.metricIcon, styles.metricPurple]}><Ionicons name="wallet-outline" size={20} color="#8B5CF6" /></View>
            <Text style={styles.metricNumber}>{statistics.deliveredTotal.toFixed(0)}</Text>
            <Text style={styles.metricLabel}>إجمالي الأرباح</Text>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color={COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="ابحث برقم الطلب أو العميل أو العنوان"
            placeholderTextColor={COLORS.textLight}
            textAlign="right"
            returnKeyType="search"
          />
          {search.length > 0 ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={FILTERS}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.filtersContainer}
          renderItem={({ item }) => {
            const active = filter === item.id;
            return (
              <TouchableOpacity
                style={[styles.filterButton, active && styles.filterButtonActive]}
                onPress={() => setFilter(item.id)}
                activeOpacity={0.8}
              >
                <Ionicons name={item.icon} size={16} color={active ? '#fff' : COLORS.textSecondary} />
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            );
          }}
        />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>الطلبات</Text>
          <Text style={styles.resultsCount}>{filteredOrders.length} طلب</Text>
        </View>
      </View>
    ),
    [
      user?.name,
      navigation,
      handleLogout,
      handleShareLocation,
      sharingLocation,
      statistics,
      search,
      filter,
      filteredOrders.length,
    ]
  );

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <View
        style={
          styles.loadingContainer
        }
      >
        <View style={styles.loadingIcon}>
          <Ionicons
            name="bicycle-outline"
            size={45}
            color={COLORS.primary}
          />
        </View>

        <ActivityIndicator
          size="large"
          color={COLORS.primary}
        />

        <Text
          style={styles.loadingTitle}
        >
          جاري تحميل الطلبات...
        </Text>

        <Text
          style={
            styles.loadingSubtitle
          }
        >
          لحظة واحدة
        </Text>
      </View>
    );
  }

  /* =======================================================
     MAIN
  ======================================================= */

  return (
    <View style={[styles.shell, isCompact && styles.shellCompact]}>
      <View style={[styles.sidebar, isCompact && styles.sidebarCompact]}>
        <Text style={styles.logo}>NOW</Text>

        <View style={[styles.sidebarList, isCompact && styles.sidebarListCompact]}>
          {[
            { label: 'الرئيسية', icon: 'home-outline', active: true },
            { label: 'الطلبات', icon: 'clipboard-outline', active: false },
            { label: 'المحفظة', icon: 'wallet-outline', active: false },
            { label: 'الرحلات', icon: 'map-outline', active: false },
            { label: 'التقييمات', icon: 'star-outline', active: false },
            { label: 'الإشعارات', icon: 'notifications-outline', active: false },
            { label: 'الدعم', icon: 'chatbubbles-outline', active: false },
            { label: 'الملف الشخصي', icon: 'person-outline', active: false },
            { label: 'الإعدادات', icon: 'settings-outline', active: false },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              style={[
                styles.sidebarItem,
                isCompact && styles.sidebarListCompactItem,
                item.active && styles.sidebarItemActive,
              ]}
              activeOpacity={0.9}
              onPress={() => handleSidebarAction(item)}
            >
              <Ionicons name={item.icon} size={18} color={item.active ? '#fff' : '#0EA5E9'} />
              {!isCompact && (
                <Text style={[styles.sidebarText, item.active && styles.sidebarTextActive]}>{item.label}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={[styles.logoutBox, isCompact && styles.logoutBoxCompact]} onPress={handleLogout} activeOpacity={0.9}>
          <Ionicons name="log-out-outline" size={18} color="#fff" />
          <Text style={styles.logoutText}>تسجيل الخروج</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.mainPanel, isCompact && styles.mainPanelCompact]}>
        <FlatList
          data={filteredOrders}
          renderItem={renderOrder}
          keyExtractor={(item, index) => String(item?.id ?? index)}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={[
            styles.listContent,
            filteredOrders.length === 0 && styles.emptyListContent,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          extraData={{ processingOrderId, expandedOrderId }}
        />

        <View style={styles.bottomNav}>
          {[
            { label: 'الرئيسية', icon: 'home-outline' },
            { label: 'الطلب', icon: 'clipboard-outline' },
            { label: 'الرحلات', icon: 'map-outline' },
            { label: 'المحفظة', icon: 'wallet-outline' },
            { label: 'المزيد', icon: 'menu-outline' },
          ].map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.bottomNavItem}
              activeOpacity={0.8}
              onPress={() => handleBottomNavAction(item, index)}
            >
              <Ionicons name={item.icon} size={20} color={index === 0 ? COLORS.primary : '#64748B'} />
              <Text style={[styles.bottomNavText, index === 0 && styles.bottomNavActive]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
};

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#EAF7FF',
  },
  shellCompact: {
    flexDirection: 'column',
  },

  sidebar: {
    width: 210,
    backgroundColor: '#F7FBFF',
    paddingHorizontal: 12,
    paddingTop: 26,
    paddingBottom: 18,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E5EEF7',
  },
  sidebarCompact: {
    width: '100%',
    height: 76,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 8,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    borderRightWidth: 0,
    borderBottomWidth: 1,
  },
  sidebarListCompact: {
    flex: 1,
    width: undefined,
    marginTop: 0,
    marginHorizontal: 8,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logoutBoxCompact: {
    width: 44,
    height: 44,
    marginTop: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderRadius: 12,
  },
  mainPanelCompact: {
    width: '100%',
  },

  logo: {
    fontSize: 42,
    fontWeight: '900',
    color: '#0EA5E9',
    letterSpacing: -2,
    marginBottom: 18,
  },

  sidebarList: {
    width: '100%',
    gap: 10,
    marginTop: 6,
  },

  sidebarItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#F1F8FF',
    borderWidth: 1,
    borderColor: '#E7F4FF',
  },
  sidebarListCompactItem: {
    minWidth: 48,
    paddingHorizontal: 10,
    paddingVertical: 10,
    justifyContent: 'center',
  },

  sidebarItemActive: {
    backgroundColor: '#1DB2E7',
    borderColor: '#1DB2E7',
  },

  sidebarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'right',
  },

  sidebarTextActive: {
    color: '#fff',
  },

  logoutBox: {
    marginTop: 'auto',
    width: '100%',
    backgroundColor: '#1DB2E7',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  logoutText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },

  mainPanel: {
    flex: 1,
    backgroundColor: '#F3F9FF',
    position: 'relative',
  },

  dashboardWrap: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 18,
  },

  topbar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },

  topbarRight: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },

  topbarActions: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },

  iconBubble: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1EDF7',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },

  profileBubble: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1EDF7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  userTag: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1EDF7',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 104,
  },

  userTagText: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'right',
  },

  userName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'right',
  },

  heroCard: {
    backgroundColor: '#E9F9FF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#CFEFFC',
    paddingHorizontal: 16,
    paddingVertical: 18,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },

  heroTextWrap: {
    flex: 1,
    paddingLeft: 10,
  },

  heroTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'right',
    marginBottom: 6,
  },

  heroSubTitle: {
    fontSize: 12,
    color: '#475569',
    textAlign: 'right',
    marginBottom: 8,
  },

  statusRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 7,
    marginBottom: 8,
  },

  onlineDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#22C55E',
  },

  statusText: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '700',
    textAlign: 'right',
  },

  heroMeta: {
    fontSize: 12,
    color: '#0F766E',
    textAlign: 'right',
    fontWeight: '700',
  },

  heroVisual: {
    width: 96,
    height: 96,
    borderRadius: 22,
    backgroundColor: '#DDF7FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BEEAF8',
    position: 'relative',
  },

  riderBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    fontSize: 11,
    fontWeight: '900',
    color: '#0EA5E9',
    letterSpacing: 1,
  },

  cardGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },

  metricCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2EEF9',
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },

  metricIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  metricWarning: {
    backgroundColor: '#FFF7E5',
  },

  metricPrimary: {
    backgroundColor: '#EAF9FF',
  },

  metricSuccess: {
    backgroundColor: '#EAFBF2',
  },

  metricPurple: {
    backgroundColor: '#F3E8FF',
  },

  metricNumber: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'right',
  },

  metricLabel: {
    marginTop: 4,
    fontSize: 12,
    color: '#64748B',
    textAlign: 'right',
  },

  topHeaderBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 10,
  },

  notificationWrap: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E1EDF7',
    position: 'relative',
  },

  notificationDot: {
    position: 'absolute',
    right: 6,
    top: 5,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#fff',
  },

  userHeaderWrap: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E1EDF7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    minWidth: 118,
  },

  userRole: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'right',
  },

  userNameHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'right',
  },

  profileMini: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E1EDF7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 72,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5EEF7',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
  },

  bottomNavItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    flex: 1,
  },

  bottomNavText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
  },

  bottomNavActive: {
    color: COLORS.primary,
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    padding: 30,
  },

  loadingIcon: {
    width: 82,
    height: 82,
    borderRadius: 41,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor:
      '#FCE7F3',
    marginBottom: 25,
  },

  loadingTitle: {
    marginTop: 18,
    fontSize: 18,
    fontWeight: '800',
    color:
      COLORS.textPrimary,
  },

  loadingSubtitle: {
    marginTop: 6,
    fontSize: 13,
    color:
      COLORS.textSecondary,
  },

  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 15,
  },

  greetingBox: {
    flex: 1,
  },

  greeting: {
    fontSize: 23,
    fontWeight: '900',
    color:
      COLORS.textPrimary,
    textAlign: 'right',
  },

  subGreeting: {
    marginTop: 5,
    fontSize: 13,
    color:
      COLORS.textSecondary,
    textAlign: 'right',
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },

  headerButton: {
    marginLeft: 10,
  },

  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    gap: 10,
  },

  statCard: {
    flex: 1,
    minHeight: 105,
    backgroundColor:
      COLORS.white ||
      '#FFFFFF',
    borderRadius: 17,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    padding: 12,
    alignItems: 'center',
    justifyContent:
      'center',
  },

  statIcon: {
    width: 35,
    height: 35,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },

  warningIcon: {
    backgroundColor:
      '#FEF3C7',
  },

  primaryIcon: {
    backgroundColor:
      '#FCE7F3',
  },

  successIcon: {
    backgroundColor:
      '#DCFCE7',
  },

  statNumber: {
    fontSize: 21,
    fontWeight: '900',
    color:
      COLORS.textPrimary,
  },

  statLabel: {
    marginTop: 2,
    fontSize: 11,
    color:
      COLORS.textSecondary,
  },

  earningsCard: {
    marginHorizontal: 14,
    marginTop: 12,
    borderRadius: 17,
    padding: 15,
    backgroundColor:
      COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
  },

  earningsIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor:
      'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  earningsInfo: {
    flex: 1,
  },

  earningsTitle: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.9,
    textAlign: 'right',
  },

  earningsValue: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 2,
    textAlign: 'right',
  },

  searchContainer: {
    marginHorizontal: 14,
    marginTop: 14,
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    backgroundColor:
      COLORS.white ||
      '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
  },

  searchInput: {
    flex: 1,
    fontSize: 13,
    color:
      COLORS.textPrimary,
    paddingHorizontal: 9,
    paddingVertical: 12,
  },

  filtersContainer: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 8,
  },

  filterButton: {
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    backgroundColor:
      COLORS.white ||
      '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  filterButtonActive: {
    backgroundColor:
      COLORS.primary,
    borderColor:
      COLORS.primary,
  },

  filterText: {
    fontSize: 12,
    fontWeight: '700',
    color:
      COLORS.textSecondary,
  },

  filterTextActive: {
    color: '#fff',
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
    marginHorizontal: 16,
    marginBottom: 10,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: '900',
    color:
      COLORS.textPrimary,
  },

  resultsCount: {
    fontSize: 12,
    fontWeight: '700',
    color:
      COLORS.textSecondary,
  },

  listContent: {
    paddingBottom: 90,
  },

  emptyListContent: {
    flexGrow: 1,
  },

  orderCard: {
    backgroundColor:
      COLORS.white ||
      '#FFFFFF',
    borderRadius: 19,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    marginHorizontal: 14,
    marginBottom: 13,
    padding: 16,
  },

  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
    marginBottom: 15,
  },

  orderNumberContainer: {
    alignItems:
      'flex-start',
  },

  orderNumber: {
    fontSize: 18,
    fontWeight: '900',
    color:
      COLORS.textPrimary,
  },

  orderLabel: {
    marginTop: 2,
    fontSize: 10,
    color:
      COLORS.textSecondary,
  },

  statusBadge: {
    flexDirection:
      'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginLeft: 6,
  },

  customerSection: {
    flexDirection:
      'row-reverse',
    alignItems: 'center',
    paddingBottom: 13,
    borderBottomWidth: 1,
    borderBottomColor:
      COLORS.border,
  },

  customerIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor:
      '#FCE7F3',
    alignItems: 'center',
    justifyContent:
      'center',
    marginLeft: 10,
  },

  customerInfo: {
    flex: 1,
  },

  customerName: {
    fontSize: 15,
    fontWeight: '800',
    color:
      COLORS.textPrimary,
    textAlign: 'right',
  },

  customerRole: {
    fontSize: 11,
    color:
      COLORS.textSecondary,
    marginTop: 2,
    textAlign: 'right',
  },

  callButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor:
      '#FCE7F3',
    alignItems: 'center',
    justifyContent:
      'center',
  },

  addressBox: {
    flexDirection:
      'row-reverse',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor:
      COLORS.border,
  },

  addressIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor:
      '#FCE7F3',
    alignItems: 'center',
    justifyContent:
      'center',
  },

  addressInfo: {
    flex: 1,
    marginHorizontal: 9,
  },

  addressTitle: {
    fontSize: 11,
    fontWeight: '800',
    color:
      COLORS.textSecondary,
    textAlign: 'right',
  },

  addressText: {
    fontSize: 13,
    color:
      COLORS.textPrimary,
    marginTop: 3,
    lineHeight: 19,
    textAlign: 'right',
  },

  metaRow: {
    flexDirection:
      'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 12,
  },

  metaItem: {
    flexDirection:
      'row-reverse',
    alignItems: 'center',
    backgroundColor:
      '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 7,
    gap: 5,
  },

  metaText: {
    fontSize: 10,
    color:
      COLORS.textSecondary,
    fontWeight: '700',
  },

  totalRow: {
    flexDirection:
      'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
    paddingTop: 13,
    paddingBottom: 12,
  },

  totalLabel: {
    fontSize: 11,
    color:
      COLORS.textSecondary,
    textAlign: 'right',
  },

  totalValue: {
    fontSize: 19,
    fontWeight: '900',
    color:
      COLORS.primary,
    marginTop: 2,
    textAlign: 'right',
  },

  detailsButton: {
    flexDirection:
      'row-reverse',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor:
      '#FCE7F3',
  },

  detailsButtonText: {
    color:
      COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
  },

  itemsContainer: {
    backgroundColor:
      '#F8FAFC',
    borderRadius: 13,
    padding: 12,
    marginBottom: 12,
  },

  itemsTitle: {
    fontSize: 13,
    fontWeight: '900',
    color:
      COLORS.textPrimary,
    textAlign: 'right',
    marginBottom: 8,
  },

  noItemsText: {
    fontSize: 12,
    color:
      COLORS.textSecondary,
    textAlign: 'right',
  },

  itemRow: {
    flexDirection:
      'row-reverse',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor:
      '#E2E8F0',
  },

  itemQuantity: {
    minWidth: 36,
    height: 30,
    borderRadius: 9,
    backgroundColor:
      '#FCE7F3',
    alignItems: 'center',
    justifyContent:
      'center',
  },

  itemQuantityText: {
    color:
      COLORS.primary,
    fontSize: 11,
    fontWeight: '900',
  },

  itemInfo: {
    flex: 1,
    marginHorizontal: 8,
  },

  itemName: {
    fontSize: 12,
    fontWeight: '700',
    color:
      COLORS.textPrimary,
    textAlign: 'right',
  },

  itemPrice: {
    fontSize: 11,
    fontWeight: '800',
    color:
      COLORS.textSecondary,
  },

  primaryButton: {
    minHeight: 49,
    borderRadius: 14,
    backgroundColor:
      COLORS.primary,
    alignItems: 'center',
    justifyContent:
      'center',
    flexDirection:
      'row-reverse',
    gap: 8,
  },

  successButton: {
    minHeight: 49,
    borderRadius: 14,
    backgroundColor:
      COLORS.success,
    alignItems: 'center',
    justifyContent:
      'center',
    flexDirection:
      'row-reverse',
    gap: 8,
  },

  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
  },

  completedBox: {
    minHeight: 45,
    borderRadius: 13,
    backgroundColor:
      '#DCFCE7',
    alignItems: 'center',
    justifyContent:
      'center',
    flexDirection:
      'row-reverse',
    gap: 7,
  },

  completedText: {
    color:
      COLORS.success,
    fontSize: 13,
    fontWeight: '800',
  },

  cancelledBox: {
    minHeight: 45,
    borderRadius: 13,
    backgroundColor:
      '#FEE2E2',
    alignItems: 'center',
    justifyContent:
      'center',
    flexDirection:
      'row-reverse',
    gap: 7,
  },

  cancelledText: {
    color:
      COLORS.error,
    fontSize: 13,
    fontWeight: '800',
  },

  emptyContainer: {
    alignItems: 'center',
    justifyContent:
      'center',
    padding: 35,
  },

  emptyIcon: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor:
      '#FCE7F3',
    alignItems: 'center',
    justifyContent:
      'center',
  },

  emptyTitle: {
    marginTop: 18,
    fontSize: 20,
    fontWeight: '900',
    color:
      COLORS.textPrimary,
  },

  emptyText: {
    marginTop: 7,
    fontSize: 13,
    color:
      COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
  },

  refreshButton: {
    marginTop: 18,
    backgroundColor:
      COLORS.primary,
    borderRadius: 13,
    paddingHorizontal: 20,
    paddingVertical: 11,
    flexDirection:
      'row-reverse',
    alignItems: 'center',
    gap: 7,
  },

  refreshButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },

  aboutButton: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    backgroundColor:
      COLORS.white ||
      '#FFFFFF',
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 9,
    flexDirection:
      'row-reverse',
    alignItems: 'center',
    gap: 6,
  },

  aboutText: {
    color:
      COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
  },
});

export default DeliveryDashboard;
