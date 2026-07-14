import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import SecondaryStackNavigator from './StackNavigator'; // Cambiado de './SecondaryStackNavigator' a './StackNavigator'
import Pedidos from '../screens/Pedidos';
import Perfil from '../screens/Perfil';
import WalletRider from '../screens/Delivery/WalletRider';
const BottomTab = createBottomTabNavigator();

export default function BottomTabNavigatorDelivery() {
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
        component={SecondaryStackNavigator}
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
        name="WalletRider"
        component={WalletRider}
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
                    <MaterialCommunityIcons name="wallet-plus" color={focused ? "black" : "gray"} size={25} />
                  </View>
          ),
        }}
      />
      <BottomTab.Screen
        name="Perfil"
        component={Perfil}
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