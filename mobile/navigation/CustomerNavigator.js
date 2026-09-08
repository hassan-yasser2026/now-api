import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import CustomerHome from '../screens/customer/CustomerHome';
import StoreMenu from '../screens/customer/StoreMenu';
import OrdersScreen from '../screens/customer/OrdersScreen';
import FavoritesScreen from '../screens/customer/FavoritesScreen';
import SettingsScreen from '../screens/customer/SettingsScreen';
import OrderConfirmation from '../screens/customer/OrderConfirmation';
import OrderTracking from '../screens/customer/OrderTracking';
import CustomerProfile from '../screens/customer/CustomerProfile';
import AssistantScreen from '../screens/customer/AssisantScreen';
import CartScreen from '../screens/customer/CartScreen';
import DeliverySchedule from '../screens/customer/DeliverySchedule';
import AboutScreen from '../screens/auth/AboutScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import AccountSettingsScreen from '../screens/customer/AccountSettingsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const CustomerTabs = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarStyle: { height: 68, paddingBottom: 8, paddingTop: 8 },
    }}
  >
    <Tab.Screen
      name="CustomerHome"
      component={CustomerHome}
      options={{
        tabBarLabel: 'الرئيسية',
        tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
      }}
    />
    <Tab.Screen
      name="Orders"
      component={OrdersScreen}
      options={{
        tabBarLabel: 'الطلبات',
        tabBarIcon: ({ color, size }) => <Ionicons name="receipt-outline" size={size} color={color} />,
      }}
    />
    <Tab.Screen
      name="Favorites"
      component={FavoritesScreen}
      options={{
        tabBarLabel: 'المفضلة',
        tabBarIcon: ({ color, size }) => <Ionicons name="heart-outline" size={size} color={color} />,
      }}
    />
    <Tab.Screen
      name="Assistant"
      component={AssistantScreen}
      options={{
        tabBarLabel: 'المساعد',
        tabBarIcon: ({ color, size }) => <Ionicons name="chatbubble-ellipses-outline" size={size} color={color} />,
      }}
    />
    <Tab.Screen
      name="CustomerProfile"
      component={CustomerProfile}
      options={{
        tabBarLabel: 'حسابي',
        tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
      }}
    />
    <Tab.Screen
      name="About"
      component={AboutScreen}
      options={{
        tabBarLabel: 'حول التطبيق',
        tabBarIcon: ({ color, size }) => <Ionicons name="information-circle-outline" size={size} color={color} />,
      }}
    />
  </Tab.Navigator>
);

const CustomerNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="CustomerTabs" component={CustomerTabs} />
    <Stack.Screen name="StoreMenu" component={StoreMenu} />
    <Stack.Screen name="Cart" component={CartScreen} />
    <Stack.Screen name="DeliverySchedule" component={DeliverySchedule} />
    <Stack.Screen name="OrderConfirmation" component={OrderConfirmation} />
    <Stack.Screen name="OrderTracking" component={OrderTracking} />
    <Stack.Screen name="Settings" component={SettingsScreen} />
    <Stack.Screen name="AccountSettings" component={AccountSettingsScreen} />
    <Stack.Screen name="About" component={AboutScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
  </Stack.Navigator>
);

export default CustomerNavigator;