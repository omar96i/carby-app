import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

const TAB_META = {
  Home: { label: 'Inicio' },
  Pedidos: { label: 'Pedidos' },
  Transporte: { label: 'Viaje' },
  Carrito: { label: 'Carrito' },
  Perfil: { label: 'Cuenta' },
};

function TabIconGlyph({ routeName, focused }) {
  const color = focused ? '#FFF' : '#9A9AA3';
  const size = 23;
  if (routeName === 'Home') {
    return <MaterialCommunityIcons name={focused ? 'home' : 'home-outline'} color={color} size={size} />;
  }
  if (routeName === 'Pedidos') {
    return <MaterialCommunityIcons name={focused ? 'receipt-text' : 'receipt-text-outline'} color={color} size={size} />;
  }
  if (routeName === 'Carrito') {
    return <FontAwesome5 name="shopping-basket" color={color} size={20} />;
  }
  if (routeName === 'Perfil') {
    return <MaterialCommunityIcons name={focused ? 'account-circle' : 'account-circle-outline'} color={color} size={size} />;
  }
  return null;
}

function FloatingTabBar({ state, descriptors, navigation, cartItemCount }) {
  const insets = useSafeAreaInsets();
  const focusedRoute = state.routes[state.index];
  if (focusedRoute?.name === 'Transporte') return null;
  if (focusedRoute?.name === 'Home') {
    const inner = getFocusedRouteNameFromRoute(focusedRoute);
    if (inner && inner !== 'HomeScreenMain') return null;
  }

  return (
    <View style={[s.floatingWrap, { bottom: Math.max(insets.bottom, 8) + 8 }]} pointerEvents="box-none">
      <View style={s.floatingBar}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const meta = TAB_META[route.name] || { label: route.name };

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          if (route.name === 'Transporte') {
            return (
              <TouchableOpacity key={route.key} onPress={onPress} activeOpacity={0.8} style={s.centerWrap}>
                <View style={s.centerBtn}>
                  <MaterialCommunityIcons name="car" size={27} color="#FFF" />
                </View>
                <Text style={s.centerLabel}>{meta.label}</Text>
              </TouchableOpacity>
            );
          }

          const showBadge = route.name === 'Carrito' && cartItemCount > 0;

          return (
            <TouchableOpacity key={route.key} onPress={onPress} activeOpacity={0.7} style={[s.tabItem, isFocused && s.tabItemActive]}>
              <View>
                <TabIconGlyph routeName={route.name} focused={isFocused} />
                {showBadge && (
                  <View style={s.badge}>
                    <Text style={s.badgeText}>{cartItemCount <= 99 ? cartItemCount : '99+'}</Text>
                  </View>
                )}
              </View>
              <Text style={[s.tabLabel, isFocused && s.tabLabelActive]}>{meta.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

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
      tabBar={(props) => <FloatingTabBar {...props} cartItemCount={cartItemCount} />}
      screenOptions={{ headerShown: false }}>
      <BottomTab.Screen name="Home" component={StackNavigatorUsuario} />
      <BottomTab.Screen name="Pedidos" component={Pedidos} />
      <BottomTab.Screen name="Transporte" component={StepUno} />
      <BottomTab.Screen name="Carrito" component={Cart} />
      <BottomTab.Screen name="Perfil" component={PerfilUsuario} />
    </BottomTab.Navigator>
  );
}

const s = StyleSheet.create({
  floatingWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  floatingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131315',
    borderRadius: 32,
    paddingHorizontal: 8,
    paddingVertical: 10,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 2,
    borderRadius: 22,
    backgroundColor: 'transparent',
  },
  tabItemActive: {
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  tabLabel: {
    fontSize: 10,
    lineHeight: 12,
    fontFamily: 'Montserrat_600SemiBold',
    color: '#9A9AA3',
    marginTop: 3,
  },
  tabLabelActive: {
    color: '#FFF',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -14,
    backgroundColor: '#fa6205',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontFamily: 'Montserrat_700Bold',
  },
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -34,
  },
  centerBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fa6205',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#fa6205',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
    borderWidth: 4,
    borderColor: '#131315',
  },
  centerLabel: {
    fontSize: 10,
    lineHeight: 12,
    fontFamily: 'Montserrat_600SemiBold',
    color: '#9A9AA3',
    marginTop: 4,
  },
});
