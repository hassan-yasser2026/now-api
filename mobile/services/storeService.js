import api from './api';

const getErrorMessage = (error, fallback) => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    (error?.message === 'Network Error' ? 'تعذر الاتصال بالسيرفر' : null) ||
    fallback
  );
};

const normalizeStores = (response) => {
  const data = response?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.stores)) return data.stores;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const normalizeStore = (response) => {
  const data = response?.data;
  if (data?.store) return data.store;
  return data?.data ?? data;
};

const normalizeMenu = (response) => {
  const data = response?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.menu)) return data.menu;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.menu)) return data.data.menu;
  if (Array.isArray(data?.data?.items)) return data.data.items;
  return [];
};

const storeService = {
  getStores: async (location = null) => {
    try {
      const params = location?.lat != null && location?.lng != null
        ? { latitude: location.lat, longitude: location.lng }
        : undefined;
      const response = await api.get('/stores', { params });
      const stores = normalizeStores(response).filter((store) => store?.isOpen !== false);
      return { success: true, stores };
    } catch (error) {
      console.error('GET STORES ERROR:', error?.response?.data || error.message);
      return {
        success: false,
        stores: [],
        message: getErrorMessage(error, 'فشل جلب المتاجر'),
      };
    }
  },

  getStoreById: async (storeId) => {
    try {
      if (!storeId) return { success: false, message: 'رقم المتجر مطلوب' };
      const response = await api.get(`/stores/${storeId}`);
      return { success: true, store: normalizeStore(response) };
    } catch (error) {
      console.error('GET STORE ERROR:', error?.response?.data || error.message);
      return {
        success: false,
        store: null,
        message: getErrorMessage(error, 'فشل جلب المتجر'),
      };
    }
  },

  createStore: async (storeData) => {
    try {
      const response = await api.post('/stores', storeData);
      return {
        success: true,
        store: normalizeStore(response),
        message: response?.data?.message || 'تم إنشاء المتجر بنجاح',
      };
    } catch (error) {
      console.error('CREATE STORE ERROR:', error?.response?.data || error.message);
      return {
        success: false,
        store: null,
        message: getErrorMessage(error, 'فشل إنشاء المتجر'),
      };
    }
  },

  updateStore: async (storeId, storeData) => {
    try {
      if (!storeId) return { success: false, message: 'رقم المتجر مطلوب' };
      let response;
      try {
        response = await api.put(`/stores/${storeId}`, storeData);
      } catch (error) {
        if (error?.response?.status !== 404) throw error;
        response = await api.patch(`/stores/${storeId}`, storeData);
      }
      return {
        success: true,
        store: normalizeStore(response),
        message: response?.data?.message || 'تم تحديث المتجر بنجاح',
      };
    } catch (error) {
      console.error('UPDATE STORE ERROR:', error?.response?.data || error.message);
      return {
        success: false,
        store: null,
        message: getErrorMessage(error, 'فشل تحديث المتجر'),
      };
    }
  },

  deleteStore: async (storeId) => {
    try {
      if (!storeId) return { success: false, message: 'رقم المتجر مطلوب' };
      const response = await api.delete(`/stores/${storeId}`);
      return {
        success: true,
        message: response?.data?.message || 'تم حذف المتجر بنجاح',
      };
    } catch (error) {
      console.error('DELETE STORE ERROR:', error?.response?.data || error.message);
      return {
        success: false,
        message: getErrorMessage(error, 'فشل حذف المتجر'),
      };
    }
  },

  getMenu: async (storeId) => {
    try {
      if (!storeId) return { success: false, message: 'رقم المتجر مطلوب' };
      const response = await api.get(`/stores/${storeId}/menu`);
      return {
        success: true,
        menu: normalizeMenu(response),
      };
    } catch (error) {
      console.error('GET MENU ERROR:', error?.response?.data || error.message);
      return {
        success: false,
        menu: [],
        message: getErrorMessage(error, 'فشل جلب قائمة الأصناف'),
      };
    }
  },

  getVendorMenu: async (vendorId) => {
    try {
      const response = await api.get(`/vendor/${vendorId}/menu`);
      return { success: true, menu: normalizeMenu(response) };
    } catch (error) {
      if (error?.response?.status === 404) {
        const storeResult = await storeService.getVendorStore(vendorId);
        if (storeResult.success && storeResult.store?.id) {
          return storeService.getMenu(storeResult.store.id);
        }
      }

      console.error('GET VENDOR MENU ERROR:', error?.response?.data || error.message);
      return { success: false, menu: [], message: getErrorMessage(error, 'فشل جلب قائمة الأصناف') };
    }
  },

  getVendorStore: async (vendorId) => {
    try {
      if (!vendorId) return { success: false, store: null, message: 'رقم البائع مطلوب' };
      const response = await api.get(`/vendor/${vendorId}/store`);
      return { success: true, store: normalizeStore(response) };
    } catch (error) {
      // Keep vendor screens working while older API deployments are being updated.
      if (error?.response?.status === 404) {
        try {
          const response = await api.get('/stores');
          const store = normalizeStores(response).find(
            (candidate) => Number(candidate?.vendorId) === Number(vendorId)
          );
          if (store) return { success: true, store };
        } catch (fallbackError) {
          console.error(
            'GET VENDOR STORE FALLBACK ERROR:',
            fallbackError?.response?.data || fallbackError.message
          );
        }
      }

      console.error('GET VENDOR STORE ERROR:', error?.response?.data || error.message);
      return {
        success: false,
        store: null,
        message: getErrorMessage(error, 'فشل جلب بيانات المتجر'),
      };
    }
  },

  addMenuItem: async (storeId, itemData) => {
    try {
      if (!storeId) return { success: false, message: 'رقم المتجر مطلوب' };
      const response = await api.post(`/stores/${storeId}/menu`, {
        ...itemData,
        image: itemData?.image || null,
      });
      return {
        success: true,
        menuItem: response?.data?.menuItem || response?.data?.item || response?.data,
        message: response?.data?.message || 'تم إضافة الصنف بنجاح',
      };
    } catch (error) {
      console.error('ADD MENU ITEM ERROR:', error?.response?.data || error.message);
      return {
        success: false,
        menuItem: null,
        message: getErrorMessage(error, 'فشل إضافة الصنف'),
      };
    }
  },

  updateMenuItem: async (storeId, itemId, itemData) => {
    try {
      if (!storeId || !itemId) return { success: false, message: 'بيانات الصنف غير مكتملة' };
      const response = await api.patch(`/stores/${storeId}/menu/${itemId}`, {
        ...itemData,
        image: itemData?.image || null,
      });
      return {
        success: true,
        menuItem: response?.data?.menuItem || response?.data?.item || response?.data,
        message: response?.data?.message || 'تم تحديث الصنف بنجاح',
      };
    } catch (error) {
      console.error('UPDATE MENU ITEM ERROR:', error?.response?.data || error.message);
      return {
        success: false,
        menuItem: null,
        message: getErrorMessage(error, 'فشل تحديث الصنف'),
      };
    }
  },

  deleteMenuItem: async (storeId, itemId) => {
    try {
      if (!storeId || !itemId) return { success: false, message: 'بيانات الصنف غير مكتملة' };
      const response = await api.delete(`/stores/${storeId}/menu/${itemId}`);
      return {
        success: true,
        message: response?.data?.message || 'تم حذف الصنف بنجاح',
      };
    } catch (error) {
      console.error('DELETE MENU ITEM ERROR:', error?.response?.data || error.message);
      return {
        success: false,
        message: getErrorMessage(error, 'فشل حذف الصنف'),
      };
    }
  },
};

export { storeService };
export default storeService;
