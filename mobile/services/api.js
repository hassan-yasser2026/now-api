import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import useAppStore from '../store/appStore';

const getLocalNetworkHost = () => {
  const hostUri =
    Constants?.expoConfig?.hostUri ||
    Constants?.manifest?.debuggerHost ||
    Constants?.manifest2?.extra?.expoGo?.debuggerHost;

  if (!hostUri) {
    return null;
  }

  const match = String(hostUri).match(/^([^:]+):/);
  const host = match?.[1];

  if (!host || host === 'localhost' || host === '127.0.0.1') {
    return null;
  }

  return host;
};

const getApiBaseUrl = () => {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/, '');
  }

  if (Platform.OS === 'android' || Platform.OS === 'ios') {
    const host = getLocalNetworkHost();
    if (host) {
      return `http://${host}:5000/api`;
    }

    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:5000/api';
    }

    return 'http://192.168.100.40:5000/api';
  }

  return 'http://192.168.100.40:5000/api';
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
      const token = await AsyncStorage.getItem('token');
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
