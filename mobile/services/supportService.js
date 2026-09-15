import api from './api';

const getErrorMessage = (error, fallback) => (
  error?.response?.data?.message || error?.message || fallback
);

const supportService = {
  getComplaints: async () => {
    try {
      const response = await api.get('/support/complaints');
      return { success: true, complaints: response?.data?.data || [] };
    } catch (error) {
      return { success: false, complaints: [], message: getErrorMessage(error, 'تعذر تحميل الشكاوى') };
    }
  },

  createComplaint: async ({ category, message, orderId }) => {
    try {
      const response = await api.post('/support/complaints', { category, message, orderId });
      return { success: true, complaint: response?.data?.data, message: response?.data?.message };
    } catch (error) {
      return { success: false, message: getErrorMessage(error, 'تعذر إرسال الشكوى') };
    }
  },

  getSessions: async () => {
    try {
      const response = await api.get('/support/sessions');
      return { success: true, sessions: response?.data?.data || [] };
    } catch (error) {
      return { success: false, sessions: [], message: getErrorMessage(error, 'تعذر تحميل المحادثات') };
    }
  },

  createSession: async ({ message, orderId }) => {
    try {
      const response = await api.post('/support/sessions', { message, orderId });
      return { success: true, session: response?.data?.data };
    } catch (error) {
      return { success: false, message: getErrorMessage(error, 'تعذر فتح المحادثة') };
    }
  },

  sendMessage: async (sessionId, message) => {
    try {
      const response = await api.post(`/support/sessions/${sessionId}/messages`, { message });
      return { success: true, message: response?.data?.data };
    } catch (error) {
      return { success: false, message: getErrorMessage(error, 'تعذر إرسال الرسالة') };
    }
  },
};

export default supportService;
