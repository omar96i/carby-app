import React, { useCallback } from "react";
import { View, StatusBar } from "react-native";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import ChatComercioRider from "../ChatComercioRider";

/**
 * Chat con el conductor como pantalla independiente (stack navigation)
 * en vez de overlay: evita conflictos con ejecuciones en segundo
 * plano (polling, notificaciones) de la pantalla anterior.
 */
export default function ChatDriver() {
  const navigation = useNavigation();
  const route = useRoute();
  const { pedidoId, carreraId, conductorId, conductorNombre, conductorFoto, comercioId, tipo } = route.params || {};

  const handleClose = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.replace("BottomTabNavigatorAliado");
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ tabBarStyle: { display: "none" } });
      return () => {
        navigation.getParent()?.setOptions({
          tabBarStyle: { backgroundColor: "#FFF", height: 56, borderTopWidth: 1, borderTopColor: "#F0F0F0", display: "flex" },
        });
      };
    }, [navigation])
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ChatComercioRider
        pedidoId={pedidoId}
        carreraId={carreraId}
        conductorId={conductorId}
        conductorNombre={conductorNombre}
        comercioId={comercioId}
        tipo={tipo || "comercio-rider"}
        peerName={conductorNombre}
        peerAvatar={conductorFoto}
        onClose={handleClose}
        modalMode
        showHeader
      />
    </View>
  );
}
