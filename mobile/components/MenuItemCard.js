import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { formatPrice } from '../utils/formatters';

export default function MenuItemCard({ item, quantity = 0, onAdd, onRemove, onPress }) {
  const isAvailable = item.isAvailable !== false;
  const imageUri = item.image || item.img;
  const ratingCount = Number(item.ratingsCount ?? item.ratingCount ?? 0);
  const averageRating = Number(item.averageRating ?? item.ratingAverage ?? 0);
  const hasDiscount = Number(item.discountValue || 0) > 0 && Number(item.originalPrice) > Number(item.price);
  const categoryName = item.category?.nameAr || item.category?.name || item.categoryName || item.category;

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={[styles.card, !isAvailable && styles.unavailableCard]}>
      <View style={styles.imageContainer}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Ionicons name="image-outline" size={28} color="#94A3B8" />
          </View>
        )}
        <View style={styles.imageOverlay}>
          <View style={styles.overlayTopRow}>
            {hasDiscount ? (
              <Text style={styles.discountBadge}>
                خصم {item.discountPercentage ? `${item.discountPercentage}%` : formatPrice(item.discountValue)}
              </Text>
            ) : null}
            {categoryName ? <Text style={styles.categoryBadge}>{categoryName}</Text> : null}
          </View>
          <View style={styles.overlayBottomRow}>
            <Text style={styles.overlayPrice}>{formatPrice(item.price)}</Text>
            {hasDiscount ? <Text style={styles.overlayOriginalPrice}>{formatPrice(item.originalPrice)}</Text> : null}
            {ratingCount > 0 ? <Text style={styles.overlayRating}>⭐ {averageRating.toFixed(1)} ({ratingCount})</Text> : null}
          </View>
        </View>
      </View>

      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        {item.description ? (
          <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
        ) : null}
        <Text style={[styles.availability, !isAvailable && styles.unavailableText]}>
          {isAvailable ? 'متاح' : 'غير متاح'}
        </Text>
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
    </TouchableOpacity>
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
  imageContainer: { width: 120, height: 120, borderRadius: 14, marginLeft: 12, overflow: 'hidden', position: 'relative' },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  imageOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.78)', paddingHorizontal: 6, paddingVertical: 5 },
  overlayTopRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 4 },
  overlayBottomRow: { flexDirection: 'row-reverse', alignItems: 'center', flexWrap: 'wrap', gap: 5, marginTop: 3 },
  categoryBadge: { color: '#E0F2FE', fontSize: 10, fontWeight: '700', flexShrink: 1 },
  discountBadge: { color: '#FECACA', fontSize: 10, fontWeight: '800', flexShrink: 1 },
  overlayPrice: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  overlayOriginalPrice: { color: '#CBD5E1', fontSize: 10, textDecorationLine: 'line-through' },
  overlayRating: { color: '#FDE68A', fontSize: 10, fontWeight: '700' },
  info: { flex: 1, marginRight: 8, alignItems: 'flex-end' },
  name: { fontSize: 16, fontWeight: '800', color: '#333333' },
  description: { fontSize: 12, color: '#666666', marginTop: 4, textAlign: 'right' },
  availability: { fontSize: 11, color: '#15803D', fontWeight: '700', marginTop: 3 },
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
