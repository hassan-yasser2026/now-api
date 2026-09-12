import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import PartnerRegistrationScreen from '../screens/auth/PartnerRegistrationScreen';
import PartnerEntryScreen from '../screens/auth/PartnerEntryScreen';
import AboutScreen from '../screens/auth/AboutScreen';
import CustomerHome from '../screens/customer/CustomerHome';
import StoreMenu from '../screens/customer/StoreMenu';
import SearchScreen from '../screens/customer/SearchScreen';
import SettingsScreen from '../screens/customer/SettingsScreen';
import DeliverySchedule from '../screens/customer/DeliverySchedule';
import VerifyPhoneScreen from '../screens/auth/VerifyPhoneScreen';

const Stack = createNativeStackNavigator();

const AuthNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="GuestHome"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="PartnerLogin" component={LoginScreen} />
      <Stack.Screen name="PartnerEntry" component={PartnerEntryScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="VerifyPhone" component={VerifyPhoneScreen} />
      <Stack.Screen name="PartnerRegistration" component={PartnerRegistrationScreen} />
      <Stack.Screen name="About" component={AboutScreen} />
      <Stack.Screen name="GuestHome" component={CustomerHome} />
      <Stack.Screen name="StoreMenu" component={StoreMenu} />
      <Stack.Screen name="Search" component={SearchScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="DeliverySchedule" component={DeliverySchedule} />
    </Stack.Navigator>
  );
};

export default AuthNavigator;