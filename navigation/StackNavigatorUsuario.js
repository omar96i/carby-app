import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from '../screens/HomeScreen';
import HistoriasUser from '../screens/User/HistoriasUser';
import StepOnce from '../screens/User/StepOnce';
import Desembolso from '../screens/User/Desembolso';
import StepUno from '../screens/Delivery/StepUno';
import StepDos from '../screens/Delivery/StepDos';
import StepTres from '../screens/Delivery/StepTres';
import StepCuatro from '../screens/Delivery/StepCuatro';
import StepNueve from '../screens/Delivery/StepNueve';
import StepTrece from '../screens/HomeDomicilio/StepTrece';
import StepDieciseis from '../screens/Billetera/StepDieciseis';
import StepDiecisiete from '../screens/Billetera/StepDiecisiete';
// In your navigation file (e.g., AppNavigator.js or similar)
import WebViewScreen from '../screens/Delivery/WebViewScreen';
import Categorias from '../screens/Delivery/Categorias';
import Shop from '../screens/Delivery/Shop';
import Producto from '../screens/Delivery/Producto';
import Cart from '../screens/Delivery/Cart';// In your Stack.Navigator component:
import PaymentScreen from '../screens/Delivery/PaymentScreen';
import VistaDos from '../screens/HomeDomicilio/VistaDos';
import ShopDos from '../screens/Delivery/ShopDos';
import ProductoDos from '../screens/Delivery/ProductoDos';
import CategoriaVertical from '../screens/Delivery/CategoriaVertical';
import MetodosPago from '../screens/MetodosDePago';
import ServiciosProducto from '../screens/Delivery/ServiciosProducto';
import EditarServicio from '../screens/Delivery/EditarServicio';
import ServicioDetalle from '../screens/Delivery/ServicioDetalle';
import PedidoDetalle from '../screens/PedidoDetalle';
import BoleteriaScreen from '../screens/Boleteria/HomeScreen'
import CajaMisterioScreen from '../screens/CajaMisterio/CajaMisterioScreen'
const Stack = createStackNavigator();

export default function StackNavigatorUsuario() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeScreenMain" component={HomeScreen} />
      <Stack.Screen name="WebViewScreen" component={WebViewScreen} options={{ headerShown: false }} />
      <Stack.Screen name="HistoriasUser" component={HistoriasUser} />
      <Stack.Screen name="StepOnce" component={StepOnce} />
      <Stack.Screen name="Desembolso" component={Desembolso} />
      <Stack.Screen name="StepUno" component={StepUno} />
      <Stack.Screen name="StepDos" component={StepDos} />
      <Stack.Screen name="StepTres" component={StepTres} />
      <Stack.Screen name="StepCuatro" component={StepCuatro} />
      <Stack.Screen name="StepNueve" component={StepNueve} />
      <Stack.Screen name="StepTrece" component={StepTrece} />
      <Stack.Screen name="StepDieciseis" component={StepDieciseis} />
      <Stack.Screen name="StepDiecisiete" component={StepDiecisiete} />
      <Stack.Screen name="Categorias" component={Categorias}/>
      <Stack.Screen name="Shop" component={Shop} />
      <Stack.Screen name="Producto" component={Producto} />
      <Stack.Screen name="Cart" component={Cart} />
      <Stack.Screen name="PaymentScreen" component={PaymentScreen} options={{ unmountOnBlur: true }}/>
      <Stack.Screen name="VistaDos" component={VistaDos} />
      <Stack.Screen name="ShopDos" component={ShopDos} />
      <Stack.Screen name="ProductoDos" component={ProductoDos} />
      <Stack.Screen name="CategoriaVertical" component={CategoriaVertical} />
      <Stack.Screen name="MetodosPago" component={MetodosPago} />
      <Stack.Screen name="ServiciosProducto" component={ServiciosProducto} />
      <Stack.Screen name="EditarServicio" component={EditarServicio} />
      <Stack.Screen name="ServicioDetalle" component={ServicioDetalle} />
      <Stack.Screen name="PedidoDetalle" component={PedidoDetalle} />
      <Stack.Screen name="BoleteriaScreen" component={BoleteriaScreen} />
      <Stack.Screen name="CajaMisterioScreen" component={CajaMisterioScreen} />
    </Stack.Navigator>
  );
}