import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator, TouchableOpacity, Dimensions, FlatList } from 'react-native';
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { BASE_URL } from "../constants/url";

const { width } = Dimensions.get('window');

const CARD_WIDTH = 165;
const IMAGE_SIZE = 150;

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
      const url = `${BASE_URL}productos/mas-vendidos?lat=${location.latitude}&lng=${location.longitude}&radio=20`;
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

  const handleProductPress = (item) => {
    if (!item.comercio) return;
    const comercio = item.comercio;

    navigation.navigate("Shop", {
      establishmentId: comercio.id,
      userId: comercio.id,
      establishmentName: comercio.establecimiento_nombre || comercio.nombre_completo,
    });
  };

  const formatPrice = (price) => {
    return `$${Number(price).toLocaleString('es-CO')}`;
  };

  const renderItem = ({ item, index }) => {
    const rango = index < 3 ? index + 1 : null;    const imageUrl = item.foto
      ? `https://back.carbycol.com/storage/${item.foto}`
      : null;

    const precioOriginal = Number(item.precio) || 0;
    const descuento = Number(item.descuento) || 0;
    const precioFinal = precioOriginal - descuento;
    const tieneDescuento = item.activo_descuento && descuento > 0;
    const pctDescuento = tieneDescuento && precioOriginal > 0
      ? Math.round((descuento / precioOriginal) * 100)
      : 0;
    const pedidos = Number(item.total_pedidos) || 0;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.9}
        onPress={() => handleProductPress(item)}
      >
        <View style={styles.imageWrap}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.productImg} resizeMode="cover" />
          ) : (
            <View style={styles.placeholderImg}>
              <Text style={styles.placeholderText}>Sin foto</Text>
            </View>
          )}
          {rango && (
            <View style={styles.topBadge}>
              <Text style={styles.topBadgeText}>Top {rango}</Text>
            </View>
          )}
        </View>

        <View style={styles.infoWrap}>
          <Text style={styles.price}>{formatPrice(tieneDescuento ? precioFinal : precioOriginal)}</Text>

          {tieneDescuento ? (
            <View style={styles.discountRow}>
              <View style={styles.pctWrap}>
                <Ionicons name="flame" size={12} color="#FF5A00" />
                <Text style={styles.pctText}>-{pctDescuento}%</Text>
              </View>
              <Text style={styles.originalPrice}>{formatPrice(precioOriginal)}</Text>
            </View>
          ) : null}

          <Text style={styles.productName} numberOfLines={2}>{item.nombre}</Text>

          <View style={styles.storeRow}>
            <View style={styles.storeLogo}>
              <Text style={styles.storeLogoText}>
                {(item.comercio?.nombre_completo || 'T')[0].toUpperCase()}
              </Text>
            </View>
            <Text style={styles.storeName} numberOfLines={1}>{item.comercio?.nombre_completo || ''}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
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
      <Text style={styles.sectionTitle}>Los mas vendidos</Text>
      <FlatList
        data={productos}
        renderItem={renderItem}
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
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Montserrat_700Bold",
    color: "#1C1C1E",
    marginBottom: 14,
  },
  listContent: {
    paddingRight: 16,
    gap: 6,
  },
  card: {
    width: CARD_WIDTH,
    paddingBottom: 10,
  },
  imageWrap: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F2F2F2',
    marginBottom: 10,
  },
  productImg: {
    width: '100%',
    height: '100%',
  },
  placeholderImg: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E8E8E8',
  },
  placeholderText: {
    color: '#999',
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
  },
  ordersBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingVertical: 4,
    alignItems: 'center',
  },
  ordersBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontFamily: "Montserrat_700Bold",
  },
  topBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  topBadgeText: {
    color: '#1C1C1E',
    fontSize: 11,
    fontFamily: "Montserrat_800ExtraBold",
  },
  infoWrap: {
    paddingRight: 4,
  },
  price: {
    fontSize: 18,
    fontFamily: "Montserrat_800ExtraBold",
    color: "#1C1C1E",
    marginBottom: 2,
  },
  discountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  pctWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  pctText: {
    fontSize: 12,
    fontFamily: "Montserrat_700Bold",
    color: "#FF5A00",
  },
  originalPrice: {
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
    color: "#BBB",
    textDecorationLine: 'line-through',
  },
  productName: {
    fontSize: 13,
    fontFamily: "Montserrat_600SemiBold",
    color: "#1C1C1E",
    lineHeight: 17,
    marginBottom: 6,
  },
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  storeLogo: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FF5A00',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storeLogoText: {
    color: '#FFF',
    fontSize: 9,
    fontFamily: "Montserrat_700Bold",
  },
  storeName: {
    flex: 1,
    fontSize: 11,
    fontFamily: "Montserrat_400Regular",
    color: "#888",
  },
  loadingWrap: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default NearbyBestSellers;
