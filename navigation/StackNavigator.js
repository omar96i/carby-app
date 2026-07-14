import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import StepUno from '../screens/Delivery/StepUno';
import StepDos from '../screens/Delivery/StepDos';
import StepTres from '../screens/Delivery/StepTres';
import StepCuatro from '../screens/Delivery/StepCuatro';
import StepNueve from '../screens/Delivery/StepNueve';
import HomeDelivery from '../screens/HomeDomicilio/HomeDelivery';
import StepTrece from '../screens/HomeDomicilio/StepTrece';
import Historial from '../screens/Pedidos';
import StepDieciseis from '../screens/Billetera/StepDieciseis';
import StepDiecisiete from '../screens/Billetera/StepDiecisiete';
import PerfilUsuario from '../screens/User/PerfilUsuer';
import HistoriasUser from '../screens/User/HistoriasUser';
import StepOnce from '../screens/User/StepOnce';
import Desembolso from '../screens/User/Desembolso';
import WebViewScreen from '../screens/Delivery/WebViewScreen';
import MetodosPago from '../screens/MetodosDePago';
import PedidoDetalle from '../screens/PedidoDetalle';
import PedidoDetalleComercio from '../screens/PedidoDetalleComercio';
import ChatComercioRider from '../screens/ChatComercioRider';
import ChatRiderComercio from '../screens/ChatRiderComercio';


const Stack = createStackNavigator();

export default function SecondaryStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeDelivery" component={HomeDelivery} />
      <Stack.Screen name="StepUno" component={StepUno} />
      <Stack.Screen name="WebViewScreen" component={WebViewScreen} options={{ headerShown: false }} />
      <Stack.Screen name="StepDos" component={StepDos} />
      <Stack.Screen name="StepTres" component={StepTres} />
      <Stack.Screen name="StepCuatro" component={StepCuatro} />
      <Stack.Screen name="StepNueve" component={StepNueve} />
      <Stack.Screen name="StepTrece" component={StepTrece} />
      <Stack.Screen name="Historial" component={Historial} />
      <Stack.Screen name="StepDieciseis" component={StepDieciseis} />
      <Stack.Screen name="StepDiecisiete" component={StepDiecisiete} />
      <Stack.Screen name="PerfilUsuario" component={PerfilUsuario} />
      <Stack.Screen name="HistoriasUser" component={HistoriasUser} />
      <Stack.Screen name="StepOnce" component={StepOnce} />
      <Stack.Screen name="Desembolso" component={Desembolso} />
      <Stack.Screen name="MetodosPago" component={MetodosPago} />
      <Stack.Screen name="PedidoDetalle" component={PedidoDetalle} />
      <Stack.Screen name="PedidoDetalleComercio" component={PedidoDetalleComercio} />
      <Stack.Screen name="ChatComercioRider" component={ChatComercioRider} />
      <Stack.Screen name="ChatRiderComercio" component={ChatRiderComercio} />

      
    </Stack.Navigator>
  );
}