import React, {
  useCallback,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { COLORS } from '../../constants/colors';
import useAppStore from '../../store/appStore';
import { orderService } from '../../services/orderService';
import PrimaryButton from '../../components/PrimaryButton';

const DELIVERY_FEE = 25;

const OrderConfirmation = ({ route, navigation }) => {
  const storeId = route?.params?.storeId;

  const {
    cart,
    user,
    scheduledDate,
    clearCart,
  } = useAppStore();

  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  /*
   * ==========================================
   * الأصناف الخاصة بالمتجر الحالي
   * ==========================================
   */
  const storeItems = useMemo(() => {
    if (!Array.isArray(cart) || !storeId) {
      return [];
    }

    return cart.filter(
      (item) =>
        String(item?.storeId) === String(storeId)
    );
  }, [cart, storeId]);

  /*
   * ==========================================
   * التحقق من السعر والكمية
   * ==========================================
   */
  const getSafePrice = useCallback((price) => {
    const value = Number(price);

    if (!Number.isFinite(value) || value < 0) {
      return 0;
    }

    return value;
  }, []);

  const getSafeQuantity = useCallback((quantity) => {
    const value = Number(quantity);

    if (!Number.isFinite(value) || value <= 0) {
      return 0;
    }

    return Math.floor(value);
  }, []);

  /*
   * ==========================================
   * حساب الإجمالي الظاهر للمستخدم
   *
   * ملاحظة:
   * هذا للعرض فقط.
   * Backend يجب أن يعيد الحساب من DB.
   * ==========================================
   */
  const totalPrice = useMemo(() => {
    return storeItems.reduce((sum, item) => {
      const price = getSafePrice(item?.price);
      const quantity = getSafeQuantity(item?.quantity);

      return sum + price * quantity;
    }, 0);
  }, [storeItems, getSafePrice, getSafeQuantity]);

  const finalTotal = useMemo(() => {
    return totalPrice + DELIVERY_FEE;
  }, [totalPrice]);

  /*
   * ==========================================
   * تنسيق العملة
   * ==========================================
   */
  const formatPrice = useCallback((value) => {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return '0.00';
    }

    return number.toFixed(2);
  }, []);

  /*
   * ==========================================
   * تنسيق الموعد
   * ==========================================
   */
  const formattedScheduledDate = useMemo(() => {
    if (!scheduledDate) {
      return null;
    }

    try {
      const date = new Date(scheduledDate);

      if (Number.isNaN(date.getTime())) {
        return null;
      }

      return date.toLocaleString('ar-EG', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return null;
    }
  }, [scheduledDate]);

  /*
   * ==========================================
   * التحقق من الطلب قبل الإرسال
   * ==========================================
   */
  const validateOrder = useCallback(() => {
    if (!user?.id) {
      return 'يجب تسجيل الدخول أولاً';
    }

    if (!storeId) {
      return 'المتجر غير محدد';
    }

    if (!Array.isArray(storeItems) || storeItems.length === 0) {
      return 'لا توجد أصناف في هذا الطلب';
    }

    const invalidItem = storeItems.find((item) => {
      const quantity = getSafeQuantity(item?.quantity);
      const price = getSafePrice(item?.price);

      return (
        !item?.id &&
        !item?.menuItemId &&
        !item?.name
      ) || quantity <= 0 || price < 0;
    });

    if (invalidItem) {
      return 'يوجد صنف غير صالح في الطلب';
    }

    const cleanAddress = address.trim();

    if (!cleanAddress) {
      return 'يرجى إدخال عنوان التوصيل';
    }

    if (cleanAddress.length < 5) {
      return 'يرجى إدخال عنوان توصيل صحيح';
    }

    if (cleanAddress.length > 500) {
      return 'عنوان التوصيل طويل جدًا';
    }

    if (!Number.isFinite(totalPrice) || totalPrice <= 0) {
      return 'إجمالي الطلب غير صالح';
    }

    return null;
  }, [
    user?.id,
    storeId,
    storeItems,
    address,
    totalPrice,
    getSafePrice,
    getSafeQuantity,
  ]);

  /*
   * ==========================================
   * تأكيد إنشاء الطلب
   * ==========================================
   */
  const handleConfirmOrder = useCallback(async () => {
    if (loading) {
      return;
    }

    const validationError = validateOrder();

    if (validationError) {
      Alert.alert('تنبيه', validationError);
      return;
    }

    const cleanAddress = address.trim();

    /*
     * مهم:
     * لا نرسل customerId من التطبيق.
     *
     * الـBackend المفروض يستخرج المستخدم
     * من JWT:
     *
     * req.user.userId
     */

    const orderData = {
      storeId: Number(storeId),

      /*
       * الأفضل أن يحتوي كل عنصر على menuItemId.
       *
       * price هنا للعرض/التوافق فقط،
       * والـBackend يجب ألا يثق فيه.
       */
      items: storeItems.map((item) => ({
        menuItemId:
          item?.menuItemId ??
          item?.id ??
          null,

        name: item?.name || '',

        quantity: getSafeQuantity(item?.quantity),

        price: getSafePrice(item?.price),
      })),

      address: cleanAddress,

      /*
       * الموعد اختياري.
       */
      scheduledAt: scheduledDate || null,

      /*
       * لا نعتمد على totalPrice في السيرفر.
       * Backend يجب إعادة الحساب.
       */
      totalPrice: Number(finalTotal.toFixed(2)),
    };

    setLoading(true);

    try {
      const result = await orderService.createOrder(orderData);

      if (!result?.success) {
        Alert.alert(
          'لم يتم إنشاء الطلب',
          result?.message ||
            'تعذر إنشاء الطلب، حاول مرة أخرى'
        );
        return;
      }

      const createdOrder =
        result?.order ||
        result?.data ||
        result?.data?.order;

      if (!createdOrder?.id) {
        console.error(
          'CREATE ORDER RESPONSE INVALID:',
          result
        );

        Alert.alert(
          'تم إرسال الطلب',
          'تم إنشاء الطلب، لكن تعذر فتح صفحة المتابعة.'
        );

        clearCart();

        navigation.goBack();

        return;
      }

      /*
       * نفرغ السلة فقط بعد نجاح السيرفر.
       */
      clearCart();

      Alert.alert(
        'تم إنشاء الطلب 🎉',
        `تم استلام طلبك رقم #${createdOrder.id}`,
        [
          {
            text: 'متابعة الطلب',
            onPress: () => {
              navigation.navigate(
                'OrderTracking',
                {
                  orderId: createdOrder.id,
                }
              );
            },
          },
        ],
        {
          cancelable: false,
        }
      );
    } catch (error) {
      console.error(
        'ORDER CONFIRMATION ERROR:',
        error
      );

      let message =
        'حدث خطأ أثناء إنشاء الطلب. حاول مرة أخرى.';

      if (error?.response?.data?.message) {
        message = error.response.data.message;
      } else if (error?.message) {
        /*
         * لا نعرض تفاصيل تقنية حساسة للمستخدم.
         */
        message =
          'تعذر الاتصال بالسيرفر. تأكد من اتصال الإنترنت وحاول مرة أخرى.';
      }

      Alert.alert('خطأ', message);
    } finally {
      setLoading(false);
    }
  }, [
    loading,
    validateOrder,
    address,
    storeId,
    storeItems,
    scheduledDate,
    finalTotal,
    getSafePrice,
    getSafeQuantity,
    orderService,
    clearCart,
    navigation,
  ]);

  /*
   * ==========================================
   * اختيار الموعد
   * ==========================================
   *
   * هنا نفتح شاشة اختيار الموعد.
   *
   * لازم يكون عندك Route باسم:
   * DeliverySchedule
   *
   * وتقوم هذه الشاشة بتحديث scheduledDate
   * داخل appStore.
   * ==========================================
   */
  const handleChooseSchedule = useCallback(() => {
    navigation.navigate('DeliverySchedule', {
      storeId,
    });
  }, [navigation, storeId]);

  /*
   * ==========================================
   * الرجوع
   * ==========================================
   */
  const handleGoBack = useCallback(() => {
    if (loading) {
      return;
    }

    navigation.goBack();
  }, [loading, navigation]);

  /*
   * ==========================================
   * Empty State
   * ==========================================
   */
  if (!storeId || storeItems.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIcon}>
          <Ionicons
            name="cart-outline"
            size={48}
            color={COLORS.primary}
          />
        </View>

        <Text style={styles.emptyTitle}>
          لا يوجد طلب
        </Text>

        <Text style={styles.emptyText}>
          لا توجد أصناف متاحة لإتمام هذا الطلب.
        </Text>

        <TouchableOpacity
          style={styles.emptyButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Text style={styles.emptyButtonText}>
            العودة
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        {/* ==================================
            Header
        ================================== */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleGoBack}
            style={styles.backBtn}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Ionicons
              name="arrow-back"
              size={27}
              color={COLORS.textPrimary}
            />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            تأكيد الطلب
          </Text>

          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ==================================
              المنتجات
          ================================== */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                المنتجات
              </Text>

              <View style={styles.sectionIcon}>
                <Ionicons
                  name="restaurant-outline"
                  size={19}
                  color={COLORS.primary}
                />
              </View>
            </View>

            <View style={styles.itemsCard}>
              {storeItems.map((item, index) => {
                const price =
                  getSafePrice(item?.price);

                const quantity =
                  getSafeQuantity(item?.quantity);

                const itemTotal =
                  price * quantity;

                return (
                  <View
                    key={`${item?.id ?? item?.menuItemId ?? item?.name}-${index}`}
                    style={[
                      styles.orderItem,
                      index ===
                        storeItems.length - 1 &&
                        styles.lastOrderItem,
                    ]}
                  >
                    <View style={styles.itemMain}>
                      <Text
                        style={styles.itemName}
                        numberOfLines={2}
                      >
                        {item?.name ||
                          'صنف بدون اسم'}
                      </Text>

                      <Text style={styles.itemUnitPrice}>
                        {formatPrice(price)} ج.م
                        {' '}للصنف
                      </Text>
                    </View>

                    <View style={styles.quantityBadge}>
                      <Text
                        style={styles.quantityText}
                      >
                        ×{quantity}
                      </Text>
                    </View>

                    <Text
                      style={styles.itemPrice}
                    >
                      {formatPrice(itemTotal)} ج.م
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* ==================================
              العنوان
          ================================== */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                عنوان التوصيل
              </Text>

              <View style={styles.sectionIcon}>
                <Ionicons
                  name="location-outline"
                  size={19}
                  color={COLORS.primary}
                />
              </View>
            </View>

            <View
              style={[
                styles.inputContainer,
                address.trim().length > 0 &&
                  styles.inputContainerFocused,
              ]}
            >
              <Ionicons
                name="location-outline"
                size={21}
                color={COLORS.primary}
                style={styles.inputIcon}
              />

              <TextInput
                style={styles.addressInput}
                placeholder="أدخل عنوان التوصيل بالتفصيل"
                value={address}
                onChangeText={setAddress}
                multiline
                numberOfLines={4}
                maxLength={500}
                editable={!loading}
                placeholderTextColor={
                  COLORS.textLight
                }
                textAlign="right"
                textAlignVertical="top"
                returnKeyType="done"
              />
            </View>

            <Text style={styles.helperText}>
              اكتب المحافظة والمنطقة والشارع ورقم
              المبنى أو أي تفاصيل تساعد المندوب.
            </Text>

            <Text style={styles.characterCount}>
              {address.length}/500
            </Text>
          </View>

          {/* ==================================
              موعد التوصيل
          ================================== */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                وقت التوصيل
              </Text>

              <View style={styles.sectionIcon}>
                <Ionicons
                  name="calendar-outline"
                  size={19}
                  color={COLORS.primary}
                />
              </View>
            </View>

            <TouchableOpacity
              style={styles.scheduleButton}
              onPress={handleChooseSchedule}
              disabled={loading}
              activeOpacity={0.8}
            >
              <View style={styles.scheduleArrow}>
                <Ionicons
                  name="chevron-back"
                  size={20}
                  color={COLORS.textSecondary}
                />
              </View>

              <View style={styles.scheduleInfo}>
                <Text
                  style={[
                    styles.scheduleTitle,
                    formattedScheduledDate &&
                      styles.scheduleTitleSelected,
                  ]}
                >
                  {formattedScheduledDate
                    ? formattedScheduledDate
                    : 'اختر موعد التوصيل'}
                </Text>

                <Text style={styles.scheduleSubtitle}>
                  {formattedScheduledDate
                    ? 'موعد التوصيل المحدد'
                    : 'يمكنك اختيار الموعد المناسب لك'}
                </Text>
              </View>

              <View style={styles.scheduleIcon}>
                <Ionicons
                  name={
                    formattedScheduledDate
                      ? 'checkmark-circle'
                      : 'calendar-outline'
                  }
                  size={24}
                  color={
                    formattedScheduledDate
                      ? COLORS.success
                      : COLORS.primary
                  }
                />
              </View>
            </TouchableOpacity>
          </View>

          {/* ==================================
              ملخص الطلب
          ================================== */}
          <View style={styles.summary}>
            <View style={styles.summaryHeader}>
              <Ionicons
                name="receipt-outline"
                size={21}
                color={COLORS.primary}
              />

              <Text style={styles.summaryTitle}>
                ملخص الطلب
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                المجموع الفرعي
              </Text>

              <Text style={styles.summaryValue}>
                {formatPrice(totalPrice)} ج.م
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                رسوم التوصيل
              </Text>

              <Text style={styles.summaryValue}>
                {formatPrice(DELIVERY_FEE)} ج.م
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>
                الإجمالي
              </Text>

              <Text style={styles.totalValue}>
                {formatPrice(finalTotal)} ج.م
              </Text>
            </View>
          </View>

          {/* ==================================
              ملاحظة الأمان
          ================================== */}
          <View style={styles.securityNote}>
            <Ionicons
              name="shield-checkmark-outline"
              size={20}
              color={COLORS.success}
            />

            <Text style={styles.securityText}>
              سيتم التحقق من أسعار الأصناف والإجمالي
              النهائي على السيرفر قبل إنشاء الطلب.
            </Text>
          </View>

          {/* ==================================
              زر التأكيد
          ================================== */}
          <PrimaryButton
            title={
              loading
                ? 'جاري إنشاء الطلب...'
                : 'تأكيد الطلب'
            }
            onPress={handleConfirmOrder}
            loading={loading}
            disabled={loading}
            style={styles.confirmBtn}
          />

          <Text style={styles.bottomNote}>
            بالضغط على "تأكيد الطلب" أنت تؤكد صحة
            بيانات التوصيل وطلبك.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingBox}>
            <ActivityIndicator
              size="large"
              color={COLORS.primary}
            />

            <Text style={styles.loadingText}>
              جاري إرسال الطلب...
            </Text>

            <Text style={styles.loadingSubText}>
              لا تغلق التطبيق
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  keyboardContainer: {
    flex: 1,
  },

  header: {
    minHeight: 65,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor:
      COLORS.surface || '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 19,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },

  headerSpacer: {
    width: 42,
  },

  content: {
    padding: 16,
    paddingBottom: 40,
  },

  section: {
    marginBottom: 22,
  },

  sectionHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 11,
  },

  sectionTitle: {
    flex: 1,
    textAlign: 'right',
    fontSize: 17,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },

  sectionIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: '#FCE7F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 9,
  },

  itemsCard: {
    backgroundColor:
      COLORS.surface || '#FFFFFF',
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
  },

  orderItem: {
    minHeight: 72,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 12,
  },

  lastOrderItem: {
    borderBottomWidth: 0,
  },

  itemMain: {
    flex: 1,
    alignItems: 'flex-end',
  },

  itemName: {
    width: '100%',
    textAlign: 'right',
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },

  itemUnitPrice: {
    marginTop: 4,
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'right',
  },

  quantityBadge: {
    minWidth: 38,
    height: 30,
    borderRadius: 10,
    marginHorizontal: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FCE7F3',
  },

  quantityText: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.primary,
  },

  itemPrice: {
    minWidth: 78,
    textAlign: 'left',
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },

  inputContainer: {
    minHeight: 105,
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    backgroundColor:
      COLORS.surface || '#FFFFFF',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 13,
    paddingTop: 13,
  },

  inputContainerFocused: {
    borderColor: COLORS.primary,
  },

  inputIcon: {
    marginTop: 2,
    marginLeft: 9,
  },

  addressInput: {
    flex: 1,
    minHeight: 90,
    fontSize: 15,
    lineHeight: 23,
    color: COLORS.textPrimary,
    paddingVertical: 0,
  },

  helperText: {
    marginTop: 7,
    fontSize: 11,
    lineHeight: 18,
    color: COLORS.textSecondary,
    textAlign: 'right',
  },

  characterCount: {
    marginTop: 4,
    fontSize: 10,
    color: COLORS.textLight,
    textAlign: 'left',
  },

  scheduleButton: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor:
      COLORS.surface || '#FFFFFF',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 13,
  },

  scheduleArrow: {
    width: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scheduleInfo: {
    flex: 1,
    alignItems: 'flex-end',
    marginHorizontal: 8,
  },

  scheduleTitle: {
    width: '100%',
    textAlign: 'right',
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },

  scheduleTitleSelected: {
    color: COLORS.textPrimary,
  },

  scheduleSubtitle: {
    width: '100%',
    marginTop: 4,
    textAlign: 'right',
    fontSize: 11,
    color: COLORS.textSecondary,
  },

  scheduleIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FCE7F3',
  },

  summary: {
    backgroundColor:
      COLORS.surface || '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 13,
  },

  summaryHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },

  summaryTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },

  summaryRow: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  summaryLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },

  summaryValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 8,
  },

  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },

  totalLabel: {
    fontSize: 17,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },

  totalValue: {
    fontSize: 21,
    fontWeight: '900',
    color: COLORS.primary,
  },

  securityNote: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },

  securityText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 18,
    color: '#166534',
    textAlign: 'right',
  },

  confirmBtn: {
    marginTop: 2,
  },

  bottomNote: {
    marginTop: 10,
    paddingHorizontal: 12,
    fontSize: 10,
    lineHeight: 17,
    color: COLORS.textLight,
    textAlign: 'center',
  },

  emptyContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },

  emptyIcon: {
    width: 95,
    height: 95,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FCE7F3',
    marginBottom: 18,
  },

  emptyTitle: {
    fontSize: 21,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },

  emptyText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  emptyButton: {
    marginTop: 20,
    minWidth: 130,
    minHeight: 46,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },

  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },

  loadingBox: {
    width: 190,
    minHeight: 155,
    borderRadius: 20,
    backgroundColor:
      COLORS.surface || '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    elevation: 8,
  },

  loadingText: {
    marginTop: 15,
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },

  loadingSubText: {
    marginTop: 5,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
});

export default OrderConfirmation;