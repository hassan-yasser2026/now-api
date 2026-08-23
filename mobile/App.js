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
  View,
  useColorScheme,
} from 'react-native';

import * as Localization from 'expo-localization';

import RootNavigator from './navigation/RootNavigator';
import GlobalLanguageButton from './components/GlobalLanguageButton';
import useAppStore from './store/appStore';
import installGlobalTranslation from './utils/globalTranslation';

import {
  lightTheme,
  darkTheme,
} from './constants/theme';

// Patch Text / TextInput / Alert before any screen mounts so every panel is
// translated from the app shell instead of screen by screen.
installGlobalTranslation();

export default function App() {
  const systemScheme = useColorScheme();

  const themePreference = useAppStore(
    (state) => state.themePreference
  );

  const language = useAppStore((state) => state.language);

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

    const initializeCountry = async () => {
      const persistedCountry = await AsyncStorage.getItem('country');
      if (persistedCountry) return;

      const region = Localization.getLocales?.()[0]?.regionCode;
      if (region) {
        await useAppStore.getState().setCountry(region);
      }
    };

    initializeLanguage();
    initializeCountry();
  }, []);

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1 }}>
        {/*
          Remounting on language change re-renders every screen through the
          translation layer, so a switch applies to all panels at once.
        */}
        <NavigationContainer key={language} theme={theme}>
          <StatusBar
            style={isDark ? 'light' : 'dark'}
          />

          <RootNavigator />
        </NavigationContainer>

        <GlobalLanguageButton />
      </View>
    </SafeAreaProvider>
  );
}
