import React from 'react';

import {
  TouchableOpacity,
  Text,
  Linking,
  StyleSheet,
} from 'react-native';

import { CONFIG } from '../constants/config';

export default function WhatsappButton() {
  const openWhatsapp = async () => {
    const number = CONFIG.SUPPORT_WHATSAPP.replace(/[^0-9]/g, '');
    const url = `https://wa.me/${number}`;
    await Linking.openURL(url);
  };

  return (
    <TouchableOpacity
      onPress={
        openWhatsapp
      }
      style={styles.btn}
    >
      <Text
        style={styles.text}
      >
        واتساب
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    position: 'absolute',
    bottom: 20,
    right: 20,

    backgroundColor:
      '#25D366',

    paddingHorizontal: 18,
    paddingVertical: 12,

    borderRadius: 30,
  },

  text: {
    color: '#fff',
    fontWeight: 'bold',
  },
});