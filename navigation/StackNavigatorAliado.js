import React from "react";
import { createStackNavigator, CardStyleInterpolators } from "@react-navigation/stack";
import StepUno from "../screens/Delivery/StepUno";
import StepDos from "../screens/Delivery/StepDos";
import StepTres from "../screens/Delivery/StepTres";
import StepCuatro from "../screens/Delivery/StepCuatro";
import StepNueve from "../screens/Delivery/StepNueve";
import DetalleCarrera from "../screens/usuario/DetalleCarrera";
import ChatConductor from "../screens/usuario/ChatConductor";
import HomeDelivery from "../screens/HomeDomicilio/HomeDelivery";
import DetalleCarreraConductor from "../screens/conductor/DetalleCarreraConductor";
import ChatCliente from "../screens/conductor/ChatCliente";
import ChatComercio from "../screens/conductor/ChatComercio";
import ChatDriver from "../screens/comercio/ChatDriver";
import ChatReservaView from "../screens/ChatReservaView";
import Historial from "../screens/Pedidos";
import StepDieciseis from "../screens/Billetera/StepDieciseis";
import StepDiecisiete from "../screens/Billetera/StepDiecisiete";
import PerfilUsuario from "../screens/User/PerfilUsuer";
import HistoriasUser from "../screens/User/HistoriasUser";
import StepOnce from "../screens/User/StepOnce";
import Desembolso from "../screens/User/Desembolso";
import WebViewScreen from "../screens/Delivery/WebViewScreen";
import VistaDos from "../screens/HomeDomicilio/VistaDos";
import ShopDos from "../screens/Delivery/ShopDos";
import Dashboard from "../screens/comercio/Dashboard";
import ProductoDos from "../screens/Delivery/ProductoDos";
import EditarProducto from "../screens/Delivery/EditarProducto";
import Wallet from "../screens/Delivery/Wallet";
import MetodosPago from "../screens/MetodosDePago";
import CrearPerfil from "../screens/Delivery/CrearPerfil";
import HorariosScreen from "../screens/comercio/HorariosScreen";
import ServiciosProducto from "../screens/Delivery/ServiciosProducto";
import EditarServicio from "../screens/Delivery/EditarServicio";
import PedidoDetalleComercio from "../screens/PedidoDetalleComercio";

//import PaymentScreen from '../screens/Delivery/PaymentScreen';
const Stack = createStackNavigator();

export default function TerceroStackNavigator() {
  return (
    <Stack.Navigator  initialRouteName="Dashboard"  screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Dashboard" component={Dashboard} />
      <Stack.Screen name="HomeDelivery" component={HomeDelivery} />
      <Stack.Screen name="StepUno" component={StepUno} />
      <Stack.Screen
        name="WebViewScreen"
        component={WebViewScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="StepDos" component={StepDos} />
      <Stack.Screen name="StepTres" component={StepTres} />
      <Stack.Screen name="StepCuatro" component={StepCuatro} />
      <Stack.Screen name="StepNueve" component={StepNueve} />
      <Stack.Screen name="DetalleCarrera" component={DetalleCarrera} />
      <Stack.Screen
        name="ChatConductor"
        component={ChatConductor}
        options={{
          cardStyleInterpolator: CardStyleInterpolators.forVerticalIOS,
          gestureDirection: 'vertical',
        }}
      />
      <Stack.Screen name="StepTrece" component={DetalleCarreraConductor} />
      <Stack.Screen
        name="ChatCliente"
        component={ChatCliente}
        options={{
          cardStyleInterpolator: CardStyleInterpolators.forVerticalIOS,
          gestureDirection: 'vertical',
        }}
      />
      <Stack.Screen
        name="ChatComercio"
        component={ChatComercio}
        options={{
          cardStyleInterpolator: CardStyleInterpolators.forVerticalIOS,
          gestureDirection: 'vertical',
        }}
      />
      <Stack.Screen
        name="ChatDriver"
        component={ChatDriver}
        options={{
          cardStyleInterpolator: CardStyleInterpolators.forVerticalIOS,
          gestureDirection: 'vertical',
        }}
      />
      <Stack.Screen
        name="ChatReservaView"
        component={ChatReservaView}
        options={{
          cardStyleInterpolator: CardStyleInterpolators.forVerticalIOS,
          gestureDirection: 'vertical',
        }}
      />
      <Stack.Screen name="Historial" component={Historial} />
      <Stack.Screen name="StepDieciseis" component={StepDieciseis} />
      <Stack.Screen name="StepDiecisiete" component={StepDiecisiete} />
      <Stack.Screen name="PerfilUsuario" component={PerfilUsuario} />
      <Stack.Screen name="HistoriasUser" component={HistoriasUser} />
      <Stack.Screen name="StepOnce" component={StepOnce} />
      <Stack.Screen name="Desembolso" component={Desembolso} />
      <Stack.Screen name="VistaDos" component={VistaDos} />
      <Stack.Screen name="ShopDos" component={ShopDos} />
      <Stack.Screen name="ProductoDos" component={ProductoDos} />
      <Stack.Screen name="EditarProducto" component={EditarProducto} />
      <Stack.Screen name="CrearPerfil" component={CrearPerfil} />
      <Stack.Screen name="Horarios" component={HorariosScreen} />
      <Stack.Screen name="Wallet" component={Wallet} />
      <Stack.Screen name="MetodosPago" component={MetodosPago} />
      <Stack.Screen name="ServiciosProducto" component={ServiciosProducto} />
      <Stack.Screen name="EditarServicio" component={EditarServicio} />
      <Stack.Screen name="PedidoDetalleComercio" component={PedidoDetalleComercio} />
      {/* <Stack.Screen name="PaymentScreen" component={PaymentScreen} /> */}
    </Stack.Navigator>
  );
}
