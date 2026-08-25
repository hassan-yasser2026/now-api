import { translate, translateChildren } from './translator.js';

/**
 * Pure factory for the element-props translator.
 *
 * Kept free of React Native imports so it can be unit tested in plain Node;
 * `globalTranslation.js` binds it to the real `Text` / `TextInput` / `Button`.
 */
export const createPropsTranslator = ({
  Text,
  TextInput,
  Button,
  getLanguage,
}) => (type, props) => {
  if (!props) return props;

  const language = getLanguage();
  if (language !== 'en') return props;

  if (type === Text) {
    const children = translateChildren(props.children, language);
    return children === props.children ? props : { ...props, children };
  }

  if (type === TextInput) {
    const placeholder = translate(props.placeholder, language);
    return placeholder === props.placeholder
      ? props
      : { ...props, placeholder };
  }

  if (type === Button) {
    const title = translate(props.title, language);
    return title === props.title ? props : { ...props, title };
  }

  return props;
};

/** Translate the arguments of an `Alert.alert(title, message, buttons)` call. */
export const createAlertTranslator = (getLanguage) => (title, message, buttons) => {
  const language = getLanguage();
  if (language !== 'en') return { title, message, buttons };

  return {
    title: translate(title, language),
    message: translate(message, language),
    buttons: Array.isArray(buttons)
      ? buttons.map((button) =>
          button && typeof button.text === 'string'
            ? { ...button, text: translate(button.text, language) }
            : button
        )
      : buttons,
  };
};

export default createPropsTranslator;
