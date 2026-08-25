import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { COLORS } from '../constants/colors';
import { getCountryName, searchCountries } from '../constants/countries';
import useAppStore from '../store/appStore';

/**
 * Searchable country list used by the phone input and the language sheet.
 */
const CountryPickerModal = ({ visible, selectedCode, onSelect, onClose }) => {
  const language = useAppStore((state) => state.language);
  const [query, setQuery] = useState('');

  const countries = useMemo(
    () => searchCountries(query, language),
    [query, language]
  );

  const handleSelect = (country) => {
    onSelect?.(country);
    setQuery('');
    onClose?.();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTouchable} onPress={onClose} />

        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.title}>اختر الدولة</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={COLORS.textSecondary} />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="ابحث عن دولة أو رمز"
              placeholderTextColor={COLORS.textLight}
              autoCorrect={false}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={countries}
            keyExtractor={(country) => country.code}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <Text style={styles.empty}>لا توجد نتائج</Text>
            }
            renderItem={({ item }) => {
              const isSelected = item.code === selectedCode;

              return (
                <TouchableOpacity
                  style={[styles.row, isSelected && styles.rowSelected]}
                  onPress={() => handleSelect(item)}
                >
                  <Text style={styles.flag}>{item.flag}</Text>
                  <Text style={styles.countryName} numberOfLines={1}>
                    {getCountryName(item, language)}
                  </Text>
                  <Text style={styles.dial}>{`+${item.dial}`}</Text>
                  {isSelected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={COLORS.primary}
                    />
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  backdropTouchable: { flex: 1 },
  sheet: {
    maxHeight: '80%',
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 24,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  closeButton: { padding: 4 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  rowSelected: { backgroundColor: COLORS.primaryLight },
  flag: { fontSize: 22 },
  countryName: { flex: 1, fontSize: 15, color: COLORS.textPrimary },
  dial: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  empty: {
    textAlign: 'center',
    paddingVertical: 32,
    color: COLORS.textSecondary,
  },
});

export default CountryPickerModal;
