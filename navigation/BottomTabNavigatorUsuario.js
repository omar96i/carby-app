import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, Text } from 'react-native';
import StackNavigatorUsuario from "./StackNavigatorUsuario";
import Pedidos from "../screens/Pedidos";
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PerfilUsuario from "../screens/User/PerfilUsuer";
import Cart from "../screens/Delivery/Cart";

const BottomTab = createBottomTabNavigator();

const TabIcon = ({ name, focused, color = '#fa6205', iconFamily = 'MaterialCommunityIcons', hasBadge, badgeCount }) => (
  <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 6 }}>
    {iconFamily === 'FontAwesome5' ? (
      <FontAwesome5 name={name} color={focused ? color : '#999'} size={22} />
    ) : (
      <MaterialCommunityIcons name={name} color={focused ? color : '#999'} size={22} />
    )}
    {hasBadge && badgeCount > 0 && (
      <View style={{
        position: 'absolute', top: 0, right: -10,
        backgroundColor: '#FF3B30', borderRadius: 9,
        minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center',
        paddingHorizontal: 4,
      }}>
        <Text style={{ color: '#FFF', fontSize: 10, fontWeight: 'bold' }}>
          {badgeCount <= 99 ? badgeCount : '99+'}
        </Text>
      </View>
    )}
    {focused && <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: color, marginTop: 3 }} />}
  </View>
);

export default function BottomTabNavigatorUsuario() {
  const [cartItemCount, setCartItemCount] = useState(0);

  useEffect(() => {
    const getCartItemCount = async () => {
      try {
        const cartData = await AsyncStorage.getItem('cart');
        if (cartData) {
          const parsedCart = JSON.parse(cartData);
          setCartItemCount(parsedCart.reduce((total, item) => total + item.quantity, 0));
        } else {
          setCartItemCount(0);
        }
      } catch (error) { setCartItemCount(0); }
    };
    getCartItemCount();
    const intervalId = setInterval(getCartItemCount, 2000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <BottomTab.Navigator
      initialRouteName="Home"
      screenOptions={{
        tabBarActiveTintColor: '#fa6205',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          backgroundColor: '#FFF',
          height: 56,
          borderTopWidth: 1,
          borderTopColor: '#F0F0F0',
        },
        tabBarShowLabel: false,
      }}>
      <BottomTab.Screen
        name="Home"
        component={StackNavigatorUsuario}
        options={{ headerShown: false, tabBarIcon: ({ focused }) => <TabIcon name="home-outline" focused={focused} /> }}
      />
      <BottomTab.Screen
        name="Pedidos"
        component={Pedidos}
        options={{ headerShown: false, tabBarIcon: ({ focused }) => <TabIcon name="ticket-confirmation" focused={focused} /> }}
      />
      <BottomTab.Screen
        name="Carrito"
        component={Cart}
        options={{ headerShown: false, tabBarIcon: ({ focused }) => (
          <TabIcon name="shopping-basket" focused={focused} iconFamily="FontAwesome5" hasBadge badgeCount={cartItemCount} />
        )}}
      />
      <BottomTab.Screen
        name="Perfil"
        component={PerfilUsuario}
        options={{ headerShown: false, tabBarIcon: ({ focused }) => <TabIcon name="account-circle-outline" focused={focused} /> }}
      />
    </BottomTab.Navigator>
  );
}
