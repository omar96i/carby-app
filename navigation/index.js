import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import SplashScreen from "../screens/SplashScreen";
import PantallaDos from "../screens/Onboarding/PantallaDos";
import PantallaTres from "../screens/Onboarding/PantallaTres";
import PantallaCuatro from "../screens/Onboarding/PantallaCuatro";
import LoginScreen from "../screens/Login/Login";
import RegisterScreen from "../screens/Login/Registro";
import RegisterUserScreen from "../screens/Register/RegistroUsuario";
import Comercio from "../screens/Register/Comercio";
import RegisterDomiciliaryScreen from "../screens/Register/RegistroDomiciliario";
import BottomTabNavigatorUsuario from "./BottomTabNavigatorUsuario";
import BottomTabNavigatorDelivery from "./BottomTabNavigatorDelivery";
import BottomTabNavigatorAliado from "./BottomTabNavigatorAliado";
import Categorias from "../screens/Delivery/Categorias";
import Shop from "../screens/Delivery/Shop";
import Producto from "../screens/Delivery/Producto";
import Cart from "../screens/Delivery/Cart";
import PaymentScreen from "../screens/Delivery/PaymentScreen";
import HomeDelivery from "../screens/HomeDomicilio/HomeDelivery";
import VistaDos from "../screens/HomeDomicilio/VistaDos";
import ShopDos from "../screens/Delivery/ShopDos";
import ProductoDos from "../screens/Delivery/ProductoDos";
import AuthLoadingScreen from "../screens/Login/AuthLoadingScreen";
import CategoriaVertical from "../screens/Delivery/CategoriaVertical";
import Wallet from "../screens/Delivery/Wallet";
import WalletRider from "../screens/Delivery/WalletRider";
import MetodosPago from "../screens/MetodosDePago";
import StepDiecisiete from "../screens/Billetera/StepDiecisiete";
import PedidoDetalle from '../screens/PedidoDetalle';
import PedidoDetalleComercio from '../screens/PedidoDetalleComercio';
import ChatComercioRider from "../screens/ChatComercioRider";
import ChatRiderComercio from "../screens/ChatRiderComercio";
import PaymentScreenBoleteria from "../screens/Boleteria/PaymentScreen";
import MisCompras from "../screens/Boleteria/MisCompras";
import LocationVerificationScreen from "../screens/LocationVerification";
import PagoScreen from "../screens/CajaMisterio/PagoScreen";
import PaymentWebView from "../screens/CajaMisterio/PaymentWebView";
import ConfigurarPalabraSeguridad from "../screens/ConfigurarPalabraSeguridad";
const Stack = createStackNavigator();



// Global flag to control splash screen behavior
global.splashScreenActive = true;

export default function Navigation() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="LocationVerificationScreen" component={LocationVerificationScreen} />
        <Stack.Screen
          name="AuthLoadingScreen"
          component={AuthLoadingScreen}
          options={{ animationEnabled: false }}
        />
        <Stack.Screen name="PantallaDos" component={PantallaDos} />
        <Stack.Screen name="PantallaTres" component={PantallaTres} />
        <Stack.Screen name="PantallaCuatro" component={PantallaCuatro} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="RegisterUser" component={RegisterUserScreen} />
        <Stack.Screen name="RegisterDomiciliary" component={RegisterDomiciliaryScreen} />
        <Stack.Screen name="BottomTabNavigatorUsuario" component={BottomTabNavigatorUsuario} />
        <Stack.Screen name="BottomTabNavigatorDelivery" component={BottomTabNavigatorDelivery} />
        <Stack.Screen name="BottomTabNavigatorAliado" component={BottomTabNavigatorAliado} />
        <Stack.Screen name="Comercio" component={Comercio} />
        <Stack.Screen name="Categorias" component={Categorias} />
        <Stack.Screen name="Shop" component={Shop} />
        <Stack.Screen name="Producto" component={Producto} />
        <Stack.Screen name="Cart" component={Cart} />
        <Stack.Screen name="PaymentScreen" component={PaymentScreen} />
        <Stack.Screen name="VistaDos" component={VistaDos} />
        <Stack.Screen name="ShopDos" component={ShopDos} />
        <Stack.Screen name="ProductoDos" component={ProductoDos} />
        <Stack.Screen name="categoriaVertical" component={CategoriaVertical} />
        <Stack.Screen name="Wallet" component={Wallet} />
        <Stack.Screen name="WalletRider" component={WalletRider} />
        <Stack.Screen name="MetodosPago" component={MetodosPago} />
        <Stack.Screen name="stepDiecisiete" component={StepDiecisiete} />
        <Stack.Screen name="PedidoDetalle" component={PedidoDetalle} />
        <Stack.Screen name="PedidoDetalleComercio" component={PedidoDetalleComercio} />
        <Stack.Screen name="ChatComercioRider" component={ChatComercioRider} />
        <Stack.Screen name="ChatRiderComercio" component={ChatRiderComercio} />
        <Stack.Screen name="PaymentScreenBoleteria" component={PaymentScreenBoleteria} />
        <Stack.Screen name="MisCompras" component={MisCompras} />
        <Stack.Screen
          name="Recharge"
          component={PagoScreen}
          options={{ title: 'Billetera' }}
        />
        <Stack.Screen
          name="PaymentWebView"
          component={PaymentWebView}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen name="ConfigurarPalabraSeguridad" component={ConfigurarPalabraSeguridad} />

      </Stack.Navigator>
    </NavigationContainer>
  );
}
