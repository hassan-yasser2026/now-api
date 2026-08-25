import api from './api';

const deliveryService = {
  getAvailableOrders: async (params = {}) => {
    const response = await api.get('/delivery/orders/available', { params });
    return response.data;
  },

  getMyOrders: async (params = {}) => {
    const response = await api.get('/delivery/orders/my', { params });
    return response.data;
  },

  getOrderById: async (orderId) => {
    const response = await api.get(`/delivery/orders/${orderId}`);
    return response.data;
  },

  acceptOrder: async (orderId) => {
    const response = await api.post(`/delivery/orders/${orderId}/accept`);
    return response.data;
  },

  updateOrderStatus: async (orderId, status) => {
    const response = await api.patch(`/delivery/orders/${orderId}/status`, {
      status,
    });
    return response.data;
  },

  setAvailability: async (isOnline) => {
    const response = await api.patch('/delivery/availability', {
      status: isOnline ? 'online' : 'offline',
    });
    return response.data;
  },

  getEarnings: async (params = {}) => {
    const response = await api.get('/delivery/earnings', { params });
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get('/delivery/profile');
    return response.data;
  },

  updateLocation: async ({ latitude, longitude }) => {
    const response = await api.patch('/delivery/location', {
      latitude,
      longitude,
    });
    return response.data;
  },
};

export default deliveryService;