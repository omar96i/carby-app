import React, { useCallback } from "react";
import { View, StatusBar } from "react-native";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import ChatRiderComercio from "../ChatRiderComercio";

/**
 * Chat con el comercio como pantalla independiente (stack navigation)
 * en vez de overlay: evita conflictos con ejecuciones en segundo
 * plano (polling, notificaciones) de la pantalla anterior.
 */
export default function ChatComercio() {
  const navigation = useNavigation();
  const route = useRoute();
  const { pedidoId, carreraId, comercioId, comercioNombre, peerName, peerAvatar, tipo } = route.params || {};

  const handleClose = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.replace("BottomTabNavigatorDelivery");
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
      <ChatRiderComercio
        pedidoId={pedidoId}
        carreraId={carreraId}
        comercioId={comercioId}
        comercioNombre={comercioNombre}
        peerName={peerName}
        peerAvatar={peerAvatar}
        tipo={tipo || "rider-comercio"}
        onClose={handleClose}
        modalMode
        showHeader
      />
    </View>
  );
}
