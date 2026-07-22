import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator, Dimensions } from 'react-native';
import Ionicons from "react-native-vector-icons/Ionicons";
import Carousel from 'react-native-reanimated-carousel';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from "../constants/url";

const { width } = Dimensions.get('window');

// Improved banner component with carousel
const AdCarousel = () => {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);  const [activeSlide, setActiveSlide] = useState(0);
  const carouselRef = useRef(null);
  
  // Ensure activeSlide stays within bounds
  useEffect(() => {
    if (ads && ads.length > 0 && activeSlide >= ads.length) {
      setActiveSlide(0);
    }
  }, [ads, activeSlide]);
  // Fetch ads from the API
  useEffect(() => {
    const fetchAds = async () => {
      try {
        // Get the user token from AsyncStorage
        const userToken = await AsyncStorage.getItem('userToken');
        
        // Log the URL we're fetching from
     
        
        // Prepare headers
        const headers = {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        };
        
        // Add Authorization header if token exists
        if (userToken) {
          headers['Authorization'] = `Bearer ${userToken}`;
        }
        
        // Perform the fetch request with headers
        const response = await fetch(`${BASE_URL}publicidades`, {
          method: 'GET',
          headers: headers
        });
        
       
        
        // Get the raw text first to see what's coming back
        const rawText = await response.text();
    
        // Try to parse the response as JSON now
        let data;
        try {
          data = JSON.parse(rawText);
    
        } catch (parseError) {
          console.error("JSON parse error:", parseError);
          setError("Error al analizar datos del servidor");
          setLoading(false);
          return;
        }
        
        if (Array.isArray(data)) {
          // Filter only active ads with valid dates
          const today = new Date();
          const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
          
          const activeAds = data.filter(ad => {
            return ad.estado === "activo" && 
                  ad.fecha_inicio <= todayStr && 
                  ad.fecha_fin >= todayStr;
          });
          
        
          setAds(activeAds);
        } else {
          console.error("Unexpected data format:", data);
          setError("Formato de datos inesperado");
        }
      } catch (err) {
        console.error("Error fetching ads:", err);
        console.error("Error details:", err.message);
        setError("No se pudieron cargar las promociones");
      } finally {
        setLoading(false);
      }
    };
    
    fetchAds();
  }, []);// Set up auto-rotation in a separate useEffect to avoid recreating it when activeSlide changes
  useEffect(() => {
    let interval;
    
    // Only set up auto-rotation if we have multiple ads and the carousel ref exists
    // Note: This is a backup in case the autoPlay prop doesn't work
    if (ads && ads.length > 1 && carouselRef.current) {
      interval = setInterval(() => {
        try {
          if (carouselRef.current && ads.length > 0) {
            const nextSlide = (activeSlide + 1) % ads.length;
            if (carouselRef.current.scrollTo) {
              carouselRef.current.scrollTo({ index: nextSlide, animated: true });
            }
          }
        } catch (error) {
          console.error('Error during carousel rotation:', error);
          // Clear the interval if an error occurs to prevent continuous errors
          if (interval) {
            clearInterval(interval);
          }
        }
      }, 30000); // 30 seconds
    }
    
    // Clean up interval on component unmount or when dependencies change
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [activeSlide, ads]);    const renderItem = ({ item }) => {
    if (!item || !item.file) {
      // Handle case where item or item.file is undefined
      return (
        <View style={styles.slide}>
          <Text style={styles.title}>Error: Banner no disponible</Text>
        </View>
      );
    }
    
    // Create direct URL to storage without using BASE_URL
    const imageUrl = `https://back.carbycol.com/storage/${item.file}`;
    
   
    // Track image loading state
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    
    return (
      <View style={styles.slide}>
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#fa6205" size="large" />
          </View>
        )}
        
        {hasError && (
          <View style={styles.loadingContainer}>
            <Text style={styles.title}>Error al cargar imagen</Text>
            <Text style={[styles.subtitle, {fontSize: 12}]}>{item.file}</Text>
          </View>
        )}
        
        <Image 
          source={{ uri: imageUrl }} 
          style={[
            styles.adImage,
            hasError && { display: 'none' }
          ]}
          resizeMode="cover"
          onLoadStart={() => setIsLoading(true)}
          onLoadEnd={() => setIsLoading(false)}
          onError={(e) => {
            console.log('Image loading error:', e.nativeEvent.error);
            setHasError(true);
            setIsLoading(false);
          }}
        />
      </View>
    );
  };
    // Show loading indicator while fetching
  if (loading) {
    return (
      <View style={styles.emptyBanner}>
        <ActivityIndicator size="large" color="#fa6205" />
        <Text style={styles.title}>Cargando promociones...</Text>
      </View>
    );
  }
  
  // Show error state if there's an error or no active ads
  if (error || !ads || ads.length === 0) {
    return (
      <View style={styles.emptyBanner}>
        <Ionicons name="hand-right-outline" size={32} color="#fa6205" />
        <Text style={styles.title}>{error || "Aquí aparecerán las promociones"}</Text>
        <Text style={styles.subtitle}>¡PRÓXIMAMENTE!</Text>
      </View>
    );
  }  // Show carousel of ads
  return (
    <View style={styles.container}>
      <Carousel
        ref={carouselRef}
        data={ads || []}
        renderItem={renderItem}
        width={width * 0.9}
        height={200}
        onSnapToItem={(index) => setActiveSlide(index)}
        autoPlay={ads && ads.length > 1}
        autoPlayInterval={30000}
        mode="parallax"
        loop={ads && ads.length > 1}
      />
      
      {/* Custom pagination indicators */}
      {ads && ads.length > 1 && (
        <View style={styles.paginationContainer}>
          {ads.map((_, index) => (
            <View
              key={index}
              style={[
                styles.paginationDot,
                activeSlide === index ? {} : styles.paginationInactiveDot
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
    marginVertical: 20,
    alignItems: 'center',
  },  slide: {
    borderRadius: 15,
    overflow: 'hidden',
    height: 200,
    width: width * 0.9, // Use explicit width value based on screen width
    backgroundColor: '#F0F0F0', // Fallback background color
    // Add shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    justifyContent: 'center', // Center content in slide
    alignItems: 'center', // Center content in slide
  },
  adImage: {
    width: width * 0.9, // Use explicit width value
    height: 200,
    borderRadius: 15,
  },  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    zIndex: 1,
    borderRadius: 15,
  },
  emptyBanner: {
    width: '90%',
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 15,
    backgroundColor: '#F0F0F0',
    padding: 15,
    marginVertical: 20,
    alignSelf: 'center',
    // Add shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  title: {
    color: '#1C1C1E',
    fontSize: 14,
    textAlign: "center",
    marginVertical: 10,
  },
  subtitle: {
    color: "#fa6205",
    fontSize: 16,
    textAlign: "center",
    marginTop: 12,
  },  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 8
  },
  paginationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#fa6205'
  },
  paginationInactiveDot: {
    backgroundColor: '#777'
  }
});

export default AdCarousel;