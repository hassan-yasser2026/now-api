import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS } from '../constants/colors';
import { getCountry, getCountryName } from '../constants/countries';
import useAppStore from '../store/appStore';
import CountryPickerModal from './CountryPickerModal';

const LANGUAGE_OPTIONS = [
  { code: 'ar', label: 'العربية', hint: 'اللغة العربية', short: 'ع' },
  { code: 'en', label: 'English', hint: 'الإنجليزية', short: 'EN' },
];

/**
 * App-wide language and region control.
 *
 * Rendered once at the app shell, above every navigator, so it is reachable
 * from outside all panels — auth, customer, vendor, delivery and admin —
 * instead of being buried inside one settings screen.
 */
const GlobalLanguageButton = () => {
  const insets = useSafeAreaInsets();

  const language = useAppStore((state) => state.language);
  const country = useAppStore((state) => state.country);
  const setLanguage = useAppStore((state) => state.setLanguage);
  const setCountry = useAppStore((state) => state.setCountry);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);

  const activeCountry = getCountry(country);
  const activeLanguage =
    LANGUAGE_OPTIONS.find((option) => option.code === language) ||
    LANGUAGE_OPTIONS[0];

  const handleLanguage = async (code) => {
    if (code !== language) {
      await setLanguage(code);
    }
    setSheetOpen(false);
  };

  return (
    <>
      <View
        pointerEvents="box-none"
        style={[styles.layer, { top: insets.top + 8 }]}
      >
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="اللغة"
          style={styles.fab}
          activeOpacity={0.85}
          onPress={() => setSheetOpen(true)}
        >
          <Ionicons name="language" size={16} color={COLORS.white} />
          <Text style={styles.fabLabel}>{activeLanguage.short}</Text>
          <Text style={styles.fabFlag}>{activeCountry.flag}</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={sheetOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSheetOpen(false)}
      >
        <View style={styles.backdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setSheetOpen(false)}
          />

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>اللغة والدولة</Text>
              <TouchableOpacity onPress={() => setSheetOpen(false)}>
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionLabel}>اللغة</Text>
            {LANGUAGE_OPTIONS.map((option) => {
              const isActive = option.code === language;

              return (
                <TouchableOpacity
                  key={option.code}
                  style={[styles.option, isActive && styles.optionActive]}
                  onPress={() => handleLanguage(option.code)}
                >
                  <View style={styles.optionBadge}>
                    <Text style={styles.optionBadgeText}>{option.short}</Text>
                  </View>
                  <Text style={styles.optionLabel}>{option.label}</Text>
                  {isActive && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={COLORS.primary}
                    />
                  )}
                </TouchableOpacity>
              );
            })}

            <Text style={styles.sectionLabel}>الدولة</Text>
            <TouchableOpacity
              style={styles.option}
              onPress={() => setCountryPickerOpen(true)}
            >
              <Text style={styles.optionFlag}>{activeCountry.flag}</Text>
              <Text style={styles.optionLabel}>
                {getCountryName(activeCountry, language)}
              </Text>
              <Text style={styles.optionDial}>{`+${activeCountry.dial}`}</Text>
              <Ionicons
                name="chevron-down"
                size={18}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>

            <Text style={styles.note}>
              يتم تطبيق اللغة على جميع اللوحات، وتُستخدم الدولة كرمز افتراضي لأرقام الهاتف.
            </Text>
          </View>
        </View>
      </Modal>

      <CountryPickerModal
        visible={countryPickerOpen}
        selectedCode={activeCountry.code}
        onSelect={(next) => setCountry(next.code)}
        onClose={() => setCountryPickerOpen(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: 0,
    right: 12,
    left: 0,
    alignItems: 'flex-end',
    zIndex: 999,
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    width: 52,
    height: 34,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 17,
    backgroundColor: COLORS.primary,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  fabLabel: { color: COLORS.white, fontSize: 9, fontWeight: '800' },
  fabFlag: { fontSize: 10 },

  backdrop: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  sectionLabel: {
    marginTop: 12,
    marginBottom: 6,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
  },
  optionActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  optionBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  optionBadgeText: { fontSize: 12, fontWeight: '800', color: COLORS.primary },
  optionFlag: { fontSize: 22 },
  optionLabel: { flex: 1, fontSize: 15, color: COLORS.textPrimary },
  optionDial: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  note: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textSecondary,
  },
});

export default GlobalLanguageButton;
