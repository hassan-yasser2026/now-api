import React, { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  SafeAreaProvider,
} from 'react-native-safe-area-context';

import { StatusBar } from 'expo-status-bar';

import {
  NavigationContainer,
} from '@react-navigation/native';

import {
  I18nManager,
  useColorScheme,
} from 'react-native';

import * as Localization from 'expo-localization';

import RootNavigator from './navigation/RootNavigator';
import useAppStore from './store/appStore';

import {
  lightTheme,
  darkTheme,
} from './constants/theme';

export default function App() {
  const systemScheme = useColorScheme();

  const themePreference = useAppStore(
    (state) => state.themePreference
  );

  const isDark =
    themePreference === 'dark' ||
    (
      themePreference === 'system' &&
      systemScheme === 'dark'
    );

  const theme = isDark
    ? darkTheme
    : lightTheme;

  useEffect(() => {
    const initializeLanguage = async () => {
      const persistedLanguage = await AsyncStorage.getItem('language');
      const localeTag =
        Localization.getLocales?.()[0]?.languageTag || persistedLanguage || 'ar';
      const nextLanguage = persistedLanguage
        ? persistedLanguage === 'en'
          ? 'en'
          : 'ar'
        : localeTag.toLowerCase().startsWith('ar')
          ? 'ar'
          : 'en';

      if (typeof I18nManager?.allowRTL === 'function') {
        I18nManager.allowRTL(true);
      }
      if (typeof I18nManager?.forceRTL === 'function') {
        I18nManager.forceRTL(nextLanguage === 'ar');
      }
      if (typeof I18nManager?.swapLeftAndRightInRTL === 'function') {
        I18nManager.swapLeftAndRightInRTL(nextLanguage === 'ar');
      }

      if (useAppStore.getState().language !== nextLanguage) {
        await useAppStore.getState().setLanguage(nextLanguage);
      }
    };

    initializeLanguage();
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={theme}>
        <StatusBar
          style={isDark ? 'light' : 'dark'}
        />

        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}