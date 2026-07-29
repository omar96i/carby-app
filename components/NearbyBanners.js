import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator, TouchableOpacity, Dimensions } from 'react-native';
import Carousel from 'react-native-reanimated-carousel';
import { useNavigation } from "@react-navigation/native";
import { BASE_URL } from "../constants/url";

const { width } = Dimensions.get('window');

const NearbyBanners = ({ location }) => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSlide, setActiveSlide] = useState(0);
  const carouselRef = useRef(null);
  const navigation = useNavigation();

  useEffect(() => {
    if (!location) return;
    fetchBanners();
  }, [location]);

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const url = `${BASE_URL}banners/cercanos?lat=${location.latitude}&lng=${location.longitude}&radio=20`;
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
    if (!item || !item.file) {
      return (
        <View style={styles.slide}>
          <Text style={styles.errorText}>Banner no disponible</Text>
        </View>
      );
    }

    const imageUrl = `https://back.carbycol.com/storage/${item.file}`;

    return (
      <TouchableOpacity
        style={styles.slide}
        activeOpacity={0.95}
        onPress={() => handleBannerPress(item)}
      >
        <Image
          source={{ uri: imageUrl }}
          style={styles.bannerImage}
          resizeMode="cover"
        />
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
      <Carousel
        ref={carouselRef}
        data={banners}
        renderItem={renderItem}
        width={width - 32}
        height={220}
        onSnapToItem={(index) => setActiveSlide(index)}
        autoPlay={banners.length > 1}
        autoPlayInterval={25000}
        style={{ width: '100%' }}
        mode="default"
        loop={banners.length > 1}
      />
      {banners.length > 1 && (
        <View style={styles.paginationContainer}>
          {banners.map((_, index) => (
            <View
              key={index}
              style={[
                styles.paginationDot,
                activeSlide === index ? styles.paginationActiveDot : styles.paginationInactiveDot,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    marginTop: 4,
    width: '100%',
  },
  slide: {
    height: 220,
    width: width - 32,
    borderRadius: 24,
    overflow: 'hidden',
    alignSelf: 'center',
    backgroundColor: '#F0F0F0',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  errorText: {
    color: '#999',
    fontSize: 13,
    textAlign: 'center',
  },
  emptyBanner: {
    width: '100%',
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 10,
    gap: 8,
  },
  paginationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  paginationActiveDot: {
    backgroundColor: '#FF5A00',
  },
  paginationInactiveDot: {
    backgroundColor: '#CCC',
  },
});

export default NearbyBanners;
