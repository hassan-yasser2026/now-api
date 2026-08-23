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
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

import { COLORS } from '../../constants/colors';
import useAppStore from '../../store/appStore';
import { orderService } from '../../services/orderService';
import deliveryService from '../../services/deliveryService';
import AppMap from '../../components/AppMap';


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
    'عميل'
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

  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [processingOrderId, setProcessingOrderId] =
    useState(null);

  const [expandedOrderId, setExpandedOrderId] =
    useState(null);

  const [myLocation, setMyLocation] =
    useState(null);

  const [locationDenied, setLocationDenied] =
    useState(false);

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
     LIVE LOCATION
     تتبع موقع المندوب وإرساله للسيرفر ليظهر للعميل
  ======================================================= */

  useEffect(() => {
    let subscription = null;
    let cancelled = false;

    const startTracking = async () => {
      try {
        const { status } =
          await Location.requestForegroundPermissionsAsync();

        if (cancelled) {
          return;
        }

        if (status !== 'granted') {
          setLocationDenied(true);
          return;
        }

        subscription =
          await Location.watchPositionAsync(
            {
              accuracy:
                Location.Accuracy.Balanced,
              timeInterval: 15000,
              distanceInterval: 30,
            },
            (position) => {
              if (!mountedRef.current) {
                return;
              }

              const coords = {
                latitude:
                  position.coords.latitude,
                longitude:
                  position.coords.longitude,
              };

              setMyLocation(coords);

              deliveryService
                .updateLocation(coords)
                .catch((error) => {
                  console.warn(
                    'UPDATE LOCATION ERROR:',
                    error?.response?.data ||
                      error?.message
                  );
                });
            }
          );
      } catch (error) {
        console.warn(
          'LOCATION TRACKING ERROR:',
          error?.message || error
        );
      }
    };

    startTracking();

    return () => {
      cancelled = true;

      if (subscription) {
        subscription.remove();
      }
    };
  }, []);

  /* =======================================================
     FETCH ORDERS
  ======================================================= */

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

        const result = await orderService.getDeliveryOrders(user.id);

        if (!mountedRef.current) {
          return;
        }

        if (result?.success) {
          const serverOrders = Array.isArray(result.orders) ? result.orders : [];
          setOrders(serverOrders);
        } else {
          setOrders([]);

          if (!silent && result?.message) {
            Alert.alert('تعذر تحميل الطلبات', result.message);
          }
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
    [user?.id]
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
     MAP MARKERS
     موقعي الحالي + متاجر الطلبات المتاحة والجارية
  ======================================================= */

  const mapMarkers = useMemo(() => {
    const markers = [];

    if (myLocation) {
      markers.push({
        id: 'me',
        latitude: myLocation.latitude,
        longitude: myLocation.longitude,
        title: 'موقعي الحالي',
        type: 'driver',
      });
    }

    const seenStores = new Set();

    orders.forEach((order) => {
      const isAvailable =
        order?.status === ORDER_STATUS.READY &&
        !order?.deliveryId;

      const isMine =
        ACTIVE_STATUSES.includes(order?.status) &&
        normalizeId(order?.deliveryId) ===
          normalizeId(user?.id);

      if (!isAvailable && !isMine) {
        return;
      }

      const store = order?.store;

      if (
        store?.latitude == null ||
        store?.longitude == null
      ) {
        return;
      }

      const storeKey = String(
        store.id ?? store.name
      );

      if (seenStores.has(storeKey)) {
        return;
      }

      seenStores.add(storeKey);

      markers.push({
        id: `store-${storeKey}`,
        latitude: store.latitude,
        longitude: store.longitude,
        title: store.name || 'متجر',
        type: 'store',
      });
    });

    return markers;
  }, [orders, myLocation, user?.id]);

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

                const result =
                  await orderService.updateOrderStatus(
                    orderId,
                    ORDER_STATUS.PICKED_UP,
                    user?.id
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

                const result =
                  await orderService.updateOrderStatus(
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

  /* =======================================================
     OPEN MAP
  ======================================================= */

  const openAddress = useCallback(
    async (order) => {
      const address =
        getOrderAddress(order);

      if (
        !address ||
        address ===
          'العنوان غير محدد'
      ) {
        Alert.alert(
          'غير متاح',
          'عنوان التوصيل غير موجود.'
        );
        return;
      }

      const encoded =
        encodeURIComponent(address);

      const url =
        `https://www.google.com/maps/search/?api=1&query=${encoded}`;

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
      'تسجيل الخروج',
      'هل أنت متأكد أنك تريد تسجيل الخروج؟',
      [
        {
          text: 'إلغاء',
          style: 'cancel',
        },
        {
          text: 'تسجيل الخروج',
          style: 'destructive',
          onPress: () => logout(),
        },
      ]
    );
  }, [logout]);

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
      <View>
        {/* TOP HEADER */}

        <View style={styles.topHeader}>
          <View style={styles.greetingBox}>
            <Text style={styles.greeting}>
              مرحباً{' '}
              {user?.name || 'مندوب'} 🛵
            </Text>

            <Text
              style={styles.subGreeting}
            >
              جاهز لتوصيل طلباتك؟
            </Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() =>
                navigation.navigate(
                  'DeliveryProfile'
                )
              }
            >
              <Ionicons
                name="person-circle-outline"
                size={39}
                color={COLORS.primary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleLogout}
            >
              <Ionicons
                name="log-out-outline"
                size={26}
                color={COLORS.primary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* STATISTICS */}

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View
              style={[
                styles.statIcon,
                styles.warningIcon,
              ]}
            >
              <Ionicons
                name="time-outline"
                size={20}
                color={COLORS.warning}
              />
            </View>

            <Text style={styles.statNumber}>
              {statistics.pending}
            </Text>

            <Text style={styles.statLabel}>
              متاحة
            </Text>
          </View>

          <View style={styles.statCard}>
            <View
              style={[
                styles.statIcon,
                styles.primaryIcon,
              ]}
            >
              <Ionicons
                name="bicycle-outline"
                size={20}
                color={COLORS.primary}
              />
            </View>

            <Text style={styles.statNumber}>
              {statistics.active}
            </Text>

            <Text style={styles.statLabel}>
              جارية
            </Text>
          </View>

          <View style={styles.statCard}>
            <View
              style={[
                styles.statIcon,
                styles.successIcon,
              ]}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={20}
                color={COLORS.success}
              />
            </View>

            <Text style={styles.statNumber}>
              {statistics.delivered}
            </Text>

            <Text style={styles.statLabel}>
              مكتملة
            </Text>
          </View>
        </View>

        {/* COMPLETED TOTAL */}

        <View style={styles.earningsCard}>
          <View style={styles.earningsIcon}>
            <Ionicons
              name="wallet-outline"
              size={25}
              color="#fff"
            />
          </View>

          <View style={styles.earningsInfo}>
            <Text
              style={styles.earningsTitle}
            >
              إجمالي قيمة الطلبات المكتملة
            </Text>

            <Text
              style={styles.earningsValue}
            >
              {statistics.deliveredTotal.toFixed(
                2
              )}{' '}
              ج.م
            </Text>
          </View>
        </View>

        {/* MAP */}

        <View style={styles.mapCard}>
          <View style={styles.mapHeader}>
            <Text style={styles.mapTitle}>
              الخريطة
            </Text>

            <Text style={styles.mapSubtitle}>
              🛵 موقعك • 🏪 متاجر الطلبات
            </Text>
          </View>

          {mapMarkers.length > 0 ? (
            <AppMap
              markers={mapMarkers}
              height={230}
            />
          ) : (
            <View style={styles.mapPlaceholder}>
              <Ionicons
                name="map-outline"
                size={34}
                color={COLORS.textLight}
              />

              <Text
                style={
                  styles.mapPlaceholderText
                }
              >
                {locationDenied
                  ? 'فعّل إذن الموقع من إعدادات الجهاز لعرض موقعك على الخريطة.'
                  : 'جاري تحديد موقعك...'}
              </Text>
            </View>
          )}
        </View>

        {/* SEARCH */}

        <View style={styles.searchContainer}>
          <Ionicons
            name="search-outline"
            size={21}
            color={COLORS.textSecondary}
          />

          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="ابحث برقم الطلب أو العميل أو العنوان"
            placeholderTextColor={
              COLORS.textLight
            }
            textAlign="right"
            returnKeyType="search"
          />

          {search.length > 0 ? (
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
          ) : null}
        </View>

        {/* FILTERS */}

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={FILTERS}
          keyExtractor={(item) =>
            item.id
          }
          contentContainerStyle={
            styles.filtersContainer
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
                <Ionicons
                  name={item.icon}
                  size={16}
                  color={
                    active
                      ? '#fff'
                      : COLORS.textSecondary
                  }
                />

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

        {/* SECTION TITLE */}

        <View style={styles.sectionHeader}>
          <Text
            style={styles.sectionTitle}
          >
            الطلبات
          </Text>

          <Text
            style={styles.resultsCount}
          >
            {filteredOrders.length} طلب
          </Text>
        </View>
      </View>
    ),
    [
      user?.name,
      navigation,
      handleLogout,
      statistics,
      mapMarkers,
      locationDenied,
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
    <View style={styles.container}>
      <FlatList
        data={filteredOrders}
        renderItem={renderOrder}
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
          styles.listContent,
          filteredOrders.length === 0 &&
            styles.emptyListContent,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
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
        extraData={{
          processingOrderId,
          expandedOrderId,
        }}
      />

      {/* ABOUT */}

      <TouchableOpacity
        style={styles.aboutButton}
        onPress={() =>
          navigation.navigate(
            'About'
          )
        }
        activeOpacity={0.85}
      >
        <Ionicons
          name="information-circle-outline"
          size={18}
          color={COLORS.primary}
        />

        <Text style={styles.aboutText}>
          حول تطبيق ناو
        </Text>
      </TouchableOpacity>
    </View>
  );
};

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor:
      COLORS.background,
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor:
      COLORS.background,
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

  mapCard: {
    marginHorizontal: 14,
    marginTop: 14,
    borderRadius: 17,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    backgroundColor:
      COLORS.white ||
      '#FFFFFF',
    padding: 12,
  },

  mapHeader: {
    flexDirection:
      'row-reverse',
    alignItems: 'center',
    justifyContent:
      'space-between',
    marginBottom: 10,
  },

  mapTitle: {
    fontSize: 15,
    fontWeight: '900',
    color:
      COLORS.textPrimary,
  },

  mapSubtitle: {
    fontSize: 11,
    color:
      COLORS.textSecondary,
    fontWeight: '600',
  },

  mapPlaceholder: {
    minHeight: 110,
    borderRadius: 13,
    backgroundColor:
      '#F8FAFC',
    alignItems: 'center',
    justifyContent:
      'center',
    padding: 16,
    gap: 8,
  },

  mapPlaceholderText: {
    fontSize: 12,
    color:
      COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
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

  statusText: {
    fontSize: 11,
    fontWeight: '800',
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