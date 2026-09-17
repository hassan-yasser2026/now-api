import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';

const Stack = createNativeStackNavigator();

const SubAdminNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="SubAdminDashboard" component={AdminDashboardScreen} />
  </Stack.Navigator>
);

export default SubAdminNavigator;
// مسودة المشروع - البشمهندس حسن ياسر
