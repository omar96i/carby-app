import React, { useCallback } from "react";
import { View, StatusBar } from "react-native";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import ChatReserva from "./usuario/ChatReserva";

/**
 * Chat de reserva como pantalla independiente (stack navigation)
 * en vez de overlay: evita conflictos con ejecuciones en segundo
 * plano (polling, notificaciones) de la pantalla anterior.
 * Sirve para usuario (usuario_id) y comercio (user_perfil_id).
 */
export default function ChatReservaView() {
  const navigation = useNavigation();
  const route = useRoute();
  const {
    reservaId, userPerfilId, chatTitle, chatAvatar,
    peerName, peerAvatar,
  } = route.params || {};

  const handleClose = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
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
      <ChatReserva
        reservaId={reservaId}
        userPerfilId={userPerfilId}
        chatTitle={chatTitle}
        chatAvatar={chatAvatar}
        peerName={peerName}
        peerAvatar={peerAvatar}
        onClose={handleClose}
        modalMode
        showHeader
      />
    </View>
  );
}
