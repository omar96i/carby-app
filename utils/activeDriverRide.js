import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../constants/url";

export const fetchActiveDriverCarrera = async () => {
  try {
    const token = await AsyncStorage.getItem("userToken");
    if (!token) return null;

    const response = await fetch(`${BASE_URL}carreras/conductor/activa`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data?.data || null;
  } catch (error) {
    console.error("Error verificando carrera activa del conductor:", error);
    return null;
  }
};
