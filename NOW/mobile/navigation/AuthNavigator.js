import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import AboutScreen from '../screens/auth/AboutScreen';
import CustomerHome from '../screens/customer/CustomerHome';

const Stack = createNativeStackNavigator();

const AuthNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="About" component={AboutScreen} />
      <Stack.Screen name="GuestHome" component={CustomerHome} />
    </Stack.Navigator>
  );
};

export default AuthNavigator;