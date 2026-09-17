import React, { useCallback, useMemo } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import useAppStore from '../../store/appStore';

const ProductDetails = ({ route, navigation }) => {
  const item = route.params?.item || {};
  const addToCart = useAppStore((state) => state.addToCart);
  const isAvailable = item.isAvailable !== false;
  const ratingCount = Number(item.ratingsCount ?? item.ratingCount ?? 0);
  const averageRating = Number(item.averageRating ?? item.ratingAverage ?? 0);
  const hasDiscount = Number(item.discountValue || 0) > 0 && Number(item.originalPrice) > Number(item.price);
  const imageUri = item.image || item.img;

  const handleAdd = useCallback(async () => {
    if (!isAvailable) {
      Alert.alert('تنبيه', 'هذا المنتج غير متاح حاليًا');
      return;
    }
    const result = await addToCart(item, item.storeId);
    if (result?.conflict) {
      Alert.alert('متجر مختلف', 'يمكنك إضافة منتجات من متجر واحد فقط في الطلب.');
      return;
    }
    Alert.alert('تمت الإضافة', 'تمت إضافة المنتج إلى السلة');
  }, [addToCart, isAvailable, item]);

  const price = useMemo(() => Number(item.price || 0).toFixed(2), [item.price]);
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-forward" size={26} color={COLORS.textPrimary} />
      </TouchableOpacity>
      {imageUri ? <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" /> : (
        <View style={[styles.image, styles.placeholder]}><Ionicons name="image-outline" size={56} color="#94A3B8" /></View>
      )}
      <Text style={styles.name}>{item.name || 'منتج'}</Text>
      <Text style={styles.description}>{item.description || 'لا يوجد وصف لهذا المنتج.'}</Text>
      <View style={styles.rating}>
        {ratingCount > 0 ? <Text style={styles.ratingText}>⭐ {averageRating.toFixed(1)} ({ratingCount} تقييم)</Text> : <Text style={styles.muted}>لا توجد تقييمات بعد</Text>}
      </View>
      {ratingCount > 0 && Array.isArray(item.ratingDetails) ? (
        <View style={styles.reviews}>
          {item.ratingDetails.map((review, index) => (
            <View key={`${review.createdAt || 'review'}-${index}`} style={styles.review}>
              <Text style={styles.reviewStars}>⭐ {review.stars}/5</Text>
              {review.comment ? <Text style={styles.reviewComment}>{review.comment}</Text> : null}
            </View>
          ))}
        </View>
      ) : null}
      <View style={styles.priceRow}>
        <Text style={styles.price}>{price} ج.م</Text>
        {hasDiscount ? <Text style={styles.original}>{Number(item.originalPrice).toFixed(2)} ج.م</Text> : null}
      </View>
      {hasDiscount ? <Text style={styles.discount}>خصم {item.discountPercentage ? `${item.discountPercentage}%` : `${Number(item.discountValue).toFixed(2)} ج.م`}</Text> : null}
      <Text style={[styles.availability, !isAvailable && styles.unavailable]}>{isAvailable ? 'متاح' : 'غير متاح'}</Text>
      <TouchableOpacity disabled={!isAvailable} style={[styles.addButton, !isAvailable && styles.disabled]} onPress={handleAdd}>
        <Text style={styles.addText}>{isAvailable ? 'إضافة للسلة' : 'غير متاح للإضافة'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 36 },
  back: { alignSelf: 'flex-end', padding: 8 },
  image: { width: '100%', height: 280, borderRadius: 20, backgroundColor: '#F1F5F9' },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 24, fontWeight: '900', color: COLORS.textPrimary, textAlign: 'right', marginTop: 18 },
  description: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'right', marginTop: 10, lineHeight: 24 },
  rating: { alignItems: 'flex-end', marginTop: 16 },
  ratingText: { color: '#B45309', fontWeight: '800' },
  muted: { color: '#64748B' },
  reviews: { marginTop: 16, gap: 8 },
  review: { backgroundColor: '#fff', borderRadius: 12, padding: 12 },
  reviewStars: { color: '#B45309', fontWeight: '800', textAlign: 'right' },
  reviewComment: { color: COLORS.textSecondary, textAlign: 'right', marginTop: 5 },
  priceRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginTop: 18 },
  price: { fontSize: 24, fontWeight: '900', color: COLORS.primary },
  original: { fontSize: 15, color: '#64748B', textDecorationLine: 'line-through' },
  discount: { color: '#B91C1C', fontWeight: '800', textAlign: 'right', marginTop: 6 },
  availability: { color: '#15803D', fontWeight: '800', textAlign: 'right', marginTop: 8 },
  unavailable: { color: '#B91C1C' },
  addButton: { backgroundColor: COLORS.primary, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 24 },
  disabled: { backgroundColor: '#94A3B8' },
  addText: { color: '#fff', fontSize: 17, fontWeight: '900' },
});

export default ProductDetails;
// مسودة المشروع - البشمهندس حسن ياسر
