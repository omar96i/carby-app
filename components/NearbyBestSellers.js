import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator, TouchableOpacity, FlatList } from 'react-native';
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { BASE_URL } from "../constants/url";
import FavoriteHeart from "./FavoriteHeart";
import {
  C,
  TituloSeccion,
  TarjetaProducto,
  BotonAgregar,
  LineaComercio,
  Precio,
  fotoProducto,
  irATienda,
  abrirProducto,
} from "./home/ProductoHome";

const NearbyBestSellers = ({ location }) => {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    if (!location) return;
    fetchBestSellers();
  }, [location]);

  const fetchBestSellers = async () => {
    try {
      setLoading(true);
      const url = `${BASE_URL}productos/mas-vendidos?lat=${location.latitude}&lng=${location.longitude}&radio=8`;
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
      console.error('Error fetching best sellers:', error);
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

  const [primero, ...resto] = productos;
  const fotoPrimero = fotoProducto(primero);

  return (
    <View style={styles.container}>
      <TituloSeccion
        icono="flame"
        colorIcono={C.brand}
        fondoIcono={C.ink}
        titulo="Los más vendidos"
        sub="Lo que más se pide cerca de ti"
      />

      <TouchableOpacity style={styles.destacado} activeOpacity={0.92} onPress={() => irATienda(navigation, primero)}>
        {fotoPrimero ? (
          <Image source={{ uri: fotoPrimero }} style={styles.destacadoImg} resizeMode="cover" />
        ) : (
          <View style={[styles.destacadoImg, styles.sinFoto]}>
            <Ionicons name="image-outline" size={32} color="#A1A1AA" />
          </View>
        )}
        <View style={styles.top1}>
          <Ionicons name="flame" size={12} color="#FFFFFF" />
          <Text style={styles.top1Texto}>Top 1</Text>
        </View>
        <View style={styles.destacadoCorazon}>
          <FavoriteHeart productId={primero.id} size={16} />
        </View>
        <View style={styles.franja}>
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <Text style={styles.franjaNombre} numberOfLines={1}>{primero.nombre}</Text>
            <LineaComercio comercio={primero.comercio} claro />
            <Precio item={primero} claro />
          </View>
          <BotonAgregar onPress={() => abrirProducto(navigation, primero)} aro="rgba(28,28,30,0.0)" size={36} />
        </View>
      </TouchableOpacity>

      {resto.length > 0 && (
        <FlatList
          data={resto}
          renderItem={({ item, index }) => (
            <TarjetaProducto item={item} navigation={navigation} insignia={index < 2 ? `Top ${index + 2}` : null} />
          )}
          keyExtractor={(item) => item.id.toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          style={styles.lista}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 28,
  },
  destacado: {
    height: 214,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: C.ink,
  },
  destacadoImg: {
    width: '100%',
    height: '100%',
  },
  sinFoto: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.bg,
  },
  top1: {
    position: 'absolute',
    left: 14,
    top: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: C.brand,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  top1Texto: {
    fontSize: 11.5,
    fontFamily: "Montserrat_800ExtraBold",
    color: '#FFFFFF',
  },
  destacadoCorazon: {
    position: 'absolute',
    right: 14,
    top: 12,
  },
  franja: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(28,28,30,0.9)',
    borderRadius: 20,
    paddingVertical: 10,
    paddingLeft: 14,
    paddingRight: 8,
  },
  franjaNombre: {
    fontSize: 14.5,
    fontFamily: "Montserrat_800ExtraBold",
    color: '#FFFFFF',
  },
  lista: {
    marginTop: 12,
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

export default NearbyBestSellers;
