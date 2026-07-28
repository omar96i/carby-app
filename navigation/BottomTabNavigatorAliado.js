import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import TerceroStackNavigator from './StackNavigatorAliado';
import Pedidos from '../screens/comercio/Pedidos';
import Perfil from '../screens/Perfil';
import Wallet from '../screens/Delivery/Wallet';
const BottomTab = createBottomTabNavigator();

const TabIcon = ({ name, focused }) => (
  <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 6 }}>
    <MaterialCommunityIcons name={name} color={focused ? '#fa6205' : '#999'} size={22} />
    {focused && <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#fa6205', marginTop: 3 }} />}
  </View>
);

export default function BottomTabNavigatorAliado() {
  return (
    <BottomTab.Navigator
      initialRouteName="Home"
      screenOptions={{
        tabBarActiveTintColor: '#fa6205',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: { backgroundColor: '#FFF', height: 56, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
        tabBarShowLabel: false,
      }}>
      <BottomTab.Screen name="Home" component={TerceroStackNavigator}
        options={{ headerShown: false, tabBarIcon: ({ focused }) => <TabIcon name="home-outline" focused={focused} /> }} />
      <BottomTab.Screen name="Pedidos" component={Pedidos}
        options={{ headerShown: false, tabBarIcon: ({ focused }) => <TabIcon name="ticket-confirmation" focused={focused} /> }} />
      <BottomTab.Screen name="Wallet" component={Wallet}
        options={{ headerShown: false, tabBarIcon: ({ focused }) => <TabIcon name="wallet-plus" focused={focused} /> }} />
      <BottomTab.Screen name="Perfil" component={Perfil}
        options={{ headerShown: false, tabBarIcon: ({ focused }) => <TabIcon name="account-circle-outline" focused={focused} /> }} />
    </BottomTab.Navigator>
  );
}
