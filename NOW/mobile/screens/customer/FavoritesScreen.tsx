import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { storeService } from '../../services/storeService';

const FAVORITES_KEY = 'now_favorite_stores';

type Navigation = {
  navigate: (screen: string, params?: Record<string, unknown>) => void;
};

type Store = {
  id: number | string;
  name: string;
  category?: string;
  type?: string;
  rating?: number;
  deliveryTime?: string;
};

type FavoritesScreenProps = {
  navigation: Navigation;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  return error instanceof Error ? error.message : fallback;
};

const FavoritesScreen = ({ navigation }: FavoritesScreenProps) => {
  const [favoriteStores, setFavoriteStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadFavorites = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const raw = await AsyncStorage.getItem(FAVORITES_KEY);
      const favoriteIds: string[] = raw ? JSON.parse(raw) : [];

      if (!favoriteIds.length) {
        setFavoriteStores([]);
        return;
      }

      const result = await storeService.getStores();
      if (!result.success) {
        throw new Error(result.message || 'فشل تحميل المتاجر');
      }

      const stores: Store[] = Array.isArray(result.stores) ? result.stores : [];
      const filtered = stores.filter((store) => favoriteIds.includes(String(store.id)));
      setFavoriteStores(filtered);
    } catch (err: unknown) {
      console.error('FavoritesScreen load error:', err);
      setError(getErrorMessage(err, 'فشل جلب المفضلة'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const toggleFavorite = useCallback(async (storeId: Store['id']) => {
    try {
      const raw = await AsyncStorage.getItem(FAVORITES_KEY);
      const current: string[] = raw ? JSON.parse(raw) : [];
      const next = current.includes(String(storeId))
        ? current.filter((id) => String(id) !== String(storeId))
        : [...current, String(storeId)];

      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      loadFavorites();
    } catch {
      Alert.alert('تنبيه', 'تعذر تحديث المفضلة');
    }
  }, [loadFavorites]);

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>جاري تحميل المفضلة...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={50} color={COLORS.error} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadFavorites}>
          <Text style={styles.retryText}>إعادة المحاولة</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>المفضلة</Text>
      </View>

      {favoriteStores.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="heart-outline" size={52} color={COLORS.inactive} />
          <Text style={styles.emptyText}>لا توجد متاجر مفضلة</Text>
          <TouchableOpacity style={styles.emptyButton} onPress={() => navigation.navigate('Search')}>
            <Text style={styles.emptyButtonText}>استكشاف المتاجر</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={favoriteStores}
          contentContainerStyle={styles.list}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.storeCard} onPress={() => navigation.navigate('StoreMenu', { storeId: item.id, storeName: item.name })} activeOpacity={0.9}>
              <View style={styles.cardRow}>
                <View style={styles.storeIcon}>
                  <Ionicons name="storefront-outline" size={24} color={COLORS.primary} />
                </View>

                <View style={styles.cardContent}>
                  <Text style={styles.storeName}>{item.name}</Text>
                  <Text style={styles.metaText}>{item.category || item.type || 'متجر'} </Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaChip}>⭐ {Number(item.rating || 4.5).toFixed(1)}</Text>
                    <Text style={styles.metaChip}>⏱ {item.deliveryTime || '25-35 دقيقة'}</Text>
                  </View>
                </View>

                <TouchableOpacity onPress={() => toggleFavorite(item.id)} style={styles.favoriteBtn}>
                  <Ionicons name="heart" size={20} color="#E11D48" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: COLORS.textPrimary },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  storeCard: { backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, padding: 14, marginBottom: 12 },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  storeIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  cardContent: { flex: 1 },
  storeName: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary },
  metaText: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  metaRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  metaChip: { fontSize: 11, color: COLORS.textSecondary, backgroundColor: '#F8FAFC', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, overflow: 'hidden' },
  favoriteBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#fff5f7', alignItems: 'center', justifyContent: 'center' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  emptyText: { fontSize: 18, fontWeight: '700', color: COLORS.textSecondary, marginTop: 16 },
  emptyButton: { marginTop: 18, backgroundColor: COLORS.primary, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 12 },
  emptyButtonText: { color: '#fff', fontWeight: '800' },
  retryButton: { marginTop: 18, backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12 },
  retryText: { color: '#fff', fontWeight: '700' },
  errorText: { fontSize: 16, color: COLORS.error, marginTop: 12, textAlign: 'center' },
  loadingText: { marginTop: 12, color: COLORS.textSecondary, fontWeight: '700' },
});

export default FavoritesScreen;
