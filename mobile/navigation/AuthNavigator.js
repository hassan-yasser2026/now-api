import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import AboutScreen from '../screens/auth/AboutScreen';
import CustomerHome from '../screens/customer/CustomerHome';
import StoreMenu from '../screens/customer/StoreMenu';
import SearchScreen from '../screens/customer/SearchScreen';
import GuestAccountScreen from '../screens/customer/GuestAccountScreen';

const Stack = createNativeStackNavigator();

const AuthNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="GuestHome"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="PartnerLogin" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="About" component={AboutScreen} />
      <Stack.Screen name="GuestHome" component={CustomerHome} />
      <Stack.Screen name="StoreMenu" component={StoreMenu} />
      <Stack.Screen name="Search" component={SearchScreen} />
      <Stack.Screen name="GuestAccount" component={GuestAccountScreen} />
    </Stack.Navigator>
  );
};

export default AuthNavigator;