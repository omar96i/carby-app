import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Dimensions, FlatList } from 'react-native';
import { useNavigation } from "@react-navigation/native";
import { BASE_URL } from "../constants/url";
import { C, TituloSeccion, TicketProducto } from "./home/ProductoHome";

const { width } = Dimensions.get('window');

const TICKET_W = Math.min(width - 96, 300);

const NearbyCheapest = ({ location }) => {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    if (!location) return;
    fetchCheapest();
  }, [location]);

  const fetchCheapest = async () => {
    try {
      setLoading(true);
      const url = `${BASE_URL}productos/mas-baratos?lat=${location.latitude}&lng=${location.longitude}&radio=8`;
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
      console.error('Error fetching cheapest products:', error);
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
        icono="pricetag"
        colorIcono={C.green}
        fondoIcono="#DCFCE7"
        titulo="Los más baratos"
        sub="Precios más bajos cerca de ti"
      />
      <FlatList
        data={productos}
        renderItem={({ item }) => (
          <TicketProducto item={item} navigation={navigation} ancho={productos.length > 1 ? TICKET_W : width - 32} />
        )}
        keyExtractor={(item) => item.id.toString()}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={TICKET_W + 12}
        decelerationRate="fast"
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
    paddingBottom: 8,
    paddingRight: 16,
    gap: 12,
  },
  loadingWrap: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default NearbyCheapest;
