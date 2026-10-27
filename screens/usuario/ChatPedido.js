import React, { useState, useEffect, useCallback } from "react";
import { View, StatusBar } from "react-native";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import OrderChatModal from "../../components/OrderChatModal";

/**
 * Chat del pedido como pantalla independiente (stack navigation)
 * en vez de overlay: evita conflictos con ejecuciones en segundo
 * plano (polling, notificaciones, audio) de la pantalla anterior.
 */
export default function ChatPedido() {
  const navigation = useNavigation();
  const route = useRoute();
  const { pedidoId, peerName, peerRole, peerAvatar, peerComercioId, senderRole, statusTitle, statusSub, statusTone } = route.params || {};
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem("userData").then((data) => {
      if (data) setUserInfo(JSON.parse(data));
    });
  }, []);

  useEffect(() => {
    if (!pedidoId) navigation.goBack();
  }, []);

  const handleClose = useCallback(() => {
    const routes = navigation.getState()?.routes ?? [];
    if (routes.length > 1) navigation.goBack();
    else navigation.replace("PedidoDetalle", { pedidoId });
  }, [navigation, pedidoId]);

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
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <OrderChatModal
        visible
        pedidoId={pedidoId}
        userInfo={userInfo}
        onClose={handleClose}
        peerName={peerName || "Comercio"}
        peerRole={peerRole || "Soporte del pedido"}
        peerAvatar={peerAvatar}
        peerComercioId={peerComercioId}
        senderRole={senderRole || "usuario"}
        statusTitle={statusTitle}
        statusSub={statusSub}
        statusTone={statusTone}
      />
    </View>
  );
}
