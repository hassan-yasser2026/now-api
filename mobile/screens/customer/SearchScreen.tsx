import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
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
  description?: string;
  category?: string;
  type?: string;
  rating?: number;
  deliveryTime?: string;
  deliveryFee?: number;
  isOpen?: boolean;
};

type SearchScreenProps = {
  navigation: Navigation;
};

const SearchScreen = ({ navigation }: SearchScreenProps) => {
  const [stores, setStores] = useState<Store[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [filterOpenOnly, setFilterOpenOnly] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const loadFavorites = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(FAVORITES_KEY);
      setFavorites(raw ? JSON.parse(raw) as string[] : []);
    } catch {
      setFavorites([]);
    }
  }, []);

  const loadStores = useCallback(async () => {
    setLoading(true);
    try {
      const result = await storeService.getStores();
      if (result.success) {
        setStores(Array.isArray(result.stores) ? result.stores as Store[] : []);
      } else {
        setStores([]);
        Alert.alert('خطأ', result.message || 'فشل تحميل المتاجر');
      }
    } catch (error) {
      setStores([]);
      Alert.alert('خطأ', 'تعذر الاتصال بالسيرفر');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFavorites();
    loadStores();
  }, [loadFavorites, loadStores]);

  const categories = useMemo(() => {
    const categorySet = new Set<string>();
    stores.forEach((store) => {
      const category = store.category || store.type || 'عام';
      categorySet.add(category);
    });
    return ['all', ...Array.from(categorySet)];
  }, [stores]);

  const filteredStores = useMemo(() => {
    const search = query.trim().toLowerCase();

    return stores.filter((store) => {
      const storeName = String(store.name || '').toLowerCase();
      const storeDescription = String(store.description || '').toLowerCase();
      const category = String(store.category || store.type || 'عام').toLowerCase();
      const matchesQuery = !search || storeName.includes(search) || storeDescription.includes(search) || category.includes(search);
      const matchesOpen = !filterOpenOnly || store.isOpen === true;
      const matchesCategory = selectedCategory === 'all' || category === selectedCategory.toLowerCase();
      return matchesQuery && matchesOpen && matchesCategory;
    });
  }, [stores, query, filterOpenOnly, selectedCategory]);

  const toggleFavorite = useCallback(async (storeId: Store['id']) => {
    const nextFavorites = favorites.includes(String(storeId))
      ? favorites.filter((id) => String(id) !== String(storeId))
      : [...favorites, String(storeId)];

    setFavorites(nextFavorites);
    try {
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(nextFavorites));
    } catch {
      Alert.alert('تنبيه', 'تعذر حفظ المفضلة في هذا الجهاز');
    }
  }, [favorites]);

  const renderStoreItem = ({ item }: { item: Store }) => {
    const isFavorite = favorites.includes(String(item.id));

    return (
      <TouchableOpacity style={styles.resultCard} onPress={() => navigation.navigate('StoreMenu', { storeId: item.id, storeName: item.name })} activeOpacity={0.9}>
        <View style={styles.cardHeader}>
          <View style={styles.storeBadge}>
            <Ionicons name="storefront-outline" size={18} color={COLORS.primary} />
          </View>
          <View style={styles.cardTextWrap}>
            <Text style={styles.storeName}>{item.name}</Text>
            <Text style={styles.categoryText}>{item.category || item.type || 'متجر'} </Text>
          </View>
          <TouchableOpacity onPress={() => toggleFavorite(item.id)} style={styles.favoriteBtn}>
            <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={20} color={isFavorite ? '#E11D48' : COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaPill}>
            <Ionicons name="star" size={12} color="#F59E0B" />
            <Text style={styles.metaText}>{Number(item.rating || 4.5).toFixed(1)}</Text>
          </View>
          <View style={styles.metaPill}>
            <Ionicons name="time-outline" size={12} color={COLORS.textSecondary} />
            <Text style={styles.metaText}>{item.deliveryTime || '25-35 دقيقة'}</Text>
          </View>
          <View style={styles.metaPill}>
            <Ionicons name="bicycle-outline" size={12} color={COLORS.textSecondary} />
            <Text style={styles.metaText}>{item.deliveryFee || 20} ج.م</Text>
          </View>
        </View>

        <View style={styles.footerRow}>
          <Text style={[styles.statusText, item.isOpen ? styles.openText : styles.closedText]}>
            {item.isOpen ? 'مفتوح الآن' : 'مغلق'}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>جاري البحث عن المتاجر...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={22} color={COLORS.textSecondary} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="ابحث عن متجر أو فئة أو منتج"
          placeholderTextColor={COLORS.textLight}
        />
      </View>

      <View style={styles.filterRow}>
        <TouchableOpacity style={[styles.filterChip, !filterOpenOnly && styles.filterChipActive]} onPress={() => setFilterOpenOnly(false)}>
          <Text style={[styles.filterChipText, !filterOpenOnly && styles.filterChipTextActive]}>الكل</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.filterChip, filterOpenOnly && styles.filterChipActive]} onPress={() => setFilterOpenOnly(true)}>
          <Text style={[styles.filterChipText, filterOpenOnly && styles.filterChipTextActive]}>مفتوح الآن</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={categories}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesList}
        keyExtractor={(item) => String(item)}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.categoryChip, selectedCategory === item && styles.categoryChipActive]}
            onPress={() => setSelectedCategory(item)}
          >
            <Text style={[styles.categoryChipText, selectedCategory === item && styles.categoryChipTextActive]}>
              {item === 'all' ? 'الكل' : item}
            </Text>
          </TouchableOpacity>
        )}
      />

      {filteredStores.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={48} color={COLORS.inactive} />
          <Text style={styles.emptyText}>لا توجد نتائج مطابقة للبحث</Text>
        </View>
      ) : (
        <FlatList
          data={filteredStores}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={renderStoreItem}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, paddingTop: 8 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  loadingText: { marginTop: 12, color: COLORS.textSecondary, fontWeight: '700' },
  searchBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, height: 54, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12 },
  searchInput: { flex: 1, marginLeft: 10, color: COLORS.textPrimary, fontSize: 15 },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  filterChip: { backgroundColor: '#fff', borderRadius: 999, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 16, paddingVertical: 8 },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterChipText: { color: COLORS.textSecondary, fontWeight: '700' },
  filterChipTextActive: { color: '#fff' },
  categoriesList: { paddingHorizontal: 16, paddingBottom: 8 },
  categoryChip: { backgroundColor: '#fff', borderRadius: 999, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8 },
  categoryChipActive: { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primary },
  categoryChipText: { color: COLORS.textSecondary, fontWeight: '700' },
  categoryChipTextActive: { color: COLORS.primary },
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 },
  resultCard: { backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, padding: 14, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  storeBadge: { width: 42, height: 42, borderRadius: 14, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  cardTextWrap: { flex: 1 },
  storeName: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary },
  categoryText: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  favoriteBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#fff5f7', alignItems: 'center', justifyContent: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  metaPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5, gap: 4 },
  metaText: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusText: { fontSize: 12, fontWeight: '800' },
  openText: { color: COLORS.success },
  closedText: { color: COLORS.error },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  emptyText: { marginTop: 12, color: COLORS.textSecondary, fontSize: 15, fontWeight: '700' },
});

export default SearchScreen;
