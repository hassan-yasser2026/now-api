import { Platform } from 'react-native';
import * as Location from 'expo-location';

export const getCurrentLocation = async () => {
  if (Platform.OS === 'web') {
    if (!navigator.geolocation) {
      throw new Error('المتصفح لا يدعم تحديد الموقع');
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) =>
          resolve({
            latitude: coords.latitude,
            longitude: coords.longitude,
          }),
        (error) => {
          const messages = {
            1: 'اسمح للموقع من إعدادات المتصفح ثم حاول مرة أخرى',
            2: 'تعذر تحديد موقعك الحالي',
            3: 'انتهت مهلة تحديد الموقع، حاول مرة أخرى',
          };
          reject(new Error(messages[error.code] || 'تعذر تحديد موقعك الحالي'));
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000,
        }
      );
    });
  }

  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== 'granted') {
    throw new Error('اسمح للتطبيق بالوصول إلى الموقع من إعدادات الجهاز');
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  };
};
// مسودة المشروع - البشمهندس حسن ياسر
