import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { COLORS } from '../constants/colors';
import { getCountry } from '../constants/countries';
import useAppStore from '../store/appStore';
import { isValidNationalNumber, toE164, toWesternDigits } from '../utils/validation';
import CountryPickerModal from './CountryPickerModal';

/**
 * Phone field with a country selector.
 *
 * `onChange` receives `{ national, countryCode, e164, isValid }` so callers
 * can submit an E.164 number regardless of how the user typed it.
 */
const PhoneInput = ({
  value = '',
  countryCode,
  onChange,
  onCountryChange,
  error,
  editable = true,
  style,
}) => {
  const storeCountry = useAppStore((state) => state.country);
  const setStoreCountry = useAppStore((state) => state.setCountry);

  const [pickerOpen, setPickerOpen] = useState(false);

  const country = getCountry(countryCode || storeCountry);

  const helper = useMemo(
    () => `${country.flag}  +${country.dial} · ${country.example}`,
    [country]
  );

  const emit = (nextNational, nextCountry) => {
    const national = toWesternDigits(nextNational).replace(/\D/g, '');

    onChange?.({
      national,
      countryCode: nextCountry.code,
      e164: toE164(national, nextCountry.code),
      isValid: isValidNationalNumber(national, nextCountry.code),
    });
  };

  const handleCountry = (nextCountry) => {
    setStoreCountry(nextCountry.code);
    onCountryChange?.(nextCountry.code);
    emit(value, nextCountry);
  };

  return (
    <View style={style}>
      <View style={[styles.container, error && styles.containerError]}>
        <TouchableOpacity
          style={styles.countryButton}
          onPress={() => editable && setPickerOpen(true)}
          disabled={!editable}
        >
          <Text style={styles.flag}>{country.flag}</Text>
          <Text style={styles.dial}>{`+${country.dial}`}</Text>
          <Ionicons name="chevron-down" size={14} color={COLORS.textSecondary} />
        </TouchableOpacity>

        <View style={styles.divider} />

        <TextInput
          style={styles.input}
          value={value}
          onChangeText={(text) => emit(text, country)}
          placeholder={country.example}
          placeholderTextColor={COLORS.textLight}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
          editable={editable}
          maxLength={country.max + 2}
        />
      </View>

      <Text style={error ? styles.errorText : styles.helperText}>
        {error || helper}
      </Text>

      <CountryPickerModal
        visible={pickerOpen}
        selectedCode={country.code}
        onSelect={handleCountry}
        onClose={() => setPickerOpen(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
  },
  containerError: { borderColor: COLORS.error },
  countryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  flag: { fontSize: 20 },
  dial: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  divider: {
    width: 1,
    height: 22,
    marginHorizontal: 8,
    backgroundColor: COLORS.border,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.textPrimary,
    textAlign: 'left',
    writingDirection: 'ltr',
  },
  helperText: {
    marginTop: 6,
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'left',
  },
  errorText: {
    marginTop: 6,
    fontSize: 12,
    color: COLORS.error,
    textAlign: 'left',
  },
});

export default PhoneInput;
