import AsyncStorage from '@react-native-async-storage/async-storage';

// Reemplaza esta URL con la base de tu API
const API_URL = 'https://back.yariders.com/api';

export const getMyBalance = async () => {
    try {
        const token = await AsyncStorage.getItem('userToken');

        if (!token) {
            throw new Error('No se encontró el token de autenticación.');
        }

        const response = await fetch(`${API_URL}/getMyBalance`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error('Error al obtener el saldo de la billetera.');
        }

        const json = await response.json();

        // Devolvemos directamente el valor del balance
        return json.data.balance;

    } catch (error) {
        console.error("Error en getMyBalance:", error);
        // Devolvemos null o un valor por defecto en caso de error
        return null;
    }
};