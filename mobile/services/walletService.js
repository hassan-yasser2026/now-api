import api from './api';

const walletService = {
  getWallet: async () => {
    try {
      const response = await api.get('/wallet');
      const payload = response.data?.data ?? response.data;
      return { success: true, wallet: payload };
    } catch (error) {
      return {
        success: false,
        wallet: null,
        message: error.response?.data?.message || 'تعذر تحميل المحفظة',
      };
    }
  },
};

export default walletService;
