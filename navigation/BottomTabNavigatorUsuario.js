import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, Text } from 'react-native';
import StackNavigatorUsuario from "./StackNavigatorUsuario";
import Pedidos from "../screens/Pedidos";
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

import PerfilUsuario from "../screens/User/PerfilUsuer";
import Cart from "../screens/Delivery/Cart";
const BottomTab = createBottomTabNavigator();

export default function BottomTabNavigatorUsuario() {
  // State to store cart item count
  const [cartItemCount, setCartItemCount] = useState(0);

  // Function to get cart item count from AsyncStorage
  const getCartItemCount = async () => {
    try {
      const cartData = await AsyncStorage.getItem('cart');
      if (cartData) {
        const parsedCart = JSON.parse(cartData);
        // Count total quantity of all items
        const totalItems = parsedCart.reduce((total, item) => total + item.quantity, 0);
        setCartItemCount(totalItems);
      } else {
        setCartItemCount(0);
      }
    } catch (error) {
      console.error("Error getting cart count:", error);
      setCartItemCount(0);
    }
  };

  // Listen for changes to the cart
  useEffect(() => {
    getCartItemCount();
    
    // Add event listener for cart updates
    const cartChangeListener = async () => {
      getCartItemCount();
    };
    
    // Subscribe to cart updates (simplified approach using interval)
    const intervalId = setInterval(getCartItemCount, 2000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  return (
    <BottomTab.Navigator
      initialRouteName="Home"
      screenOptions={{
        tabBarInactiveTintColor: 'gray',
        tabBarActiveTintColor: '#fa6205',
        tabBarStyle: {
          backgroundColor: 'white',
          height: 80,
          borderTopWidth: 0,
        },
        tabBarShowLabel: false, // Hide tab labels
      }}>
    
      <BottomTab.Screen
        name="Home"
        component={StackNavigatorUsuario}
        options={{
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <View style={{
              width: 60,
              height: 60,
              borderRadius: 30,
              backgroundColor: focused ? "#fa6205" : "transparent",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 30,
              shadowColor: focused ? "#fa6205" : "transparent",
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.5,
              shadowRadius: 10,
            }}>
              <MaterialCommunityIcons name="home-outline" color={focused ? "black" : "gray"} size={25} />
            </View>
          ),
        }}
      />
      <BottomTab.Screen
        name="Pedidos"
        component={Pedidos}
        options={{
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <View style={{
              width: 60,
              height: 60,
              borderRadius: 30,
              backgroundColor: focused ? "#fa6205" : "transparent",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 30,
              shadowColor: focused ? "#fa6205" : "transparent",
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.5,
              shadowRadius: 10,
            }}>
              <MaterialCommunityIcons name="ticket-confirmation" color={focused ? "black" : "gray"} size={25} />
            </View>
          ),
        }}
      />
      <BottomTab.Screen
        name="Carrito"
        component={Cart}
        options={{
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <View style={{
              width: 60,
              height: 60,
              borderRadius: 30,
              backgroundColor: focused ? "#fa6205" : "transparent",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 30,
              shadowColor: focused ? "#fa6205" : "transparent",
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.5,
              shadowRadius: 10,
            }}>
              <View>
                <FontAwesome5 name="shopping-basket" color={focused ? "black" : "gray"} size={25} />
                {cartItemCount > 0 && (
                  <View style={{
                    position: 'absolute',
                    right: -10,
                    top: -8,
                    backgroundColor: 'red',
                    borderRadius: 10,
                    width: 20,
                    height: 20,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    <Text style={{
                      color: '#1C1C1E',
                      fontSize: 12,
                      fontWeight: 'bold',
                    }}>
                      {cartItemCount <= 99 ? cartItemCount : '99+'}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ),
        }}
      />
      <BottomTab.Screen
        name="Perfil"
        component={PerfilUsuario}
        options={{
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <View style={{
              width: 60,
              height: 60,
              borderRadius: 30,
              backgroundColor: focused ? "#fa6205" : "transparent",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 30,
              shadowColor: focused ? "#fa6205" : "transparent",
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.5,
              shadowRadius: 10,
            }}>
              <MaterialCommunityIcons name="account-circle-outline" color={focused ? "black" : "gray"} size={25} />
            </View>
          ),
        }}
      />
    </BottomTab.Navigator>
  );
}