import React from 'react';

import {
  TouchableOpacity,
  Text,
  Linking,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
      <Ionicons name="logo-whatsapp" size={18} color="#fff" />
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
    bottom: 88,
    right: 20,

    backgroundColor:
      '#25D366',

    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 18,
    paddingVertical: 12,

    borderRadius: 30,
  },

  text: {
    color: '#fff',
    fontWeight: 'bold',
  },
});