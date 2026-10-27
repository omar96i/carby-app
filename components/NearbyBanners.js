import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator, TouchableOpacity, FlatList } from 'react-native';
import { useNavigation } from "@react-navigation/native";
import { BASE_URL } from "../constants/url";
import LogoComercio from "./LogoComercio";
import { C, TituloSeccion } from "./home/ProductoHome";

const CARD_W = 262;

const NearbyBanners = ({ location }) => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    if (!location) return;
    fetchBanners();
  }, [location]);

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const url = `${BASE_URL}banners/cercanos?lat=${location.latitude}&lng=${location.longitude}&radio=8`;
      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      });

      const text = await response.text();
      const data = JSON.parse(text);

      if (Array.isArray(data)) {
        setBanners(data);
      }
    } catch (error) {
      console.error('Error fetching nearby banners:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBannerPress = (item) => {
    if (!item.comercio) return;
    const comercio = item.comercio;
    navigation.navigate("Shop", {
      establishmentId: comercio.id,
      userId: comercio.id,
      establishmentName: comercio.establecimiento_nombre || comercio.nombre_completo,
    });
  };

  const renderItem = ({ item }) => {
    if (!item || !item.file) return null;
    const imageUrl = `https://back.carbycol.com/storage/${item.file}`;
    const nombre = item.comercio?.establecimiento_nombre || item.comercio?.nombre_completo || '';

    return (
      <TouchableOpacity style={styles.card} activeOpacity={0.92} onPress={() => handleBannerPress(item)}>
        <Image source={{ uri: imageUrl }} style={styles.bannerImage} resizeMode="cover" />
        <View style={styles.info}>
          <View style={styles.logoWrap}>
            <LogoComercio comercio={item.comercio} comercioId={item.comercio?.id} size={46} />
          </View>
          <Text style={styles.nombre} numberOfLines={1}>{nombre}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.emptyBanner}>
        <ActivityIndicator size="large" color="#FF5A00" />
      </View>
    );
  }

  if (!banners || banners.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <TituloSeccion icono="storefront" titulo="Tiendas cerca de ti" sub="Cerca de tu ubicación" />
      <FlatList
        data={banners.filter((b) => b && b.file)}
        renderItem={renderItem}
        keyExtractor={(item, index) => (item.id ?? index).toString()}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_W + 12}
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
    paddingRight: 16,
    gap: 12,
  },
  card: {
    width: CARD_W,
    backgroundColor: C.surface,
    borderRadius: 24,
    overflow: 'hidden',
  },
  bannerImage: {
    width: CARD_W,
    height: 128,
    backgroundColor: C.bg,
  },
  info: {
    paddingTop: 30,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  logoWrap: {
    position: 'absolute',
    left: 14,
    top: -27,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nombre: {
    fontSize: 14.5,
    fontFamily: "Montserrat_800ExtraBold",
    color: C.ink,
  },
  emptyBanner: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
});

export default NearbyBanners;
