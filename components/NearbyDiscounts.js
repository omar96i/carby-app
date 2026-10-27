import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, FlatList } from 'react-native';
import { useNavigation } from "@react-navigation/native";
import { BASE_URL } from "../constants/url";
import { TituloSeccion, TarjetaProducto, preciosDe } from "./home/ProductoHome";

const NearbyDiscounts = ({ location }) => {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    if (!location) return;
    fetchDiscounts();
  }, [location]);

  const fetchDiscounts = async () => {
    try {
      setLoading(true);
      const url = `${BASE_URL}productos/descuentos-cercanos?lat=${location.latitude}&lng=${location.longitude}&radio=8`;
      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      });

      const text = await response.text();
      const data = JSON.parse(text);

      if (Array.isArray(data)) {
        setProductos(data);
      }
    } catch (error) {
      console.error('Error fetching nearby discounts:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="small" color="#FF5A00" />
      </View>
    );
  }

  if (!productos || productos.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <TituloSeccion
        icono="pricetags"
        colorIcono="#DC2626"
        fondoIcono="#FEE2E2"
        titulo="Descuentos cerca de ti"
        sub="Productos con descuento activo"
      />
      <FlatList
        data={productos}
        renderItem={({ item }) => {
          const { pct } = preciosDe(item, true);
          return (
            <TarjetaProducto item={item} navigation={navigation} siempreDescuento insignia={pct > 0 ? `-${pct}%` : null} />
          );
        }}
        keyExtractor={(item) => item.id.toString()}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 28,
  },
  listContent: {
    paddingTop: 8,
    paddingRight: 16,
    gap: 12,
  },
  loadingWrap: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default NearbyDiscounts;
