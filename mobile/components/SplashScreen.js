import React from 'react';
import { View, Text, Image, ActivityIndicator, StyleSheet } from 'react-native';

export default function SplashScreen() {
  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/images/goody-star-splash.png')}
        style={styles.logo}
        resizeMode="contain"
        accessibilityLabel="Goody Star"
      />
      <Text style={styles.brandAr}>چودي ستار</Text>
      <Text style={styles.brandEn}>Goody Star</Text>
      <ActivityIndicator size="small" color="#126B57" style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F7F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 144,
    height: 144,
    marginBottom: 12,
  },
  brandAr: {
    color: '#126B57',
    fontSize: 42,
    fontWeight: '900',
    textAlign: 'center',
  },
  brandEn: {
    color: '#126B57',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: 2,
    textAlign: 'center',
  },
  spinner: {
    marginTop: 20,
  },
});
// مسودة المشروع - البشمهندس حسن ياسر