import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { formatPrice } from '../utils/formatters';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80';

export default function MenuItemCard({ item, quantity = 0, onAdd, onRemove }) {
  const isAvailable = item.isAvailable !== false;
  const imageUri = item.image || item.img || FALLBACK_IMAGE;

  return (
    <View style={[styles.card, !isAvailable && styles.unavailableCard]}>
      <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />

      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        {item.description ? (
          <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
        ) : null}
        <Text style={styles.price}>{formatPrice(item.price)}</Text>
      </View>

      {isAvailable ? (
        quantity > 0 ? (
          <View style={styles.quantityRow}>
            <TouchableOpacity style={styles.qtyBtn} onPress={() => onRemove && onRemove(item)}>
              <Ionicons name="remove" size={18} color={COLORS.primary} />
            </TouchableOpacity>
            <Text style={styles.qtyText}>{quantity}</Text>
            <TouchableOpacity style={styles.qtyBtn} onPress={() => onAdd && onAdd(item)}>
              <Ionicons name="add" size={18} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.addButton} onPress={() => onAdd && onAdd(item)}>
            <Ionicons name="add" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        )
      ) : (
        <View style={styles.disabledButton}>
          <Text style={styles.unavailableText}>غير متاح</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 12,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  unavailableCard: { opacity: 0.55 },
  image: { width: 72, height: 72, borderRadius: 14, marginLeft: 12 },
  info: { flex: 1, marginRight: 8, alignItems: 'flex-end' },
  name: { fontSize: 16, fontWeight: '800', color: '#333333' },
  description: { fontSize: 12, color: '#666666', marginTop: 4, textAlign: 'right' },
  price: { fontSize: 15, fontWeight: '900', color: COLORS.primary, marginTop: 8 },
  addButton: {
    width: 48, height: 48, borderRadius: 16,
    backgroundColor: '#FFF1F7', alignItems: 'center', justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10,
  },
  unavailableText: { color: '#666666', fontSize: 11, fontWeight: '700' },
  quantityRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: {
    width: 34, height: 34, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  qtyText: { fontSize: 16, fontWeight: '700', color: COLORS.text, minWidth: 22, textAlign: 'center' },
});
