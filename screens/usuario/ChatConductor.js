import React, { useCallback } from "react";
import { View, StatusBar } from "react-native";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import ChatUsuario from "../../components/ChatUsuario";

/**
 * Chat con el conductor como pantalla independiente (stack navigation)
 * en vez de overlay: evita conflictos con ejecuciones en segundo
 * plano (polling, notificaciones, audio) de la pantalla anterior.
 */
export default function ChatConductor() {
  const navigation = useNavigation();
  const route = useRoute();
  const { tripId, pedidoId, peerName, peerRole, peerAvatar, statusTitle, statusSub, statusTone } = route.params || {};

  const handleClose = useCallback(() => {
    const routes = navigation.getState()?.routes ?? [];
    if (routes.length > 1) navigation.goBack();
    else if (pedidoId) navigation.replace("PedidoDetalle", { pedidoId });
    else navigation.replace("DetalleCarrera", { tripId });
  }, [navigation, pedidoId, tripId]);

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
      <ChatUsuario
        tripId={tripId}
        showHeader
        peerName={peerName || "Repartidor"}
        peerRole={peerRole || "Chat del pedido"}
        peerAvatar={peerAvatar}
        headerId={tripId}
        statusTitle={statusTitle}
        statusSub={statusSub}
        statusTone={statusTone}
        onClose={handleClose}
      />
    </View>
  );
}
