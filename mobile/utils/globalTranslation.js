import { Alert, Button, Text, TextInput } from 'react-native';

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

const patchAlert = () => {
  if (Alert.__nowTranslationPatched) return;

  const originalAlert = Alert.alert;

  Alert.alert = function patchedAlert(title, message, buttons, options) {
    const translated = translateAlertArgs(title, message, buttons);

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
