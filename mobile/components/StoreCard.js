import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

const StoreCard = ({ store, onPress }) => {
  const rating = Number(store?.rating || 0);
  const deliveryTime = store?.deliveryTime || '25-35 دقيقة';
  const distance = store?.distance || '1.5 كم';
  const category = store?.category || store?.type || 'عام';
  const discount = store?.discount || store?.offer || null;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.iconContainer}>
        <Ionicons name="storefront-outline" size={34} color={COLORS.primary} />
      </View>

      <View style={styles.cardInfo}>
        <View style={styles.headerRow}>
          <Text style={styles.storeName}>{store?.name || 'متجر'}</Text>
          {discount && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{discount}</Text>
            </View>
          )}
        </View>

        <Text style={styles.categoryText}>{category}</Text>

        <View style={styles.metaRow}>
          <View style={styles.metaPill}>
            <Ionicons name="time-outline" size={12} color={COLORS.textSecondary} />
            <Text style={styles.metaText}>{deliveryTime}</Text>
          </View>

          <View style={styles.metaPill}>
            <Ionicons name="location-outline" size={12} color={COLORS.textSecondary} />
            <Text style={styles.metaText}>{distance}</Text>
          </View>

          {rating > 0 && (
            <View style={styles.metaPillHighlight}>
              <Ionicons name="star" size={12} color="#F59E0B" />
              <Text style={styles.metaTextHighlight}>{rating.toFixed(1)}</Text>
            </View>
          )}
        </View>

        <View style={styles.footerRow}>
          <Text style={[styles.storeStatus, store?.isOpen ? styles.open : styles.closed]}>
            {store?.isOpen ? 'مفتوح الآن' : 'مغلق'}
          </Text>
          <Ionicons name="chevron-forward" size={22} color={COLORS.textSecondary} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  iconContainer: {
    width: 62,
    height: 62,
    borderRadius: 18,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  storeName: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
    flex: 1,
  },
  discountBadge: {
    backgroundColor: '#FEE2E2',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  discountText: {
    color: '#B91C1C',
    fontSize: 10,
    fontWeight: '800',
  },
  categoryText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  metaPillHighlight: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  metaTextHighlight: {
    fontSize: 11,
    color: '#F59E0B',
    fontWeight: '800',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  storeStatus: {
    fontSize: 12,
    fontWeight: '800',
  },
  open: {
    color: COLORS.success,
  },
  closed: {
    color: COLORS.error,
  },
});

export default StoreCard;