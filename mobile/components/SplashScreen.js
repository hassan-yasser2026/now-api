import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import colors from '../constants/colors';

export default function SplashScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.brand}>ناو</Text>
      <ActivityIndicator size="small" color={colors.white} style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    color: colors.white,
    fontSize: 48,
    fontWeight: '900',
    textAlign: 'center',
  },
  spinner: {
    marginTop: 20,
  },
});