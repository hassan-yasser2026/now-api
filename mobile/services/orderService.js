import api from './api';
import useAppStore from '../store/appStore';

const getCurrentUserId = () => useAppStore.getState().user?.id ?? null;

const getErrorMessage = (error, fallback) => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    (error?.message === 'Network Error' ? 'تعذر الاتصال بالسيرفر' : null) ||
    fallback
  );
};

const normalizeOrder = (response) => {
  const data = response?.data;
  if (data?.order) return data.order;
  return data;
};

const normalizeOrders = (response) => {
  const data = response?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.orders)) return data.orders;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

export const orderService = {
  // ============ إنشاء طلب ============
  createOrder: async ({
    storeId,
    items,
    address,
    scheduledAt,
    paymentMethod = 'CASH_ON_DELIVERY',
  }) => {
    try {
      if (!storeId) return { success: false, message: 'يجب اختيار المتجر' };
      if (!Array.isArray(items) || items.length === 0)
        return { success: false, message: 'السلة فارغة' };
      if (!address?.trim())
        return { success: false, message: 'عنوان التوصيل مطلوب' };
      if (!scheduledAt)
        return { success: false, message: 'يجب تحديد يوم ووقت التوصيل' };

      const scheduledDate = new Date(scheduledAt);
      if (Number.isNaN(scheduledDate.getTime()))
        return { success: false, message: 'موعد التوصيل غير صحيح' };

      const payload = {
        storeId,
        address: address.trim(),
        scheduledAt: scheduledDate.toISOString(),
        paymentMethod,
        items: items.map((item) => ({
          menuItemId: item.menuItemId || item.id,
          quantity: Number(item.quantity) || 1,
        })),
      };

      const response = await api.post('/orders', payload);
      return {
        success: true,
        order: normalizeOrder(response),
        message: response?.data?.message || 'تم إنشاء الطلب بنجاح',
      };
    } catch (error) {
      console.error('CREATE ORDER ERROR:', error?.response?.data || error.message);
      return { success: false, message: getErrorMessage(error, 'فشل إنشاء الطلب') };
    }
  },

  // ============ طلبات العميل ============
  getCustomerOrders: async () => {
    try {
      const customerId = getCurrentUserId();
      if (!customerId) {
        return { success: false, orders: [], message: 'المستخدم غير مسجل دخول' };
      }
      const response = await api.get(`/customer/${customerId}/orders`);
      return { success: true, orders: normalizeOrders(response) };
    } catch (error) {
      console.error('GET CUSTOMER ORDERS ERROR:', error?.response?.data || error.message);
      return { success: false, orders: [], message: getErrorMessage(error, 'فشل جلب طلبات العميل') };
    }
  },

  // ============ طلبات المتجر ============
  getVendorOrders: async () => {
    try {
      const vendorId = getCurrentUserId();
      if (!vendorId) {
        return { success: false, orders: [], message: 'المستخدم غير مسجل دخول' };
      }
      const response = await api.get(`/vendor/${vendorId}/orders`);
      return { success: true, orders: normalizeOrders(response) };
    } catch (error) {
      console.error('GET VENDOR ORDERS ERROR:', error?.response?.data || error.message);
      return { success: false, orders: [], message: getErrorMessage(error, 'فشل جلب طلبات المتجر') };
    }
  },

  // ============ طلبات المندوب ============
  getDeliveryOrders: async () => {
    try {
      const deliveryId = getCurrentUserId();
      if (!deliveryId) {
        return { success: false, orders: [], message: 'المستخدم غير مسجل دخول' };
      }
      const response = await api.get(`/delivery/${deliveryId}/orders`);
      return { success: true, orders: normalizeOrders(response) };
    } catch (error) {
      console.error('GET DELIVERY ORDERS ERROR:', error?.response?.data || error.message);
      return { success: false, orders: [], message: getErrorMessage(error, 'فشل جلب طلبات المندوب') };
    }
  },

  // ============ تفاصيل طلب ============
  getOrderById: async (orderId) => {
    try {
      if (!orderId) return { success: false, message: 'رقم الطلب مطلوب' };
      const response = await api.get(`/orders/${orderId}`);
      return { success: true, order: normalizeOrder(response) };
    } catch (error) {
      return { success: false, message: getErrorMessage(error, 'فشل جلب الطلب') };
    }
  },

  // ============ إلغاء الطلب ============
  cancelOrder: async (orderId, reason = '') => {
    try {
      if (!orderId) return { success: false, message: 'رقم الطلب مطلوب' };
      const response = await api.put(`/orders/${orderId}/cancel`, {
        reason: reason.trim(),
      });
      return {
        success: true,
        order: normalizeOrder(response),
        message: response?.data?.message || 'تم إلغاء الطلب',
      };
    } catch (error) {
      return { success: false, message: getErrorMessage(error, 'فشل إلغاء الطلب') };
    }
  },

  // ============ تحديث حالة الطلب ============
  updateOrderStatus: async (orderId, status, deliveryId = null) => {
    try {
      if (!orderId || !status) return { success: false, message: 'بيانات تحديث الطلب ناقصة' };
      const payload = { status };
      if (deliveryId) payload.deliveryId = deliveryId;

      const response = await api.put(`/orders/${orderId}/status`, payload);
      return {
        success: true,
        order: normalizeOrder(response),
        message: response?.data?.message || 'تم تحديث حالة الطلب',
      };
    } catch (error) {
      return { success: false, message: getErrorMessage(error, 'فشل تحديث حالة الطلب') };
    }
  },

  // ============ تتبع الطلب ============
  getOrderTracking: async (orderId) => {
    try {
      if (!orderId) return { success: false, message: 'رقم الطلب مطلوب' };
      const response = await api.get(`/orders/${orderId}/tracking`);
      return {
        success: true,
        tracking: response?.data?.tracking || response?.data || null,
      };
    } catch (error) {
      return { success: false, tracking: null, message: getErrorMessage(error, 'فشل جلب تتبع الطلب') };
    }
  },

  // ============ إعادة جدولة الطلب ============
  rescheduleOrder: async (orderId, scheduledAt) => {
    try {
      if (!orderId || !scheduledAt) return { success: false, message: 'رقم الطلب وموعد التوصيل مطلوبان' };
      const date = new Date(scheduledAt);
      if (Number.isNaN(date.getTime())) return { success: false, message: 'موعد التوصيل غير صحيح' };

      const response = await api.put(`/orders/${orderId}/schedule`, {
        scheduledAt: date.toISOString(),
      });
      return {
        success: true,
        order: normalizeOrder(response),
        message: response?.data?.message || 'تم تعديل موعد الطلب',
      };
    } catch (error) {
      return { success: false, message: getErrorMessage(error, 'فشل تعديل موعد الطلب') };
    }
  },
};

export default orderService;