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
  return data;
};

const normalizeMenu = (response) => {
  const data = response?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.menu)) return data.menu;
  if (Array.isArray(data?.items)) return data.items;
  return [];
};

const storeService = {
  getStores: async () => {
    try {
      const response = await api.get('/stores');
      return { success: true, stores: normalizeStores(response) };
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
      const response = await api.patch(`/stores/${storeId}`, storeData);
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

  addMenuItem: async (storeId, itemData) => {
    try {
      if (!storeId) return { success: false, message: 'رقم المتجر مطلوب' };
      const response = await api.post(`/stores/${storeId}/menu`, {
        ...itemData,
        image: itemData?.image || 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80',
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
        image: itemData?.image || 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80',
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