import api from './api';

const menuService = {
  getMenuItems: async (storeId) => {
    const response = await api.get(`/stores/${storeId}/menu`);
    return response.data;
  },
};

export default menuService;