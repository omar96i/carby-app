import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Montserrat_400Regular, Montserrat_700Bold, Montserrat_300Light, Montserrat_600SemiBold } from '@expo-google-fonts/montserrat';
import { useFonts } from 'expo-font';
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { BASE_URL } from "../../constants/url";
import { FontAwesome, Ionicons } from '@expo/vector-icons';

const Categorias = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { categoryId, categoryName = "Categoría", subcategories = [], establishments = [], establishmentsSedes = [] } = route.params || {};
  const [loading, setLoading] = useState(false);

  useFocusEffect(useCallback(() => {
    navigation.getParent()?.setOptions({ tabBarStyle: { display: "none" } });
    return () => navigation.getParent()?.setOptions({ tabBarStyle: { backgroundColor: '#FFF', height: 56, borderTopWidth: 1, borderTopColor: '#F0F0F0', display: 'flex' } });
  }, [navigation]));

  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_700Bold,
    Montserrat_300Light,
    Montserrat_600SemiBold,
  });

  // 1. Unificamos la data (Usuarios + Sedes)
  const combinedData = useMemo(() => {
    // Marcamos los items para saber si son 'user' o 'sede'
    const users = establishments.map(item => ({ ...item, dataType: 'user' }));
    const sedes = establishmentsSedes.map(item => ({ ...item, dataType: 'sede' }));
    return [...users, ...sedes];
  }, [establishments, establishmentsSedes]);

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fa6205" />
      </View>
    );
  }

  const getEstablishmentImage = (item) => {
    // Lógica para SEDE
    if (item.dataType === 'sede') {
      // 1. PRIORIDAD MÁXIMA: Icono propio de la sede
      if (item.icono) {
        return `${BASE_URL.toString().replace('/api', '')}/storage/${item.icono}`;
      }

      // 2. Fallback: Foto del documento del padre (Usuario dueño)
      if (item.user && item.user.foto_documento_file) {
        return `${BASE_URL.toString().replace('/api', '')}/storage/${item.user.foto_documento_file}`;
      }

      // 3. Fallback: Buscar en subcategorías usando el user_id del padre
      const relevantSubcategory = subcategories?.find(
        sub => sub.user_id === item.user_id && sub.productos?.length > 0
      );
      const productWithImage = relevantSubcategory?.productos?.find(product => product.foto);

      if (productWithImage?.foto) {
        return `${BASE_URL.toString().replace('/api', '')}/storage/${productWithImage.foto}`;
      }
    }

    // Lógica para USUARIO (Comercio Principal)
    else {
      if (item.foto_documento_file) {
        return `${BASE_URL.toString().replace('/api', '')}/storage/${item.foto_documento_file}`;
      }
      const relevantSubcategory = subcategories?.find(
        sub => sub.user_id === item.id && sub.productos?.length > 0
      );
      const productWithImage = relevantSubcategory?.productos?.find(product => product.foto);

      if (productWithImage?.foto) {
        return `${BASE_URL.toString().replace('/api', '')}/storage/${productWithImage.foto}`;
      }
    }

    // Imagen por defecto si todo falla
    return 'https://via.placeholder.com/150';
  };

  const StarRating = ({ rating }) => {
    const totalStars = 5;
    const hasRating = rating !== null && rating !== undefined;

    return (
      <View style={styles.ratingContainer}>
        {[...Array(totalStars)].map((_, index) => (
          <FontAwesome
            key={index}
            name="star"
            size={14}
            color={hasRating ? (index < Math.round(rating) ? '#FFD700' : '#DDDDDD') : '#DDDDDD'}
            style={styles.starIcon}
          />
        ))}
        {hasRating && (
          <Text style={styles.ratingText}>{parseFloat(rating).toFixed(1)}</Text>
        )}
      </View>
    );
  };

  const renderEstablishment = ({ item }) => {
    const isSede = item.dataType === 'sede';

    // Definición de variables según si es Sede o Usuario
    const targetUserId = isSede ? item.user_id : item.id;

    const sedeId = isSede ? item.id : null;

    const imagenSede = isSede ? item.icono : null;
    console.log("esta es la imagen de la sede" + imagenSede)
    // Nombre: Si es sede usamos item.name (Ej: "area de prueba"), si es usuario usamos establecimiento_nombre
    const displayName = isSede
      ? item.name
      : (item.establecimiento_nombre || item.name || "Establecimiento");

    // Rating: Si es sede, usamos la puntuación del padre (item.user.promedio...)
    const rating = isSede
      ? item.user?.promedio_puntuacion_restaurante
      : item.promedio_puntuacion_restaurante;

    // Subcategorías: Buscamos las que pertenecen al ID del usuario (padre)
    const establishmentSubcategories = subcategories
      ? subcategories.filter(sub => sub.user_id === targetUserId)
      : [];

    const handlePress = () => {
      navigation.navigate("Shop", {
        establishmentId: targetUserId,
        userId: targetUserId,
        establishmentName: displayName,
        subcategories: establishmentSubcategories,
        promedio_puntuacion_restaurante: rating || null,
        isSede: isSede,
        sedeLocation: isSede ? item.specific_location : null,
        sedeReference: isSede ? item.reference_point : null,
        sedeId: sedeId,
        imagenSede: imagenSede
      });
    };

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.9}
        onPress={handlePress}
      >
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: getEstablishmentImage(item) }}
            style={styles.image}
            resizeMode="cover"
          />
        </View>

        <View style={styles.info}>
          <View style={styles.headerInfo}>
            <Text style={styles.name} numberOfLines={1}>
              {displayName}
            </Text>
          </View>

          <StarRating rating={rating} />

          <Text style={styles.description} numberOfLines={1}>
            {/* Si es sede mostramos su ubicación específica, si no, la categoría */}
            {isSede ? item.specific_location : categoryName}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={handlePress}
        >
          <Text style={styles.buttonText}>Ver</Text>
          <Ionicons name="arrow-forward" size={16} color="#FFF" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.title}>{categoryName}</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#fa6205" />
      ) : combinedData && combinedData.length > 0 ? (
        <FlatList
          data={combinedData} // Usamos la data combinada
          renderItem={renderEstablishment}
          keyExtractor={(item) => item.dataType + '-' + item.id.toString()} // Key única compuesta
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="storefront-outline" size={60} color="#333" />
          <Text style={styles.emptyText}>No hay establecimientos disponibles en esta categoría</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#fa6205',
    paddingTop: Platform.OS === 'android' ? 50 : 14,
  },
  title: {
    fontSize: 20,
    color: '#FFF',
    fontFamily: 'Montserrat_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  listContent: {
    paddingHorizontal: 15,
    paddingTop: 12,
    paddingBottom: 30,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  imageContainer: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
  },
  image: {
    width: 70,
    height: 70,
    borderRadius: 12,
    marginRight: 15,
    backgroundColor: '#F0F0F0',
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  headerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 16,
    color: '#1C1C1E',
    fontFamily: 'Montserrat_700Bold',
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    color: '#AAAAAA',
    fontFamily: 'Montserrat_400Regular',
    marginTop: 2,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  starIcon: {
    marginRight: 2,
  },
  ratingText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#333',
    fontFamily: 'Montserrat_600SemiBold',
  },
  button: {
    backgroundColor: '#fa6205',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginLeft: 5,
  },
  buttonText: {
    fontSize: 12,
    color: '#FFF',
    fontFamily: 'Montserrat_700Bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
    fontFamily: 'Montserrat_400Regular',
    marginTop: 15,
    fontSize: 16,
  },
});

export default Categorias;