import api from './api';
import useAppStore from '../store/appStore';

export const authService = {
  verifyPhone: async (phone, code) => {
    try {
      const response = await api.post('/auth/verify-phone', { phone, code });
      return { success: true, ...(response.data?.data ?? response.data) };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'رمز التحقق غير صحيح',
      };
    }
  },

  resendPhoneOtp: async (phone) => {
    try {
      const response = await api.post('/auth/resend-phone-otp', { phone });
      return { success: true, ...(response.data?.data ?? response.data) };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'تعذر إرسال رمز التحقق',
      };
    }
  },

  // تسجيل الدخول
  login: async (phone, password, role) => {
    try {
      const response = await api.post('/auth/login', { phone, password, ...(role ? { role } : {}) });
      const payload = response.data?.data ?? response.data;
      const { user, token } = payload || {};

      if (payload?.pendingApproval) {
        return {
          success: true,
          pendingApproval: true,
          user,
          message: payload.message || 'حسابك في انتظار مراجعة الإدارة لمدة تصل إلى 48 ساعة.',
        };
      }

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
      console.error('UPDATE PROFILE ERROR:', error);
      return {
        success: false,
        message: error.response?.data?.message
          || error.response?.data?.data?.message
          || (!error.response
            ? 'تعذر الاتصال بالخادم. تأكد من اتصال الإنترنت وعنوان API'
            : null)
          || 'فشل تحديث بيانات الحساب',
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
    return register('delivery', data, { autoLogin: false });
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
    const responseBody = response.data || {};
    const payload = responseBody.data ?? responseBody;
    const { user, token } = payload || {};

    if (payload?.phoneVerificationRequired) {
      return {
        success: true,
        phoneVerificationRequired: true,
        pendingApproval: false,
        user,
        message: payload.message || 'أدخل رمز التحقق المرسل إلى بريدك الإلكتروني.',
      };
    }

    if (payload?.pendingApproval || responseBody.pendingApproval) {
      return {
        success: true,
        pendingApproval: true,
        user,
        message: responseBody.message
          || payload.message
          || 'حسابك في انتظار مراجعة الإدارة لمدة تصل إلى 48 ساعة.',
      };
    }

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
    console.error('REGISTER API ERROR:', {
      role,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
      code: error.code,
    });

    return {
      success: false,
      message: error.response?.data?.message
        || error.response?.data?.data?.message
        || error.message
        || 'فشل إنشاء الحساب',
    };
  }
}