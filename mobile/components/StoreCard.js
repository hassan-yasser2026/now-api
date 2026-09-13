import React from 'react';
import { Image, Text, TouchableOpacity, StyleSheet, View } from 'react-native';
import { COLORS } from '../constants/colors';

const StoreCard = ({ store, onPress }) => {
  const imageUri = store?.image || store?.logo;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.storeImage} resizeMode="cover" />
      ) : (
        <View style={styles.storeImagePlaceholder} />
      )}
      <Text style={styles.storeName} numberOfLines={1}>{store?.name || 'متجر'}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5EEF0',
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  storeImage: {
    width: '100%',
    height: 132,
    backgroundColor: '#E9FAFD',
  },
  storeImagePlaceholder: {
    width: '100%',
    height: 132,
    backgroundColor: '#E9FAFD',
  },
  storeName: {
    paddingHorizontal: 10,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
});

export default StoreCard;