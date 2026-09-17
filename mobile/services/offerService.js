import api from './api';

const normalizeOffers = (response) => {
  const data = response?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.offers)) return data.offers;
  return [];
};

const getErrorMessage = (error) => error?.response?.data?.message || 'تعذر الاتصال بالسيرفر';

export const offerService = {
  getVendorOffers: async (vendorId) => {
    try {
      const response = await api.get(`/vendor/${vendorId}/offers`);
      return { success: true, offers: normalizeOffers(response) };
    } catch (error) {
      return { success: false, offers: [], message: getErrorMessage(error) };
    }
  },
  createOffer: async (vendorId, payload) => {
    try {
      const response = await api.post(`/vendor/${vendorId}/offers`, payload);
      return { success: true, offer: response?.data?.data || response?.data, message: response?.data?.message };
    } catch (error) {
      return { success: false, message: getErrorMessage(error) };
    }
  },
};

export default offerService;
// مسودة المشروع - البشمهندس حسن ياسر
