import axios from 'axios';
import useAppStore from '../store/appStore';
import { getAuthToken } from '../utils/authStorage';

const PRODUCTION_API_URL = 'https://api.now-eg.com/api';

const getApiBaseUrl = () => {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

  if (configuredUrl) {
    const normalizedUrl = configuredUrl.replace(/\/+$/, '');
    const isLocalUrl = /^https?:\/\/(?:localhost|127\.0\.0\.1|10\.0\.2\.2)(?::\d+)?(?:\/|$)/i.test(normalizedUrl);

    // Localhost is valid only while developing against the local server.
    // In a release build it points to the phone/emulator, not the API host.
    if (!isLocalUrl || __DEV__) {
      return normalizedUrl;
    }
  }

  // A missing or local-only Expo URL must use the reachable production API
  // in installed builds.
  return PRODUCTION_API_URL;
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// إضافة التوكن لكل طلب
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await getAuthToken();
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = 'Bearer ' + token;
      }
    } catch (error) {
      console.error('Error getting token:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// معالجة الردود
let isLoggingOut = false;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !isLoggingOut) {
      isLoggingOut = true;
      await useAppStore.getState().logout();
      isLoggingOut = false;
    }
    return Promise.reject(error);
  }
);

export default api;
// مسودة المشروع - البشمهندس حسن ياسر
