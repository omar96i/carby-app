import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import TerceroStackNavigator from './StackNavigatorAliado';
import Pedidos from '../screens/comercio/Pedidos';
import Perfil from '../screens/Perfil';
import Wallet from '../screens/Delivery/Wallet';
const BottomTab = createBottomTabNavigator();

const TAB_META = {
  Home: { label: 'Inicio' },
  Pedidos: { label: 'Pedidos' },
  Wallet: { label: 'Billetera' },
  Perfil: { label: 'Cuenta' },
};

function TabIconGlyph({ routeName, focused }) {
  const color = focused ? '#FFF' : '#9A9AA3';
  const size = 23;
  if (routeName === 'Home') {
    return <MaterialCommunityIcons name={focused ? 'home' : 'home-outline'} color={color} size={size} />;
  }
  if (routeName === 'Pedidos') {
    return <MaterialCommunityIcons name={focused ? 'ticket-confirmation' : 'ticket-confirmation-outline'} color={color} size={size} />;
  }
  if (routeName === 'Wallet') {
    return <MaterialCommunityIcons name={focused ? 'wallet' : 'wallet-outline'} color={color} size={size} />;
  }
  if (routeName === 'Perfil') {
    return <MaterialCommunityIcons name={focused ? 'account-circle' : 'account-circle-outline'} color={color} size={size} />;
  }
  return null;
}

function FloatingTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const focusedRoute = state.routes[state.index];
  if (focusedRoute?.name === 'Home') {
    const inner = getFocusedRouteNameFromRoute(focusedRoute);
    if (inner && inner !== 'Dashboard') return null;
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

          return (
            <TouchableOpacity key={route.key} onPress={onPress} activeOpacity={0.7} style={[s.tabItem, isFocused && s.tabItemActive]}>
              <TabIconGlyph routeName={route.name} focused={isFocused} />
              <Text style={[s.tabLabel, isFocused && s.tabLabelActive]}>{meta.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function BottomTabNavigatorAliado() {
  return (
    <BottomTab.Navigator
      initialRouteName="Home"
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false }}>
      <BottomTab.Screen name="Home" component={TerceroStackNavigator} />
      <BottomTab.Screen name="Pedidos" component={Pedidos} />
      <BottomTab.Screen name="Wallet" component={Wallet} />
      <BottomTab.Screen name="Perfil" component={Perfil} />
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
});
