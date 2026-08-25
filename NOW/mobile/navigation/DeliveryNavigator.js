import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// شاشات المندوب
import DeliveryDashboard from '../screens/delivery/DeliveryDashboard';
import DeliveryOrders from '../screens/delivery/DeliveryOrders';
 import DeliveryOrderDetails from '../screens/delivery/DeliveryOrderDetails'; // شاشة تفاصيل الطلب 
import DeliveryEarnings from '../screens/delivery/DeliveryEarnings'; // شاشة الأرباح
import DeliveryProfile from '../screens/delivery/DeliveryProfile';
import AboutScreen from '../screens/auth/AboutScreen';

const Stack = createNativeStackNavigator();

const DeliveryNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="DeliveryDashboard"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="DeliveryDashboard" component={DeliveryDashboard} />
      <Stack.Screen name="DeliveryOrders" component={DeliveryOrders} />
      <Stack.Screen name="DeliveryOrderDetails" component={DeliveryOrderDetails} />
      <Stack.Screen name="DeliveryEarnings" component={DeliveryEarnings} />
      <Stack.Screen name="DeliveryProfile" component={DeliveryProfile} />
      <Stack.Screen name="About" component={AboutScreen} />
    </Stack.Navigator>
  );
};

export default DeliveryNavigator;