import axios from 'axios';
import { Platform } from 'react-native';
import useAppStore from '../store/appStore';
import { getAuthToken } from '../utils/authStorage';

const PRODUCTION_API_URL = 'https://now-api-production-ca56.up.railway.app/api';

const getApiBaseUrl = () => {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

  if (configuredUrl) {
    const normalizedUrl = configuredUrl.replace(/\/+$/, '');
    const isProductionUrl = /^https:\/\/now-api-production-ca56\.up\.railway\.app\/api$/i.test(normalizedUrl);
    if (isProductionUrl) {
      return normalizedUrl;
    }

    console.warn('Ignoring unsupported mobile API URL; using Railway production API');
    return PRODUCTION_API_URL;
  }

  // A missing Expo URL must never send the installed mobile app to an
  // unreachable emulator/LAN address. The online app uses Railway by default.
  if (Platform.OS === 'android' || Platform.OS === 'ios') {
    return PRODUCTION_API_URL;
  }

  if (Platform.OS === 'web' && !configuredUrl) {
    const hostname = typeof window !== 'undefined'
      ? window.location.hostname
      : '';

    if (hostname && !['localhost', '127.0.0.1'].includes(hostname)) {
      return '/api';
    }

    return PRODUCTION_API_URL;
  }

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
