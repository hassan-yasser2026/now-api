import { Alert, Button, Platform, Text, TextInput } from 'react-native';

import useAppStore from '../store/appStore';
import {
  createAlertTranslator,
  createPropsTranslator,
} from './propsTranslator';

/**
 * Installs translation globally, from outside the screens.
 *
 * Every panel renders its text through React Native's `Text` / `TextInput`,
 * so intercepting element creation translates the whole app — customer,
 * vendor, delivery, admin and auth — without touching a single screen.
 */

let installed = false;

const currentLanguage = () => {
  try {
    return useAppStore.getState().language;
  } catch {
    return 'ar';
  }
};

const translateElementProps = createPropsTranslator({
  Text,
  TextInput,
  Button,
  getLanguage: currentLanguage,
});

const translateAlertArgs = createAlertTranslator(currentLanguage);

const patchJsxRuntime = (runtime) => {
  if (!runtime || runtime.__nowTranslationPatched) return;

  for (const name of ['jsx', 'jsxs', 'jsxDEV']) {
    const original = runtime[name];
    if (typeof original !== 'function') continue;

    runtime[name] = function patchedJsx(type, props, ...rest) {
      return original.call(this, type, translateElementProps(type, props), ...rest);
    };
  }

  runtime.__nowTranslationPatched = true;
};

/**
 * react-native-web ships `Alert.alert` as a no-op (it never shows anything
 * and never fires a button's `onPress`). Every confirm flow in the app
 * (logout, delete account, etc.) is wired through `Alert.alert`, so on web
 * those buttons silently did nothing. This reimplements the same
 * title/message/buttons contract on top of `window.confirm` / `window.alert`
 * so button callbacks still run when the app is opened in a browser.
 */
const showWebAlert = (title, message, buttons) => {
  if (typeof window === 'undefined') return;

  const list = Array.isArray(buttons) && buttons.length > 0 ? buttons : [{ text: 'OK' }];
  const text = [title, message].filter(Boolean).join('\n\n');

  if (list.length === 1) {
    window.alert(text);
    list[0]?.onPress?.();
    return;
  }

  const cancelButton = list.find((button) => button.style === 'cancel');
  const actionButtons = list.filter((button) => button !== cancelButton);

  const tryNext = (index) => {
    if (index >= actionButtons.length) {
      cancelButton?.onPress?.();
      return;
    }

    const button = actionButtons[index];
    const prompt = actionButtons.length > 1 ? `${text}\n\n${button.text}؟` : text;

    if (window.confirm(prompt)) {
      button.onPress?.();
    } else if (index + 1 < actionButtons.length) {
      tryNext(index + 1);
    } else {
      cancelButton?.onPress?.();
    }
  };

  tryNext(0);
};

const patchAlert = () => {
  if (Alert.__nowTranslationPatched) return;

  const originalAlert = Alert.alert;

  Alert.alert = function patchedAlert(title, message, buttons, options) {
    const translated = translateAlertArgs(title, message, buttons);

    if (Platform.OS === 'web') {
      showWebAlert(translated.title, translated.message, translated.buttons);
      return;
    }

    return originalAlert.call(
      this,
      translated.title,
      translated.message,
      translated.buttons,
      options
    );
  };

  Alert.__nowTranslationPatched = true;
};

/** Call once, before the navigation tree mounts. */
export const installGlobalTranslation = () => {
  if (installed) return;
  installed = true;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    patchJsxRuntime(require('react/jsx-runtime'));
  } catch (error) {
    console.warn('Translation: jsx-runtime patch skipped', error?.message);
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    patchJsxRuntime(require('react/jsx-dev-runtime'));
  } catch {
    // Only present in development bundles.
  }

  try {
    patchAlert();
  } catch (error) {
    console.warn('Translation: Alert patch skipped', error?.message);
  }
};

export default installGlobalTranslation;
