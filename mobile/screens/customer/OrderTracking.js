import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';

import { COLORS } from '../../constants/colors';
import { orderService } from '../../services/orderService';

const POLLING_INTERVAL = 10000;

const ORDER_STEPS = [
  {
    status: 'PENDING',
    title: 'تم استلام الطلب',
    icon: 'receipt-outline',
  },
  {
    status: 'ACCEPTED',
    title: 'تم قبول الطلب',
    icon: 'checkmark-outline',
  },
  {
    status: 'PREPARING',
    title: 'جاري تحضير الطلب',
    icon: 'restaurant-outline',
  },
  {
    status: 'READY',
    title: 'الطلب جاهز للاستلام',
    icon: 'bag-check-outline',
  },
  {
    status: 'PICKED_UP',
    title: 'الطلب في الطريق',
    icon: 'bicycle-outline',
  },
  {
    status: 'DELIVERED',
    title: 'تم توصيل الطلب',
    icon: 'checkmark-circle-outline',
  },
];

const STATUS_CONFIG = {
  PENDING: {
    title: 'قيد الانتظار',
    icon: 'time-outline',
  },
  ACCEPTED: {
    title: 'تم القبول',
    icon: 'checkmark-outline',
  },
  PREPARING: {
    title: 'قيد التحضير',
    icon: 'restaurant-outline',
  },
  READY: {
    title: 'جاهز للاستلام',
    icon: 'bag-check-outline',
  },
  PICKED_UP: {
    title: 'في الطريق',
    icon: 'bicycle-outline',
  },
  ON_THE_WAY: {
    title: 'في الطريق',
    icon: 'navigate-outline',
  },
  DELIVERED: {
    title: 'تم التوصيل',
    icon: 'checkmark-circle-outline',
  },
  CANCELLED: {
    title: 'تم إلغاء الطلب',
    icon: 'close-circle-outline',
  },
};

const normalizeStatus = (status) => {
  if (!status) return 'PENDING';

  const normalized = String(status)
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');

  const aliases = {
    PENDING: 'PENDING',
    ACCEPTED: 'ACCEPTED',
    PREPARING: 'PREPARING',
    READY: 'READY',
    PICKEDUP: 'PICKED_UP',
    PICKED_UP: 'PICKED_UP',
    ON_THE_WAY: 'ON_THE_WAY',
    ONTHEWAY: 'ON_THE_WAY',
    DELIVERED: 'DELIVERED',
    CANCELLED: 'CANCELLED',
    CANCELED: 'CANCELLED',
    PICKEDUPORDER: 'PICKED_UP',
  };

  return aliases[normalized] || 'PENDING';
};

const formatPrice = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return '0 ج.م';
  }

  return `${number.toLocaleString('ar-EG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} ج.م`;
};

const formatDate = (date) => {
  if (!date) return 'غير محدد';

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'غير محدد';
  }

  return parsedDate.toLocaleString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const OrderTracking = ({ route, navigation }) => {
  const isFocused = useIsFocused();

  const orderId = route?.params?.orderId;

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchOrder = useCallback(
    async ({ showLoader = false } = {}) => {
      if (!orderId) {
        setError('رقم الطلب غير موجود');
        setLoading(false);
        return;
      }

      if (showLoader) {
        setLoading(true);
      }

      try {
        setError('');

        const result = await orderService.getOrderById(orderId);

        if (!result?.success) {
          throw new Error(
            result?.message || 'تعذر تحميل بيانات الطلب'
          );
        }

        const fetchedOrder = result.order || result.data;

        if (!fetchedOrder) {
          throw new Error('بيانات الطلب غير موجودة');
        }

        setOrder(fetchedOrder);
      } catch (err) {
        console.error('OrderTracking fetch error:', err);

        const message =
          err?.message || 'حدث خطأ أثناء تحميل بيانات الطلب';

        setError(message);

        // لو عندنا طلب قديم، نخليه ظاهر بدل ما نمسحه
        if (!order) {
          setOrder(null);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [orderId, order]
  );

  useEffect(() => {
    if (!isFocused) return;

    fetchOrder({ showLoader: true });

    const interval = setInterval(() => {
      fetchOrder();
    }, POLLING_INTERVAL);

    return () => {
      clearInterval(interval);
    };
  }, [isFocused, fetchOrder]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrder();
  }, [fetchOrder]);

  const currentStatus = useMemo(
    () => normalizeStatus(order?.status),
    [order?.status]
  );

  const currentStepIndex = useMemo(() => {
    if (currentStatus === 'CANCELLED') {
      return -1;
    }

    const index = ORDER_STEPS.findIndex(
      (step) => step.status === currentStatus
    );

    return index >= 0 ? index : 0;
  }, [currentStatus]);

  const statusInfo =
    STATUS_CONFIG[currentStatus] || STATUS_CONFIG.PENDING;

  const orderItems = useMemo(() => {
    if (!Array.isArray(order?.items)) {
      return [];
    }

    return order.items;
  }, [order?.items]);

  const getItemName = (item) => {
    return (
      item?.name ||
      item?.menuItem?.name ||
      'صنف غير معروف'
    );
  };

  const getItemPrice = (item) => {
    return Number(
      item?.priceAtOrder ??
        item?.price ??
        item?.menuItem?.price ??
        0
    );
  };

  const getItemQuantity = (item) => {
    const quantity = Number(item?.quantity);

    return Number.isFinite(quantity) && quantity > 0
      ? quantity
      : 1;
  };

  const calculateItemsTotal = () => {
    return orderItems.reduce((total, item) => {
      return (
        total +
        getItemPrice(item) * getItemQuantity(item)
      );
    }, 0);
  };

  const itemsTotal = calculateItemsTotal();

  const totalPrice = Number(order?.totalPrice);

  const safeTotalPrice = Number.isFinite(totalPrice)
    ? totalPrice
    : itemsTotal;

  const handleRetry = () => {
    fetchOrder({ showLoader: true });
  };

  const handleBack = () => {
    navigation.goBack();
  };

  if (loading && !order) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
        />

        <Text style={styles.loadingText}>
          جاري تحميل الطلب...
        </Text>
      </View>
    );
  }

  if (!order && error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <Ionicons
              name="arrow-back"
              size={26}
              color={COLORS.textPrimary}
            />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            تتبع الطلب
          </Text>

          <View style={styles.headerPlaceholder} />
        </View>

        <View style={styles.errorContainer}>
          <View style={styles.errorIconContainer}>
            <Ionicons
              name="cloud-offline-outline"
              size={50}
              color={COLORS.error}
            />
          </View>

          <Text style={styles.errorTitle}>
            تعذر تحميل الطلب
          </Text>

          <Text style={styles.errorText}>
            {error}
          </Text>

          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRetry}
            activeOpacity={0.8}
          >
            <Ionicons
              name="refresh-outline"
              size={20}
              color="#fff"
            />

            <Text style={styles.retryButtonText}>
              إعادة المحاولة
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <Ionicons
              name="arrow-back"
              size={26}
              color={COLORS.textPrimary}
            />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            تتبع الطلب
          </Text>

          <View style={styles.headerPlaceholder} />
        </View>

        <View style={styles.errorContainer}>
          <Ionicons
            name="document-text-outline"
            size={60}
            color={COLORS.textLight}
          />

          <Text style={styles.errorTitle}>
            لم يتم العثور على الطلب
          </Text>

          <Text style={styles.errorText}>
            تأكد من رقم الطلب وحاول مرة أخرى.
          </Text>

          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRetry}
            activeOpacity={0.8}
          >
            <Text style={styles.retryButtonText}>
              إعادة المحاولة
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons
            name="arrow-back"
            size={26}
            color={COLORS.textPrimary}
          />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          تتبع الطلب
        </Text>

        <TouchableOpacity
          onPress={handleRefresh}
          style={styles.refreshButton}
          activeOpacity={0.7}
        >
          <Ionicons
            name="refresh-outline"
            size={24}
            color={COLORS.primary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Network Error */}
        {!!error && order && (
          <TouchableOpacity
            style={styles.warningBanner}
            onPress={handleRetry}
            activeOpacity={0.8}
          >
            <Ionicons
              name="warning-outline"
              size={20}
              color="#92400E"
            />

            <Text style={styles.warningText}>
              تعذر تحديث الطلب. اضغط للمحاولة مرة أخرى.
            </Text>
          </TouchableOpacity>
        )}

        {/* Order Header Card */}
        <View style={styles.orderCard}>
          <View style={styles.orderTopRow}>
            <View style={styles.orderIdContainer}>
              <Text style={styles.orderIdLabel}>
                رقم الطلب
              </Text>

              <Text style={styles.orderId}>
                #{order.id}
              </Text>
            </View>

            <View style={styles.statusBadge}>
              <Ionicons
                name={statusInfo.icon}
                size={18}
                color={COLORS.primary}
              />

              <Text style={styles.statusBadgeText}>
                {statusInfo.title}
              </Text>
            </View>
          </View>

          {order.createdAt && (
            <View style={styles.dateRow}>
              <Ionicons
                name="calendar-outline"
                size={17}
                color={COLORS.textSecondary}
              />

              <Text style={styles.dateText}>
                {formatDate(order.createdAt)}
              </Text>
            </View>
          )}
        </View>

        {/* Cancelled */}
        {currentStatus === 'CANCELLED' ? (
          <View style={styles.cancelledCard}>
            <View style={styles.cancelledIcon}>
              <Ionicons
                name="close-circle-outline"
                size={42}
                color={COLORS.error}
              />
            </View>

            <Text style={styles.cancelledTitle}>
              تم إلغاء الطلب
            </Text>

            <Text style={styles.cancelledText}>
              هذا الطلب لم يعد قيد التنفيذ.
            </Text>
          </View>
        ) : (
          /* Timeline */
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>
              حالة الطلب
            </Text>

            <View style={styles.timeline}>
              {ORDER_STEPS.map((step, index) => {
                const isCompleted =
                  index <= currentStepIndex;

                const isCurrent =
                  index === currentStepIndex;

                const isLast =
                  index === ORDER_STEPS.length - 1;

                return (
                  <View
                    key={step.status}
                    style={styles.timelineItem}
                  >
                    <View style={styles.timelineLeft}>
                      <View
                        style={[
                          styles.timelineIcon,
                          isCompleted &&
                            styles.timelineIconActive,
                          isCurrent &&
                            styles.timelineIconCurrent,
                        ]}
                      >
                        <Ionicons
                          name={step.icon}
                          size={18}
                          color={
                            isCompleted
                              ? '#fff'
                              : COLORS.textLight
                          }
                        />
                      </View>

                      {!isLast && (
                        <View
                          style={[
                            styles.timelineLine,
                            index < currentStepIndex &&
                              styles.timelineLineActive,
                          ]}
                        />
                      )}
                    </View>

                    <View
                      style={styles.timelineContent}
                    >
                      <Text
                        style={[
                          styles.timelineTitle,
                          isCompleted &&
                            styles.timelineTitleActive,
                        ]}
                      >
                        {step.title}
                      </Text>

                      {isCurrent && (
                        <Text style={styles.currentText}>
                          الحالة الحالية
                        </Text>
                      )}

                      {index < currentStepIndex && (
                        <Text style={styles.completedText}>
                          تم
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Store Information */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>
            معلومات المتجر
          </Text>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons
                name="storefront-outline"
                size={20}
                color={COLORS.primary}
              />
            </View>

            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>
                المتجر
              </Text>

              <Text style={styles.infoValue}>
                {order.store?.name || 'غير محدد'}
              </Text>
            </View>
          </View>
        </View>

        {/* Order Items */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>
              تفاصيل الطلب
            </Text>

            <Text style={styles.itemsCount}>
              {orderItems.length} أصناف
            </Text>
          </View>

          {orderItems.length > 0 ? (
            orderItems.map((item, index) => {
              const name = getItemName(item);
              const quantity = getItemQuantity(item);
              const price = getItemPrice(item);
              const itemTotal = price * quantity;

              return (
                <View
                  key={
                    item.id?.toString() ||
                    `${name}-${index}`
                  }
                  style={[
                    styles.orderItem,
                    index === orderItems.length - 1 &&
                      styles.lastOrderItem,
                  ]}
                >
                  <View style={styles.itemQuantity}>
                    <Text style={styles.quantityText}>
                      {quantity}×
                    </Text>
                  </View>

                  <View style={styles.itemContent}>
                    <Text
                      style={styles.itemName}
                      numberOfLines={2}
                    >
                      {name}
                    </Text>

                    <Text style={styles.itemUnitPrice}>
                      {formatPrice(price)} للقطعة
                    </Text>
                  </View>

                  <Text style={styles.itemTotal}>
                    {formatPrice(itemTotal)}
                  </Text>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyItems}>
              <Ionicons
                name="receipt-outline"
                size={36}
                color={COLORS.textLight}
              />

              <Text style={styles.emptyItemsText}>
                لا توجد تفاصيل للأصناف
              </Text>
            </View>
          )}
        </View>

        {/* Delivery Information */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>
            معلومات التوصيل
          </Text>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons
                name="location-outline"
                size={20}
                color={COLORS.primary}
              />
            </View>

            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>
                عنوان التوصيل
              </Text>

              <Text style={styles.infoValue}>
                {order.address || 'غير محدد'}
              </Text>
            </View>
          </View>

          {order.delivery && (
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons
                  name="bicycle-outline"
                  size={20}
                  color={COLORS.primary}
                />
              </View>

              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>
                  المندوب
                </Text>

                <Text style={styles.infoValue}>
                  {order.delivery.name ||
                    'غير محدد'}
                </Text>

                {order.delivery.phone && (
                  <Text style={styles.infoSecondary}>
                    {order.delivery.phone}
                  </Text>
                )}
              </View>
            </View>
          )}

          {order.scheduledAt && (
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons
                  name="time-outline"
                  size={20}
                  color={COLORS.primary}
                />
              </View>

              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>
                  موعد التوصيل
                </Text>

                <Text style={styles.infoValue}>
                  {formatDate(order.scheduledAt)}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Price Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.sectionTitle}>
            ملخص الحساب
          </Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              قيمة المنتجات
            </Text>

            <Text style={styles.summaryValue}>
              {formatPrice(itemsTotal)}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              رسوم التوصيل
            </Text>

            <Text style={styles.summaryValue}>
              {Math.max(
                0,
                safeTotalPrice - itemsTotal
              ).toLocaleString('ar-EG')} ج.م
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>
              الإجمالي
            </Text>

            <Text style={styles.totalValue}>
              {formatPrice(safeTotalPrice)}
            </Text>
          </View>
        </View>

        {/* Bottom Status */}
        <View style={styles.liveStatus}>
          <View style={styles.liveDot} />

          <Text style={styles.liveText}>
            يتم تحديث حالة الطلب تلقائيًا
          </Text>
        </View>

        <View style={styles.bottomSpace} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: COLORS.textSecondary,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },

  refreshButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },

  headerPlaceholder: {
    width: 40,
  },

  headerTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  content: {
    padding: 16,
  },

  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },

  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    lineHeight: 20,
  },

  orderCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  orderTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  orderIdContainer: {
    flex: 1,
  },

  orderIdLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },

  orderId: {
    fontSize: 23,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FCE7F3',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 5,
  },

  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },

  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 7,
  },

  dateText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },

  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 14,
  },

  itemsCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
    backgroundColor: COLORS.background,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
  },

  timeline: {
    marginTop: 2,
  },

  timelineItem: {
    flexDirection: 'row',
    minHeight: 72,
  },

  timelineLeft: {
    width: 42,
    alignItems: 'center',
    marginRight: 12,
  },

  timelineIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  timelineIconActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },

  timelineIconCurrent: {
    borderWidth: 3,
  },

  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: COLORS.border,
    marginVertical: 3,
  },

  timelineLineActive: {
    backgroundColor: COLORS.primary,
  },

  timelineContent: {
    flex: 1,
    paddingTop: 6,
    paddingBottom: 12,
  },

  timelineTitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },

  timelineTitleActive: {
    color: COLORS.textPrimary,
    fontWeight: '700',
  },

  currentText: {
    marginTop: 4,
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },

  completedText: {
    marginTop: 4,
    fontSize: 11,
    color: COLORS.textSecondary,
  },

  cancelledCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
  },

  cancelledIcon: {
    marginBottom: 10,
  },

  cancelledTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.error,
    marginBottom: 6,
  },

  cancelledText: {
    fontSize: 14,
    color: '#991B1B',
    textAlign: 'center',
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 9,
  },

  infoIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FCE7F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 11,
  },

  infoContent: {
    flex: 1,
    paddingTop: 2,
  },

  infoLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },

  infoValue: {
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: '600',
    lineHeight: 22,
  },

  infoSecondary: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 3,
  },

  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  lastOrderItem: {
    borderBottomWidth: 0,
  },

  itemQuantity: {
    width: 38,
    height: 32,
    borderRadius: 9,
    backgroundColor: '#FCE7F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },

  quantityText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
  },

  itemContent: {
    flex: 1,
    marginRight: 10,
  },

  itemName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    lineHeight: 20,
  },

  itemUnitPrice: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 3,
  },

  itemTotal: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },

  emptyItems: {
    alignItems: 'center',
    paddingVertical: 20,
  },

  emptyItemsText: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.textSecondary,
  },

  summaryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
  },

  summaryLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },

  summaryValue: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 8,
  },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 5,
  },

  totalLabel: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },

  totalValue: {
    fontSize: 19,
    fontWeight: '900',
    color: COLORS.primary,
  },

  liveStatus: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
    gap: 7,
  },

  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },

  liveText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },

  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },

  errorIconContainer: {
    marginBottom: 14,
  },

  errorTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 14,
    textAlign: 'center',
  },

  errorText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 8,
    maxWidth: 320,
  },

  retryButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
    gap: 7,
  },

  retryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },

  bottomSpace: {
    height: 25,
  },
});

export default OrderTracking;