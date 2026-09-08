import api from './api';
import useAppStore from '../store/appStore';

export const authService = {
  // تسجيل الدخول
  login: async (phone, password) => {
    try {
      const response = await api.post('/auth/login', { phone, password });
      const payload = response.data?.data ?? response.data;
      const { user, token } = payload || {};

      if (!user || !token) {
        return {
          success: false,
          message: 'استجابة الخادم غير صحيحة',
        };
      }

      const success = await useAppStore.getState().setAuth(user, token);
      if (success) {
        return { success: true, user };
      }
      return { success: false, message: 'فشل حفظ بيانات الدخول' };
    } catch (error) {
      if (!error.response) {
        return {
          success: false,
          message: 'تعذر الاتصال بالخادم. تأكد من تشغيل API وعنوانه الصحيح',
        };
      }

      return {
        success: false,
        message: error.response?.data?.message || error.response?.data?.data?.message || 'فشل تسجيل الدخول',
      };
    }
  },

  updateProfile: async (data) => {
    try {
      const response = await api.patch('/auth/profile', data);
      const payload = response.data?.data ?? response.data;
      return payload?.user
        ? { success: true, user: payload.user }
        : { success: false, message: 'استجابة الخادم غير صحيحة' };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'فشل تحديث بيانات الحساب',
      };
    }
  },

  deleteAccount: async () => {
    try {
      const response = await api.delete('/auth/profile');
      return response.data?.data ?? response.data;
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'تعذر حذف الحساب',
      };
    }
  },

  // تسجيل عميل جديد
  registerCustomer: async (data) => {
    return register('customer', data);
  },

  // تسجيل بائع جديد
  registerVendor: async (data) => {
    return register('vendor', data, { autoLogin: false });
  },

  // تسجيل مندوب جديد
  registerDelivery: async (data) => {
    return register('delivery', data);
  },

  // تسجيل الخروج
  logout: async () => {
    await useAppStore.getState().logout();
  },

  // استعادة الجلسة
  restoreSession: async () => {
    return await useAppStore.getState().restoreSession();
  },
};

// دالة مساعدة للتسجيل
async function register(role, data, { autoLogin = true } = {}) {
  try {
    const response = await api.post('/auth/register', {
      ...data,
      role,
    });
    const payload = response.data?.data ?? response.data;
    const { user, token } = payload || {};

    if (!user || !token) {
      return {
        success: false,
        message: 'استجابة الخادم غير صحيحة',
      };
    }

    if (!autoLogin) {
      return { success: true, user };
    }

    const success = await useAppStore.getState().setAuth(user, token);
    if (success) {
      return { success: true, user };
    }
    return { success: false, message: 'فشل حفظ بيانات الدخول' };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || error.response?.data?.data?.message || 'فشل إنشاء الحساب',
    };
  }
}