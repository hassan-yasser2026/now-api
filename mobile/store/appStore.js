import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';

import {
  DEFAULT_COUNTRY_CODE,
  getCountry,
} from '../constants/countries';

/**
 * توحيد صيغة اللغة
 */
const normalizeLanguage = (lang) => (lang === 'en' ? 'en' : 'ar');

/**
 * التثبت من وجود الدولة
 */
const normalizeCountry = (code) => {
  const country = getCountry(code);
  return country ? country.code : DEFAULT_COUNTRY_CODE;
};

/**
 * تطبيق اتجاه الواجهة بناءً على اللغة
 */
const applyLanguageDirection = (lang) => {
  const normalizedLang = normalizeLanguage(lang);
  const isRTL = normalizedLang === 'ar';

  if (typeof I18nManager?.allowRTL === 'function') {
    I18nManager.allowRTL(true);
  }
  if (typeof I18nManager?.forceRTL === 'function') {
    I18nManager.forceRTL(isRTL);
  }
  if (typeof I18nManager?.swapLeftAndRightInRTL === 'function') {
    I18nManager.swapLeftAndRightInRTL(isRTL);
  }

  return normalizedLang;
};

/**
 * دالة مساعدة لتخزين السلة في الذاكرة بشكل آمن
 */
const persistCart = async (cart) => {
  try {
    await AsyncStorage.setItem('cart', JSON.stringify(cart));
  } catch (error) {
    console.error('Error saving cart to AsyncStorage:', error);
  }
};

const useAppStore = create((set, get) => ({
  // =========================
  // حالة تسجيل الدخول (Auth)
  // =========================
  user: null,
  token: null,
  role: 'customer',
  isAuthenticated: false,
  isLoading: false,
  isGuest: true,

  // =========================
  // حالة الثيم واللغة
  // =========================
  themePreference: 'system',
  language: 'ar',
  isRTL: true,
  country: DEFAULT_COUNTRY_CODE,

  setThemePreference: async (preference) => {
    if (!['system', 'light', 'dark'].includes(preference)) {
      return false;
    }

    set({ themePreference: preference });

    try {
      await AsyncStorage.setItem('themePreference', preference);
      return true;
    } catch (error) {
      console.error('Error saving theme preference:', error);
      return false;
    }
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
  // حالة السلة
  // =========================
  cart: [],

  // =========================
  // إجراءات المصادقة (Auth Actions)
  // =========================
  setAuth: async (userData, tokenData) => {
    try {
      let token = null;
      let user = null;

      if (typeof userData === 'string') {
        token = userData;
        user = tokenData;
      } else if (tokenData && typeof tokenData === 'string') {
        user = userData;
        token = tokenData;
      } else if (userData && typeof userData === 'object') {
        token = userData.token || userData.accessToken || userData.data?.token || userData.data?.accessToken;
        user = userData.user || userData.data?.user || (userData.id ? userData : null);
      }

      if (!user || !token) {
        console.warn('setAuth warning: user or token missing from input parameters', { userData, tokenData });
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
      await AsyncStorage.removeItem('cart');

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
      const [token, userStr, savedLang, savedCountry, savedTheme, savedCart] = await Promise.all([
        AsyncStorage.getItem('token'),
        AsyncStorage.getItem('user'),
        AsyncStorage.getItem('language'),
        AsyncStorage.getItem('country'),
        AsyncStorage.getItem('themePreference'),
        AsyncStorage.getItem('cart'),
      ]);

      const updates = {};

      if (token && userStr) {
        try {
          const savedUser = JSON.parse(userStr);
          updates.user = savedUser;
          updates.token = token;
          updates.role = savedUser.role || 'customer';
          updates.isAuthenticated = true;
          updates.isGuest = false;
        } catch (e) {
          console.error('Failed to parse saved user JSON:', e);
        }
      }

      if (savedLang) {
        const normalizedLang = applyLanguageDirection(savedLang);
        updates.language = normalizedLang;
        updates.isRTL = normalizedLang === 'ar';
      }

      if (savedCountry) {
        updates.country = normalizeCountry(savedCountry);
      }

      if (savedTheme && ['system', 'light', 'dark'].includes(savedTheme)) {
        updates.themePreference = savedTheme;
      }

      if (savedCart) {
        try {
          updates.cart = JSON.parse(savedCart) || [];
        } catch (e) {
          console.error('Failed to parse saved cart JSON:', e);
        }
      }

      set((state) => ({
        ...state,
        ...updates,
      }));

      return !!(token && userStr);
    } catch (error) {
      console.error('Error restoring session:', error);
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  // =========================
  // إجراءات السلة (Cart Actions)
  // =========================
  addToCart: async (item, storeId) => {
    const state = get();
    const addQuantity = item.quantity && item.quantity > 0 ? item.quantity : 1;

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

    let updatedCart = [];
    const existing = state.cart.find(
      (i) => i.id === item.id && i.storeId === storeId
    );

    if (existing) {
      updatedCart = state.cart.map((i) =>
        i.id === item.id && i.storeId === storeId
          ? {
              ...i,
              quantity: i.quantity + addQuantity,
            }
          : i
      );
    } else {
      updatedCart = [
        ...state.cart,
        {
          ...item,
          quantity: addQuantity,
          storeId,
        },
      ];
    }

    set({ cart: updatedCart });
    await persistCart(updatedCart);

    return { conflict: false };
  },

  replaceCartWithItem: async (item, storeId) => {
    const addQuantity = item.quantity && item.quantity > 0 ? item.quantity : 1;
    const newCart = [
      {
        ...item,
        quantity: addQuantity,
        storeId,
      },
    ];

    set({ cart: newCart });
    await persistCart(newCart);
  },

  removeFromCart: async (itemId, storeId) => {
    const newCart = get().cart.filter(
      (i) => !(i.id === itemId && i.storeId === storeId)
    );
    set({ cart: newCart });
    await persistCart(newCart);
  },

  updateQuantity: async (itemId, storeId, quantity) => {
    const newCart = get().cart
      .map((i) =>
        i.id === itemId && i.storeId === storeId
          ? {
              ...i,
              quantity: Math.max(0, quantity),
            }
          : i
      )
      .filter((i) => i.quantity > 0);

    set({ cart: newCart });
    await persistCart(newCart);
  },

  clearCart: async () => {
    set({ cart: [] });
    try {
      await AsyncStorage.removeItem('cart');
    } catch (error) {
      console.error('Error clearing cart from AsyncStorage:', error);
    }
  },

  clearCartForStore: async (storeId) => {
    const newCart = get().cart.filter((i) => i.storeId !== storeId);
    set({ cart: newCart });
    await persistCart(newCart);
  },

  // =========================
  // إجراءات المستخدم (User Actions)
  // =========================
  updateUser: async (userData) => {
    const currentState = get();
    const updatedUser = currentState.user
      ? {
          ...currentState.user,
          ...userData,
        }
      : userData;

    const newRole = updatedUser?.role || currentState.role;

    set({
      user: updatedUser,
      role: newRole,
    });

    try {
      if (updatedUser) {
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      }
      return true;
    } catch (error) {
      console.error('Error persisting updated user:', error);
      return false;
    }
  },
}));

export default useAppStore;