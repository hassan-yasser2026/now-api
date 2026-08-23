import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';

import {
  DEFAULT_COUNTRY_CODE,
  getCountry,
} from '../constants/countries';

const normalizeLanguage = (lang) => (lang === 'en' ? 'en' : 'ar');

const normalizeCountry = (code) => getCountry(code).code;

const applyLanguageDirection = (lang) => {
  const normalizedLang = normalizeLanguage(lang);

  if (typeof I18nManager?.allowRTL === 'function') {
    I18nManager.allowRTL(true);
  }
  if (typeof I18nManager?.forceRTL === 'function') {
    I18nManager.forceRTL(normalizedLang === 'ar');
  }
  if (typeof I18nManager?.swapLeftAndRightInRTL === 'function') {
    I18nManager.swapLeftAndRightInRTL(normalizedLang === 'ar');
  }

  return normalizedLang;
};

const useAppStore = create((set, get) => ({
  // =========================
  // Authentication
  // =========================
  user: null,
  token: null,
  role: 'customer',
  isAuthenticated: false,
  isLoading: false,
  isGuest: true,

  // =========================
  // Theme & Language
  // =========================
  themePreference: 'system',
  language: 'ar',
  isRTL: true,
  country: DEFAULT_COUNTRY_CODE,

  setThemePreference: (preference) => {
    if (!['system', 'light', 'dark'].includes(preference)) {
      return false;
    }

    set({ themePreference: preference });
    return true;
  },

  setLanguage: async (lang) => {
    const normalizedLang = normalizeLanguage(lang);

    set({ language: normalizedLang, isRTL: normalizedLang === 'ar' });

    try {
      await AsyncStorage.setItem('language', normalizedLang);
      applyLanguageDirection(normalizedLang);
    } catch (error) {
      console.error('Error saving language:', error);
    }
  },

  setCountry: async (code) => {
    const normalizedCountry = normalizeCountry(code);

    set({ country: normalizedCountry });

    try {
      await AsyncStorage.setItem('country', normalizedCountry);
    } catch (error) {
      console.error('Error saving country:', error);
    }

    return normalizedCountry;
  },

  // =========================
  // Cart
  // =========================
  cart: [],

  // =========================
  // Authentication Actions
  // =========================
  setAuth: async (user, token) => {
    try {
      if (!user || !token) {
        return false;
      }

      const userRole = user.role || 'customer';

      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('user', JSON.stringify(user));

      set({
        user,
        token,
        role: userRole,
        isAuthenticated: true,
        isGuest: false,
      });

      return true;
    } catch (error) {
      console.error('Error saving auth:', error);
      return false;
    }
  },

  logout: async () => {
    try {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');

      set({
        user: null,
        token: null,
        role: 'customer',
        isAuthenticated: false,
        isGuest: true,
        cart: [],
      });

      return true;
    } catch (error) {
      console.error('Error logging out:', error);
      return false;
    }
  },

  restoreSession: async () => {
    set({ isLoading: true });

    try {
      const token = await AsyncStorage.getItem('token');
      const userStr = await AsyncStorage.getItem('user');
      const savedLang = await AsyncStorage.getItem('language');
      const savedCountry = await AsyncStorage.getItem('country');

      const updates = {};
      if (token && userStr) {
        const savedUser = JSON.parse(userStr);
        updates.user = savedUser;
        updates.token = token;
        updates.role = savedUser.role || 'customer';
        updates.isAuthenticated = true;
        updates.isGuest = false;
      }

      if (savedLang) {
        const normalizedLang = applyLanguageDirection(savedLang);
        updates.language = normalizedLang;
        updates.isRTL = normalizedLang === 'ar';
      }

      if (savedCountry) {
        updates.country = normalizeCountry(savedCountry);
      }

      set({
        ...updates,
        isRTL: updates.isRTL ?? get().isRTL,
      });

      return !!(token && userStr);
    } catch (error) {
      console.error('Error restoring session:', error);
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  // =========================
  // Cart Actions
  // =========================

  addToCart: (item, storeId) => {
    const state = get();

    // منع خلط منتجات من متاجر مختلفة
    if (
      state.cart.length > 0 &&
      state.cart[0].storeId !== storeId
    ) {
      return {
        conflict: true,
        existingStoreId: state.cart[0].storeId,
        newStoreId: storeId,
      };
    }

    set((currentState) => {
      const existing = currentState.cart.find(
        (i) =>
          i.id === item.id &&
          i.storeId === storeId
      );

      if (existing) {
        return {
          cart: currentState.cart.map((i) =>
            i.id === item.id &&
            i.storeId === storeId
              ? {
                  ...i,
                  quantity: i.quantity + 1,
                }
              : i
          ),
        };
      }

      return {
        cart: [
          ...currentState.cart,
          {
            ...item,
            quantity: 1,
            storeId,
          },
        ],
      };
    });

    return {
      conflict: false,
    };
  },

  replaceCartWithItem: (item, storeId) => {
    set({
      cart: [
        {
          ...item,
          quantity: 1,
          storeId,
        },
      ],
    });
  },

  removeFromCart: (itemId, storeId) =>
    set((state) => ({
      cart: state.cart.filter(
        (i) =>
          !(
            i.id === itemId &&
            i.storeId === storeId
          )
      ),
    })),

  updateQuantity: (itemId, storeId, quantity) =>
    set((state) => ({
      cart: state.cart
        .map((i) =>
          i.id === itemId &&
          i.storeId === storeId
            ? {
                ...i,
                quantity: Math.max(0, quantity),
              }
            : i
        )
        .filter((i) => i.quantity > 0),
    })),

  clearCart: () => {
    set({ cart: [] });
  },

  clearCartForStore: (storeId) =>
    set((state) => ({
      cart: state.cart.filter(
        (i) => i.storeId !== storeId
      ),
    })),

  // =========================
  // User Actions
  // =========================

  updateUser: (userData) =>
    set((state) => ({
      user: state.user
        ? {
            ...state.user,
            ...userData,
          }
        : userData,
    })),
}));

export default useAppStore;