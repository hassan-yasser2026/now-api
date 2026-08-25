import api from './api';

const adminService = {
  getDashboard: async () => {
    const response = await api.get('/admin/dashboard');
    return response.data;
  },

  getUsers: async (params = {}) => {
    const response = await api.get('/admin/users', { params });
    return response.data;
  },

  updateUser: async (userId, data) => {
    const response = await api.patch(`/admin/users/${userId}`, data);
    return response.data;
  },

  deleteUser: async (userId) => {
    const response = await api.delete(`/admin/users/${userId}`);
    return response.data;
  },

  suspendUser: async (userId) => {
    const response = await api.patch(`/admin/users/${userId}/suspend`);
    return response.data;
  },

  activateUser: async (userId) => {
    const response = await api.patch(`/admin/users/${userId}/activate`);
    return response.data;
  },

  getStores: async (params = {}) => {
    const response = await api.get('/admin/stores', { params });
    return response.data;
  },

  updateStore: async (storeId, data) => {
    const response = await api.patch(`/admin/stores/${storeId}`, data);
    return response.data;
  },

  deleteStore: async (storeId) => {
    const response = await api.delete(`/admin/stores/${storeId}`);
    return response.data;
  },

  suspendStore: async (storeId) => {
    const response = await api.patch(`/admin/stores/${storeId}/suspend`);
    return response.data;
  },

  activateStore: async (storeId) => {
    const response = await api.patch(`/admin/stores/${storeId}/activate`);
    return response.data;
  },

  getOrders: async (params = {}) => {
    const response = await api.get('/admin/orders', { params });
    return response.data;
  },

  getDeliveries: async (params = {}) => {
    const response = await api.get('/admin/delivery', { params });
    return response.data;
  },

  getSubAdmins: async () => {
    const response = await api.get('/admin/sub-admins');
    return response.data;
  },

  createSubAdmin: async (data) => {
    const response = await api.post('/admin/sub-admins', data);
    return response.data;
  },

  updateSubAdmin: async (id, data) => {
    const response = await api.patch(`/admin/sub-admins/${id}`, data);
    return response.data;
  },

  deleteSubAdmin: async (id) => {
    const response = await api.delete(`/admin/sub-admins/${id}`);
    return response.data;
  },

  getReports: async (params = {}) => {
    const response = await api.get('/admin/reports', { params });
    return response.data;
  },

  getAuditLogs: async (params = {}) => {
    const response = await api.get('/admin/audit-logs', { params });
    return response.data;
  },
};

export default adminService;