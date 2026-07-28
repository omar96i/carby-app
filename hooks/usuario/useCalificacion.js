import { useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../../constants/url";
import logger from "../../utils/logger";

export default function useCalificacion() {
  const [modalVisible, setModalVisible] = useState(false);
  const [itemACalificar, setItemACalificar] = useState(null);
  const [calificacion, setCalificacion] = useState(0);
  const [comentario, setComentario] = useState("");
  const [enviandoCalificacion, setEnviandoCalificacion] = useState(false);

  const abrir = useCallback((item) => {
    setItemACalificar(item);
    setCalificacion(0);
    setComentario("");
    setModalVisible(true);
  }, []);

  const cerrar = useCallback(() => {
    setModalVisible(false);
    setItemACalificar(null);
  }, []);

  const enviar = useCallback(async (item, rating, comentarioText) => {
    if (!item || rating === 0) return;
    setEnviandoCalificacion(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };

      if (item.es_carrera) {
        const url = `${BASE_URL}carrera/${item.id}/calificar-conductor`;
        logger.request("POST", url, { puntuacion: rating, mensaje: comentarioText });
        await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify({ puntuacion: rating, mensaje: comentarioText }),
        });
      } else {
        const url = `${BASE_URL}pedidos/${item.id}/puntuacion`;
        logger.request("POST", url, { puntuacion_restaurante: rating, comentario_restaurante: comentarioText });
        await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify({
            puntuacion_restaurante: rating,
            comentario_restaurante: comentarioText,
          }),
        });
      }

      const stored = await AsyncStorage.getItem("pedidosCalificados");
      const lista = stored ? JSON.parse(stored) : [];
      lista.push(String(item.id));
      await AsyncStorage.setItem("pedidosCalificados", JSON.stringify(lista));

      setModalVisible(false);
      setItemACalificar(null);
      return true;
    } catch (e) {
      console.error("Error enviando calificación:", e);
      throw e;
    } finally {
      setEnviandoCalificacion(false);
    }
  }, []);

  return {
    modalVisible,
    itemACalificar,
    calificacion,
    comentario,
    enviandoCalificacion,
    abrir,
    cerrar,
    enviar,
    setCalificacion,
    setComentario,
  };
}
