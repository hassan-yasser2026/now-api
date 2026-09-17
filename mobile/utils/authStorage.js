import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'token';

const useSecureStore = Platform.OS !== 'web';

export const getAuthToken = async () => {
  if (useSecureStore) {
    const secureToken = await SecureStore.getItemAsync(TOKEN_KEY);
    if (secureToken) return secureToken;
  }

  const legacyToken = await AsyncStorage.getItem(TOKEN_KEY);
  if (legacyToken && useSecureStore) {
    await SecureStore.setItemAsync(TOKEN_KEY, legacyToken);
    await AsyncStorage.removeItem(TOKEN_KEY);
  }
  return legacyToken;
};

export const setAuthToken = async (token) => {
  if (useSecureStore) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await AsyncStorage.removeItem(TOKEN_KEY);
    return;
  }
  await AsyncStorage.setItem(TOKEN_KEY, token);
};

export const removeAuthToken = async () => {
  await AsyncStorage.removeItem(TOKEN_KEY);
  if (useSecureStore) {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
};
// مسودة المشروع - البشمهندس حسن ياسر
