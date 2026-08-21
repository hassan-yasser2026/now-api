import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import deliveryService from '../../services/deliveryService';

// ========== Types ==========
type OrderStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'PREPARING'
  | 'READY'
  | 'PICKED_UP'
  | 'ON_THE_WAY'
  | 'DELIVERED'
  | 'CANCELLED';

type OrderItem = {
  id?: string;
  name?: string;
  menuItem?: { name: string; price: number };
  quantity: number;
  price: number;
};

type OrderDetails = {
  id: string;
  storeName?: string;
  store?: { name: string; address?: string };
  storeAddress?: string;
  customerName?: string;
  customer?: { name: string; phone?: string };
  customerAddress?: string;
  address?: string;
  deliveryAddress?: string;
  items?: OrderItem[];
  orderItems?: OrderItem[];
  total?: number;
  totalPrice?: number;
  notes?: string;
  status: OrderStatus;
  distance?: number;
  createdAt: string;
};

// ========== Component ==========
const DeliveryOrderDetails: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const { orderId } = route.params;
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [updating, setUpdating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadOrder = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await deliveryService.getOrderById(orderId);
      // التعامل مع أشكال مختلفة للاستجابة
      const data = response?.data || response;
      setOrder(data);
    } catch (err: any) {
      setError(err?.message || 'فشل جلب بيانات الطلب');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const handleStatusUpdate = async (newStatus: OrderStatus) => {
    if (!order) return;
    setUpdating(true);
    try {
      const response = await deliveryService.updateOrderStatus(orderId, newStatus);
      // بعد التحديث، نعيد تحميل البيانات
      await loadOrder();
      Alert.alert('نجاح', 'تم تحديث حالة الطلب بنجاح');
    } catch (err: any) {
      Alert.alert('خطأ', err?.message || 'فشل تحديث حالة الطلب');
    } finally {
      setUpdating(false);
    }
  };

  const getNextAction = (): { status: OrderStatus; label: string; icon: string } | null => {
    if (!order) return null;
    switch (order.status) {
      case 'READY':
        return { status: 'PICKED_UP', label: 'استلام الطلب', icon: 'bicycle-outline' };
      case 'PICKED_UP':
        return { status: 'ON_THE_WAY', label: 'بدء التوصيل', icon: 'navigate-outline' };
      case 'ON_THE_WAY':
        return { status: 'DELIVERED', label: 'تأكيد التسليم', icon: 'checkmark-done-outline' };
      default:
        return null;
    }
  };

  const nextAction = getNextAction();

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  if (error || !order) {
    return (
      <SafeAreaView style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.error} />
        <Text style={styles.errorText}>{error || 'تعذر تحميل الطلب'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadOrder}>
          <Text style={styles.retryText}>إعادة المحاولة</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>طلب #{order.id}</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* حالة الطلب */}
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>حالة الطلب</Text>
          <Text style={styles.statusValue}>{order.status}</Text>
        </View>

        {/* المتجر */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="storefront-outline" size={20} color={COLORS.primary} />
            <Text style={styles.cardTitle}>بيانات المتجر</Text>
          </View>
          <Text style={styles.detailText}>{order.store?.name || order.storeName || 'متجر'}</Text>
          <Text style={styles.detailSubText}>{order.store?.address || order.storeAddress || ''}</Text>
        </View>

        {/* العميل */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="person-outline" size={20} color={COLORS.primary} />
            <Text style={styles.cardTitle}>بيانات العميل</Text>
          </View>
          <Text style={styles.detailText}>{order.customer?.name || order.customerName || 'عميل'}</Text>
          <Text style={styles.detailSubText}>{order.address || order.deliveryAddress || order.customerAddress || 'غير محدد'}</Text>
        </View>

        {/* المسافة */}
        {order.distance ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="map-outline" size={20} color={COLORS.primary} />
              <Text style={styles.cardTitle}>المسافة</Text>
            </View>
            <Text style={styles.detailText}>{order.distance} كم</Text>
          </View>
        ) : null}

        {/* الأصناف */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="list-outline" size={20} color={COLORS.primary} />
            <Text style={styles.cardTitle}>الأصناف</Text>
          </View>
          {(order.orderItems || order.items || []).map((item, index) => (
            <View key={item.id || index} style={styles.itemRow}>
              <Text style={styles.itemName}>
                {item.menuItem?.name || item.name || 'صنف'} × {item.quantity}
              </Text>
              <Text style={styles.itemPrice}>{(item.price * item.quantity).toFixed(2)} ج.م</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>الإجمالي</Text>
            <Text style={styles.totalValue}>{Number(order.totalPrice || order.total || 0).toFixed(2)} ج.م</Text>
          </View>
        </View>

        {/* الملاحظات */}
        {order.notes ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="chatbox-ellipses-outline" size={20} color={COLORS.primary} />
              <Text style={styles.cardTitle}>ملاحظات</Text>
            </View>
            <Text style={styles.detailText}>{order.notes}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* زر الإجراء التالي */}
      {nextAction && (
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[styles.actionButton, updating && styles.actionButtonDisabled]}
            onPress={() => handleStatusUpdate(nextAction.status)}
            disabled={updating}
          >
            {updating ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name={nextAction.icon as any} size={20} color="#FFFFFF" />
                <Text style={styles.actionText}>{nextAction.label}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

// ========== Styles ==========
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.error,
    marginTop: 12,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  statusCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
    color: COLORS.secondaryText,
  },
  statusValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 4,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  detailText: {
    fontSize: 15,
    color: COLORS.text,
    marginBottom: 2,
  },
  detailSubText: {
    fontSize: 13,
    color: COLORS.secondaryText,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  itemName: {
    fontSize: 14,
    color: COLORS.text,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  actionContainer: {
    paddingVertical: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  actionButtonDisabled: {
    opacity: 0.7,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default DeliveryOrderDetails;