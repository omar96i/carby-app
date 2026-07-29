import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, Text, StyleSheet } from 'react-native';
import StackNavigatorUsuario from "./StackNavigatorUsuario";
import Pedidos from "../screens/usuario/Pedidos";
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PerfilUsuario from "../screens/User/PerfilUsuer";
import Cart from "../screens/Delivery/Cart";
import StepUno from "../screens/Delivery/StepUno";

const BottomTab = createBottomTabNavigator();

const TabIcon = ({ name, focused, color = '#fa6205', iconFamily = 'MaterialCommunityIcons', hasBadge, badgeCount, label }) => (
  <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 4 }}>
    {iconFamily === 'FontAwesome5' ? (
      <FontAwesome5 name={name} color={focused ? color : '#999'} size={24} />
    ) : (
      <MaterialCommunityIcons name={name} color={focused ? color : '#999'} size={24} />
    )}
    {hasBadge && badgeCount > 0 && (
      <View style={{
        position: 'absolute', top: -4, right: -14,
        backgroundColor: '#FF3B30', borderRadius: 9,
        minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center',
        paddingHorizontal: 4,
      }}>
        <Text style={{ color: '#FFF', fontSize: 10, fontFamily: 'Montserrat_700Bold' }}>
          {badgeCount <= 99 ? badgeCount : '99+'}
        </Text>
      </View>
    )}
    {label && <Text style={{ fontSize: 9, fontFamily: 'Montserrat_600SemiBold', color: focused ? color : '#999', marginTop: 2 }}>{label}</Text>}
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
          height: 64,
          borderTopWidth: 0,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
          elevation: 10,
          paddingBottom: 6,
          paddingTop: 4,
        },
        tabBarShowLabel: false,
      }}>
      <BottomTab.Screen
        name="Home"
        component={StackNavigatorUsuario}
        options={{ headerShown: false, tabBarIcon: ({ focused }) => <TabIcon name="home-outline" focused={focused} label="Inicio" /> }}
      />
      <BottomTab.Screen
        name="Pedidos"
        component={Pedidos}
        options={{ headerShown: false, tabBarIcon: ({ focused }) => <TabIcon name="ticket-confirmation" focused={focused} label="Pedidos" /> }}
      />
      <BottomTab.Screen
        name="Transporte"
        component={StepUno}
        options={{
          headerShown: false,
          tabBarStyle: { display: "none" },
          tabBarIcon: () => (
            <View style={s.centerBtn}>
              <MaterialCommunityIcons name="car" size={32} color="#FFF" />
            </View>
          ),
        }}
      />
      <BottomTab.Screen
        name="Carrito"
        component={Cart}
        options={{ headerShown: false, tabBarIcon: ({ focused }) => (
          <TabIcon name="shopping-basket" focused={focused} iconFamily="FontAwesome5" hasBadge badgeCount={cartItemCount} label="Carrito" />
        )}}
      />
      <BottomTab.Screen
        name="Perfil"
        component={PerfilUsuario}
        options={{ headerShown: false, tabBarIcon: ({ focused }) => <TabIcon name="account-circle-outline" focused={focused} label="Perfil" /> }}
      />
    </BottomTab.Navigator>
  );
}

const s = StyleSheet.create({
  centerBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#fa6205',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 36,
    shadowColor: '#fa6205',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 10,
    borderWidth: 3,
    borderColor: '#FFF',
  },
});
