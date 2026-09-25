import React, { useState, useEffect, useCallback } from "react";
import {
  SafeAreaView,
  View,
  FlatList,
  SectionList,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Linking,
  Image,
  Modal,
  ScrollView,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useFonts, Montserrat_400Regular, Montserrat_700Bold, Montserrat_300Light, Montserrat_600SemiBold, Montserrat_800ExtraBold } from "@expo-google-fonts/montserrat";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useNotification } from "../../context/NotificationContext";
import AlertaModal from "../../components/ErrorModal";

import PedidosHeader from "../../components/usuario/pedidos/PedidosHeader";
import PedidosTabs from "../../components/usuario/pedidos/PedidosTabs";
import TripCard from "../../components/usuario/pedidos/TripCard";
import EmptyState from "../../components/usuario/pedidos/EmptyState";
import DetailSheet from "../../components/usuario/pedidos/DetailSheet";
import ChatComercioRider from "../ChatComercioRider";
import ChatReserva from "../usuario/ChatReserva";
import { COLORS, SHADOWS, RADIUS, formatCOP, formatDate, calcOrderCosts } from "../../components/usuario/pedidos/helpers";
import StatusBadge from "../../components/usuario/pedidos/StatusBadge";
import RouteStops from "../../components/usuario/pedidos/RouteStops";
import DriverRow from "../../components/usuario/pedidos/DriverRow";
import PaymentBadge from "../../components/usuario/pedidos/PaymentBadge";
import ReservaQrEvidencia from "../../components/usuario/pedidos/ReservaQrEvidencia";

import usePedidos from "../../hooks/comercio/usePedidos";
import useReservas from "../../hooks/comercio/useReservas";
import logger from "../../utils/logger";
import { BASE_URL } from "../../constants/url";

export default function PedidosComercio({ route }) {
  const navigation = useNavigation();
  const { notification } = useNotification();

  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_700Bold,
    Montserrat_300Light,
    Montserrat_600SemiBold,
    Montserrat_800ExtraBold,
  });

  const {
    pedidos, filteredPedidos, isLoading, error, refreshing,
    fetchPedidos, onRefresh, setFilteredPedidos,
    countActivas, countHistorial,
    aceptarPedido, crearCarrera,
  } = usePedidos();

  const {
    reservas, isLoading: loadingReservas,
    perfiles, perfilSeleccionado, setPerfilSeleccionado,
    fetchPerfiles, fetchReservas, aceptarReserva, completarReserva,
  } = useReservas();

  const [activeTab, setActiveTab] = useState("activas");
  const [selectedItem, setSelectedItem] = useState(null);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertData, setAlertData] = useState({ message: "", type: "info", onPrimary: null, primaryLabel: "" });

  // Evidencia modal
  const [evidenciaVisible, setEvidenciaVisible] = useState(false);
  const [evidenciaUrl, setEvidenciaUrl] = useState(null);
  const [chatItem, setChatItem] = useState(null);
  const [chatReserva, setChatReserva] = useState(null);

  const showAlert = (message, type = "info", onPrimary = null, primaryLabel = null) => {
    setAlertData({ message, type, onPrimary, primaryLabel });
    setAlertVisible(true);
  };

  useEffect(() => {
    setFilteredPedidos([]);
    fetchPedidos(activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "reservas") {
      fetchPerfiles().then((lista) => {
        if (lista && lista.length > 0 && !perfilSeleccionado) {
          setPerfilSeleccionado(lista[0].id);
        }
      });
    }
  }, [activeTab]);

  useEffect(() => {
    if (perfilSeleccionado) {
      fetchReservas(perfilSeleccionado);
    }
  }, [perfilSeleccionado]);

  useEffect(() => {
    if (!notification) return;
    fetchPedidos(activeTab);
    if (activeTab === "reservas" && perfilSeleccionado) {
      fetchReservas(perfilSeleccionado);
    } else if (notification?.request?.content?.data?.tipo === "chat_reserva" && perfilSeleccionado) {
      fetchReservas(perfilSeleccionado);
    }
  }, [notification]);

  useFocusEffect(
    useCallback(() => {
      fetchPedidos(activeTab);
      if (activeTab === "reservas" && perfilSeleccionado) {
        fetchReservas(perfilSeleccionado);
      }
    }, [activeTab, perfilSeleccionado])
  );

  const navigateToDetails = useCallback((item) => {
    if (!item?.id) return;
    setSelectedItem(null);
    const params = { pedidoId: item.id, pedidoData: item };
    setTimeout(() => {
      const parent = navigation.getParent?.();
      if (parent) parent.navigate("PedidoDetalleComercio", params);
      else navigation.navigate("PedidoDetalleComercio", params);
    }, 50);
  }, [navigation]);

  const handleAceptar = async (item) => {
    try {
      await aceptarPedido(item.id);
      showAlert("Pedido aceptado", "success");
      fetchPedidos(activeTab);
    } catch (e) {
      showAlert("Error al aceptar el pedido", "error");
    }
  };

  const handleCrearCarrera = async (item) => {
    showAlert(
      "¿Solicitar conductor?",
      "confirm",
      async () => {
        try {
          await crearCarrera(item);
          showAlert("Arrendamiento creado exitosamente", "success");
          fetchPedidos(activeTab);
        } catch (e) {
          showAlert("Error al crear el arrendamiento", "error");
        }
      },
      "Sí, solicitar"
    );
  };

  const handleChatRider = (item) => {
    if (!item.carrera?.conductor) {
      showAlert("No hay conductor asignado aún", "info");
      return;
    }
    const conductor = item.carrera.conductor;
    const fotoRaw = conductor.foto_documento_file || conductor.foto || conductor.imagen || conductor.foto_perfil || null;
    setChatItem({
      pedidoId: item.id,
      carreraId: item.carrera?.id,
      conductorId: conductor.id,
      conductorNombre: conductor.nombre_completo || "Conductor",
      conductorFoto: fotoRaw
        ? (fotoRaw.startsWith("http")
          ? fotoRaw
          : `${BASE_URL.toString().replace(/\/api\/?$/, "").replace(/\/$/, "")}/storage/${fotoRaw}`)
        : null,
      comercioId: item.comercio?.id || item.comercio_id,
      tipo: "comercio-rider",
    });
  };

  const handleVerEvidencia = (item) => {
    if (!item.archivo_evidencia) return;
    const url = item.archivo_evidencia.startsWith("http")
      ? item.archivo_evidencia
      : `${BASE_URL.toString().replace("/api", "")}/storage/${item.archivo_evidencia}`;
    setEvidenciaUrl(url);
    setEvidenciaVisible(true);
  };

  const handleChatReserva = (item) => {
    if (!item?.user_perfil_id) {
      showAlert("No se encontró el perfil de esta reserva", "error");
      return;
    }
    const clienteFoto = item.user?.foto_documento_file && item.user.foto_documento_file.startsWith("http")
      ? item.user.foto_documento_file
      : item.user?.foto_documento_file
        ? `${BASE_URL.toString().replace(/\/api\/?$/, "").replace(/\/$/, "")}/storage/${item.user.foto_documento_file}`
        : null;
    setChatReserva({
      reservaId: item.id,
      userPerfilId: item.user_perfil_id,
      chatTitle: item.user?.nombre_completo || item.cliente_nombre || "Cliente",
      chatAvatar: clienteFoto,
    });
  };

  const handleAceptarReserva = async (item) => {
    try {
      await aceptarReserva(item.id);
      showAlert("Reserva aceptada exitosamente", "success");
      if (perfilSeleccionado) fetchReservas(perfilSeleccionado);
    } catch (e) {
      showAlert("Error al aceptar la reserva", "error");
    }
  };

  const handleCompletarReserva = async (item) => {
    try {
      await completarReserva(item.id);
      showAlert("Reserva completada exitosamente", "success");
      if (perfilSeleccionado) fetchReservas(perfilSeleccionado);
    } catch (e) {
      showAlert("Error al completar la reserva", "error");
    }
  };

  // Render reserva card
  const renderReservaItem = ({ item }) => {
    const fechaFormateada = item.fecha_formateada || formatDate(item.fecha);
    const canAccept = item.estado === "pendiente";
    const canComplete = item.estado === "aceptado";
    const isDomicilio = item.tipo_reserva === "domicilio";
    const canShip = item.estado === "completado" && isDomicilio;
    const clienteFotoUrl = item.user?.foto_documento_file
      ? (item.user.foto_documento_file.startsWith("http")
        ? item.user.foto_documento_file
        : `${BASE_URL.toString().replace(/\/api\/?$/, "").replace(/\/$/, "")}/storage/${item.user.foto_documento_file}`)
      : null;
    const canChat = item.estado === "aceptado";

    let direccion = "";
    try {
      if (item.datos_generales) {
        const dg = typeof item.datos_generales === "string" ? JSON.parse(item.datos_generales) : item.datos_generales;
        direccion = dg.direccion || "";
      }
    } catch (e) {}

    return (
      <View style={[cs.card, SHADOWS.card]}>
        <View style={cs.header}>
          <View style={cs.iconBox}>
            <Ionicons name="calendar" size={20} color={COLORS.ink} />
          </View>
          <View style={cs.headerInfo}>
            <Text style={cs.title} numberOfLines={1}>{item.cliente_nombre || "Cliente"}</Text>
            <Text style={cs.sub}>Reserva #{item.id} · {fechaFormateada}</Text>
          </View>
          <View style={cs.statusWrap}>
            <StatusBadge status={item.estado} />
          </View>
        </View>
        <View style={cs.reservaBody}>
          <View style={cs.infoRow}><Text style={cs.infoLabel}>Perfil:</Text><Text style={cs.infoValue}>{item.servicio_nombre}</Text></View>
          <View style={cs.infoRow}><Text style={cs.infoLabel}>Tipo:</Text><Text style={cs.infoValue}>{isDomicilio ? "A domicilio" : "En local"}</Text></View>
          {item.hora_inicio ? <View style={cs.infoRow}><Text style={cs.infoLabel}>Horario:</Text><Text style={cs.infoValue}>{item.hora_inicio_formateada} - {item.hora_fin_formateada}</Text></View> : null}
          {!!direccion && <View style={cs.infoRow}><Text style={cs.infoLabel}>Dirección:</Text><Text style={cs.infoValue} numberOfLines={2}>{direccion}</Text></View>}
          <View style={cs.infoRow}><Text style={cs.infoLabel}>Precio:</Text><Text style={cs.infoValue}>{formatCOP(item.costo_total)}</Text></View>
          <View style={cs.infoRow}>
            <Text style={cs.infoLabel}>Pago:</Text>
            <Text style={cs.infoValue}>{String(item.metodo_pago || "efectivo").toLowerCase() === "qr" ? "QR" : "Efectivo"}{item.archivo_evidencia ? " · comprobante ✓" : (String(item.metodo_pago || "").toLowerCase() === "qr" ? " · sin comprobante" : "")}</Text>
          </View>
        </View>
        <View style={cs.clienteSection}>
          <View style={cs.clienteRow}>
            {clienteFotoUrl ? (
              <Image source={{ uri: clienteFotoUrl }} style={cs.clienteAvatar} />
            ) : (
              <View style={cs.clienteAvatarFallback}>
                <Ionicons name="person" size={16} color={COLORS.muted} />
              </View>
            )}
            <View style={cs.clienteInfo}>
              <Text style={cs.clienteLabel}>Cliente</Text>
              <Text style={cs.clienteNombre} numberOfLines={1}>{item.user?.nombre_completo || item.cliente_nombre || "Cliente"}</Text>
            </View>
            {canChat && (
              <TouchableOpacity style={cs.chatIconBtn} onPress={() => handleChatReserva(item)} activeOpacity={0.7}>
                <Ionicons name="chatbubble-ellipses" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
        </View>
        {canAccept && (
          <View style={cs.actions}>
            <TouchableOpacity style={cs.acceptBtn} onPress={() => handleAceptarReserva(item)}>
              <Ionicons name="checkmark-circle" size={18} color={COLORS.surface} />
              <Text style={cs.acceptText}>Aceptar reserva</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={cs.qrWrap}>
          <ReservaQrEvidencia reserva={item} variant="comercio" />
        </View>
        {canComplete && (
          <View style={cs.actions}>
            <TouchableOpacity style={cs.acceptBtn} onPress={() => handleCompletarReserva(item)}>
              <Ionicons name="checkmark-done-circle" size={18} color={COLORS.surface} />
              <Text style={cs.acceptText}>Completar reserva</Text>
            </TouchableOpacity>
          </View>
        )}
        {canShip && (
          <View style={cs.actions}>
            <TouchableOpacity style={cs.shipBtn} onPress={() => showAlert("Crear arrendamiento para esta reserva próximamente", "info")}>
              <Ionicons name="car" size={18} color={COLORS.surface} />
              <Text style={cs.shipText}>Solicitar conductor</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // Render commerce-specific TripCard with extra actions
  const renderItem = ({ item }) => {
    if (item.es_carrera) return null;

    const canAccept = item.estado === "pendiente";
    const canShip = item.estado === "aceptado" && !item.carrera;
    const hasCarrera = !!item.carrera;
    const costs = calcOrderCosts(item);
    const showCostBreakdown = costs.productos > 0;

    return (
      <View style={[cs.card, SHADOWS.card]}>
        {/* Header */}
        <View style={cs.header}>
          <View style={cs.iconBox}>
            <Ionicons name="cube" size={20} color={COLORS.ink} />
          </View>
          <View style={cs.headerInfo}>
            <Text style={cs.title} numberOfLines={1}>
              {item.usuario?.nombre_completo || "Cliente"}
            </Text>
            <Text style={cs.sub}>#{item.id} · {formatDate(item.created_at)}</Text>
          </View>
          <View style={cs.statusWrap}>
            <StatusBadge status={item.estado} type="pedido" />
          </View>
        </View>

        {/* Products */}
        {item.pedido_lists?.length > 0 && (
          <View style={cs.productPreview}>
            {item.pedido_lists[0]?.producto?.foto ? (
              <Image
                source={{ uri: item.pedido_lists[0].producto.foto.startsWith("http") ? item.pedido_lists[0].producto.foto : `${BASE_URL.toString().replace("/api", "")}/storage/${item.pedido_lists[0].producto.foto}` }}
                style={cs.productImg}
              />
            ) : (
              <View style={cs.productPlaceholder}>
                <Ionicons name="cube" size={14} color={COLORS.brand} />
              </View>
            )}
            <Text style={cs.productText} numberOfLines={2}>
              {item.pedido_lists.map((p) => `${p.cantidad}x ${p.producto?.nombre || "Producto"}`).join(", ")}
            </Text>
            <Text style={cs.productBadge}>
              {item.pedido_lists.reduce((s, p) => s + (p.cantidad || 0), 0)} art.
            </Text>
          </View>
        )}

        {/* Route */}
        <View style={cs.routeSection}>
          <RouteStops
            origin={{ label: "Recogida", address: item.start_lugar || "Establecimiento" }}
            destination={{ label: "Destino", address: item.end_lugar || "" }}
          />
        </View>

        {/* Driver */}
        {hasCarrera && (
          <View style={cs.driverSection}>
            {item.conductor ? (
              <View style={cs.driverRow}>
                <View style={{ flex: 1 }}>
                  <DriverRow driver={item.conductor} showEta />
                </View>
                {item.carrera?.id && (
                  <TouchableOpacity style={cs.chatIconBtn} onPress={() => handleChatRider(item)}>
                    <Ionicons name="chatbubble" size={18} color={COLORS.surface} />
                  </TouchableOpacity>
                )}
                {item.conductor.phone ? (
                  <TouchableOpacity style={cs.callBtn} onPress={() => Linking.openURL(`tel:${item.conductor.phone}`)}>
                    <Ionicons name="call" size={18} color={COLORS.surface} />
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : (
              <View style={cs.searchingRow}>
                <View style={cs.searchingIcon}>
                  <Ionicons name="search" size={16} color="#F59E0B" />
                </View>
                <Text style={cs.searchingText}>Buscando conductor…</Text>
              </View>
            )}
          </View>
        )}

        {/* Footer */}
        <View style={cs.footer}>
          <View style={cs.footerLeft}>
            {showCostBreakdown ? (
              <View style={cs.costsColumn}>
                <View style={cs.costRow}>
                  <Text style={cs.costLabel}>Pedido</Text>
                  <Text style={cs.costValue}>{formatCOP(costs.productos)}</Text>
                </View>
                <View style={cs.costRow}>
                  <Text style={cs.costLabel}>Envío</Text>
                  <Text style={cs.costValue}>{formatCOP(costs.delivery)}</Text>
                </View>
                <View style={[cs.costRow, cs.totalCostRow]}>
                  <Text style={cs.totalCostLabel}>Total</Text>
                  <Text style={cs.totalCostValue}>{formatCOP(costs.total)}</Text>
                </View>
              </View>
            ) : (
              <View>
                <Text style={cs.footerLabel}>Total</Text>
                <Text style={cs.footerPrice}>{formatCOP(item.costo_total)}</Text>
              </View>
            )}
            <PaymentBadge metodo={item.metodo_pago || "EFECTIVO"} />
          </View>
          <View style={cs.footerActions}>
            <TouchableOpacity style={cs.detailBtn} onPress={() => navigateToDetails(item)}>
              <Ionicons name="receipt-outline" size={20} color={COLORS.surface} />
            </TouchableOpacity>
            <TouchableOpacity style={cs.moreBtn} onPress={() => setSelectedItem(item)}>
              <Ionicons name="information-circle-outline" size={18} color={COLORS.brand} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Action buttons */}
        <View style={cs.actions}>
          {canAccept && (
            <TouchableOpacity style={cs.acceptBtn} onPress={() => handleAceptar(item)}>
              <Ionicons name="checkmark-circle" size={18} color={COLORS.surface} />
              <Text style={cs.acceptText}>Aceptar pedido</Text>
            </TouchableOpacity>
          )}
          {canShip && (
            <TouchableOpacity style={cs.shipBtn} onPress={() => handleCrearCarrera(item)}>
              <Ionicons name="car" size={18} color={COLORS.surface} />
              <Text style={cs.shipText}>Solicitar conductor</Text>
            </TouchableOpacity>
          )}
          {item.archivo_evidencia && (
            <TouchableOpacity style={cs.evidenceBtn} onPress={() => handleVerEvidencia(item)}>
              <Ionicons name="document-attach" size={16} color={COLORS.ink} />
              <Text style={cs.evidenceText}>Ver evidencia de pago</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (!fontsLoaded) {
    return <SafeAreaView style={cs.safe}><ActivityIndicator size="large" color={COLORS.brand} /></SafeAreaView>;
  }

  const reservaCount = reservas.length;

  const listData = activeTab === "reservas" ? reservas : filteredPedidos;

  return (
    <SafeAreaView style={cs.safe}>
      <View style={cs.root}>
        <PedidosHeader />
        <PedidosTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          counts={{ activas: countActivas, historial: countHistorial, reservas: reservaCount }}
        />

        {/* Profile selector for reservas tab */}
        {activeTab === "reservas" && perfiles.length > 0 && (
          <View style={cs.profileSelector}>
            <View style={cs.profileSelectorHeader}>
              <Ionicons name="people-outline" size={16} color={COLORS.muted} />
              <Text style={cs.profileSelectorTitle}>Selecciona un perfil</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {perfiles.map((p) => {
                const isSelected = perfilSeleccionado === p.id;
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[cs.profileChip, isSelected && cs.profileChipActive]}
                    onPress={() => setPerfilSeleccionado(p.id)}
                    activeOpacity={0.8}
                  >
                    <View style={[cs.profileDot, isSelected && cs.profileDotActive]} />
                    <Text style={[cs.profileChipText, isSelected && cs.profileChipTextActive]}>
                      {p.nombre}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {!perfilSeleccionado && activeTab === "reservas" ? (
          <View style={cs.center}>
            <EmptyState tab="reservas" />
          </View>
        ) : (isLoading || loadingReservas) ? (
          <View style={cs.center}><ActivityIndicator size="large" color={COLORS.brand} /></View>
        ) : error ? (
          <View style={cs.center}><EmptyState tab={activeTab} /></View>
        ) : activeTab === "reservas" ? (
          <SectionList
            sections={[
              {
                title: "Pendientes",
                data: reservas.filter((r) => r.estado === "pendiente"),
              },
              {
                title: "Aceptadas",
                data: reservas.filter((r) => r.estado === "aceptado"),
              },
              {
                title: "Completadas / Canceladas",
                data: reservas.filter((r) => ["completado", "confirmado", "cancelado"].includes(r.estado)),
              },
            ].filter((s) => s.data.length > 0)}
            renderItem={renderReservaItem}
            renderSectionHeader={({ section: { title } }) => (
              <Text style={cs.sectionHeader}>{title}</Text>
            )}
            keyExtractor={(item) => `reserva-${item.id}`}
            contentContainerStyle={cs.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => perfilSeleccionado && fetchReservas(perfilSeleccionado)} colors={[COLORS.brand]} />}
            ListEmptyComponent={<EmptyState tab="reservas" />}
            showsVerticalScrollIndicator={false}
            stickySectionHeadersEnabled={false}
          />
        ) : (
          <FlatList
            data={listData}
            renderItem={renderItem}
            keyExtractor={(item) => `${item.id}`}
            contentContainerStyle={cs.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => onRefresh(activeTab)} colors={[COLORS.brand]} />}
            ListEmptyComponent={<EmptyState tab={activeTab} />}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      <DetailSheet item={selectedItem} onClose={() => setSelectedItem(null)} onNavigate={navigateToDetails} />

      {/* Evidencia modal */}
      <Modal visible={evidenciaVisible} transparent animationType="fade" onRequestClose={() => setEvidenciaVisible(false)}>
        <View style={cs.evModal}>
          <View style={cs.evCard}>
            <TouchableOpacity style={cs.evClose} onPress={() => setEvidenciaVisible(false)}>
              <Ionicons name="close" size={22} color={COLORS.ink} />
            </TouchableOpacity>
            <Text style={cs.evTitle}>Evidencia de pago</Text>
            {evidenciaUrl && <Image source={{ uri: evidenciaUrl }} style={cs.evImage} resizeMode="contain" />}
          </View>
        </View>
      </Modal>

      <AlertaModal
        visible={alertVisible}
        mensaje={alertData.message}
        tipo={alertData.type}
        onCerrar={() => setAlertVisible(false)}
        onPrimary={alertData.onPrimary}
        primaryLabel={alertData.primaryLabel}
      />

      <Modal
        visible={!!chatReserva}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setChatReserva(null)}
      >
        {chatReserva && (
          <View style={cs.chatOverlay}>
            <TouchableOpacity
              style={cs.chatBackdrop}
              activeOpacity={1}
              onPress={() => setChatReserva(null)}
            />
            <View style={cs.chatPanel}>
              <View style={cs.chatHeader}>
                {chatReserva.chatAvatar ? (
                  <Image source={{ uri: chatReserva.chatAvatar }} style={cs.chatAvatarImg} />
                ) : (
                  <View style={cs.chatAvatar}>
                    <Ionicons name="person" size={20} color="#FFFFFF" />
                  </View>
                )}
                <View style={cs.chatHeaderText}>
                  <Text style={cs.chatTitle} numberOfLines={1}>
                    {chatReserva.chatTitle || "Cliente"}
                  </Text>
                  <Text style={cs.chatSub}>Reserva #{chatReserva.reservaId}</Text>
                </View>
                <TouchableOpacity
                  style={cs.closeChatBtn}
                  onPress={() => setChatReserva(null)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
              <View style={cs.chatBody}>
                <ChatReserva
                  reservaId={chatReserva.reservaId}
                  userPerfilId={chatReserva.userPerfilId}
                  chatTitle={chatReserva.chatTitle}
                  chatAvatar={chatReserva.chatAvatar}
                  onClose={() => setChatReserva(null)}
                  modalMode={true}
                />
              </View>
            </View>
          </View>
        )}
      </Modal>

      <Modal
        visible={!!chatItem}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setChatItem(null)}
      >
        {chatItem && (
          <View style={cs.chatOverlay}>
            <TouchableOpacity
              style={cs.chatBackdrop}
              activeOpacity={1}
              onPress={() => setChatItem(null)}
            />
            <View style={cs.chatPanel}>
              <View style={cs.chatHeader}>
                {chatItem.conductorFoto ? (
                  <Image source={{ uri: chatItem.conductorFoto }} style={cs.chatAvatarImg} />
                ) : (
                  <View style={cs.chatAvatar}>
                    <Ionicons name="person" size={20} color="#FFFFFF" />
                  </View>
                )}
                <View style={cs.chatHeaderText}>
                  <Text style={cs.chatTitle} numberOfLines={1}>
                    {chatItem.conductorNombre || "Conductor"}
                  </Text>
                  <Text style={cs.chatSub}>Pedido #{chatItem.pedidoId}</Text>
                </View>
                <TouchableOpacity
                  style={cs.closeChatBtn}
                  onPress={() => setChatItem(null)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
              <View style={cs.chatBody}>
                <ChatComercioRider
                  pedidoId={chatItem.pedidoId}
                  carreraId={chatItem.carreraId}
                  conductorId={chatItem.conductorId}
                  conductorNombre={chatItem.conductorNombre}
                  comercioId={chatItem.comercioId}
                  tipo={chatItem.tipo}
                  onClose={() => setChatItem(null)}
                  modalMode={true}
                />
              </View>
            </View>
          </View>
        )}
      </Modal>
    </SafeAreaView>
  );
}

const cs = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  root: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32, gap: 14 },

  card: { backgroundColor: COLORS.surface, borderRadius: 26, borderWidth: 1, borderColor: COLORS.zinc100 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingTop: 16 },
  iconBox: { width: 48, height: 48, borderRadius: 16, backgroundColor: COLORS.zinc50, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: COLORS.zinc200 },
  headerInfo: { flex: 1, minWidth: 0 },
  statusWrap: { flexShrink: 0, maxWidth: "46%" },
  title: { fontSize: 16, fontFamily: "Montserrat_800ExtraBold", color: COLORS.ink },
  sub: { fontSize: 11, fontFamily: "Montserrat_600SemiBold", color: COLORS.muted, marginTop: 1 },

  productPreview: { marginHorizontal: 16, marginTop: 12, flexDirection: "row", alignItems: "center", backgroundColor: "rgba(253,238,226,0.5)", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, gap: 8 },
  productImg: { width: 40, height: 40, borderRadius: 8, backgroundColor: COLORS.zinc100 },
  productPlaceholder: { width: 40, height: 40, borderRadius: 8, backgroundColor: COLORS.zinc100, justifyContent: "center", alignItems: "center" },
  productText: { flex: 1, fontSize: 12, fontFamily: "Montserrat_700Bold", color: COLORS.ink, lineHeight: 16 },
  productBadge: { fontSize: 10, fontFamily: "Montserrat_800ExtraBold", color: COLORS.brand, backgroundColor: COLORS.surface, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },

  routeSection: { paddingHorizontal: 16, paddingTop: 16 },
  driverSection: { marginHorizontal: 16, marginTop: 12, backgroundColor: COLORS.zinc50, borderRadius: 16, padding: 12 },
  driverRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  callBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.brand, justifyContent: "center", alignItems: "center", ...SHADOWS.ctaDark },
  chatIconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.ink, justifyContent: "center", alignItems: "center", marginRight: 8, ...SHADOWS.ctaDark },
  searchingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  searchingIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surface, justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  searchingText: { fontSize: 12, fontFamily: "Montserrat_800ExtraBold", color: COLORS.ink },

  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: COLORS.zinc200, borderStyle: "dashed", marginTop: 12, overflow: "hidden" },
  footerLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1, overflow: "hidden" },
  costsColumn: { gap: 2 },
  costRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  costLabel: { fontSize: 10, fontFamily: "Montserrat_600SemiBold", color: COLORS.muted, minWidth: 44 },
  costValue: { fontSize: 12, fontFamily: "Montserrat_700Bold", color: COLORS.ink },
  totalCostRow: { marginTop: 2, paddingTop: 2, borderTopWidth: 1, borderTopColor: COLORS.zinc200, borderStyle: "dashed" },
  totalCostLabel: { fontSize: 10, fontFamily: "Montserrat_800ExtraBold", textTransform: "uppercase", letterSpacing: 0.8, color: COLORS.ink, minWidth: 44 },
  totalCostValue: { fontSize: 15, fontFamily: "Montserrat_800ExtraBold", color: COLORS.brand, letterSpacing: -0.3 },
  footerLabel: { fontSize: 9, fontFamily: "Montserrat_800ExtraBold", textTransform: "uppercase", letterSpacing: 1, color: COLORS.muted },
  footerPrice: { fontSize: 19, fontFamily: "Montserrat_800ExtraBold", color: COLORS.ink },
  footerActions: { flexDirection: "row", gap: 8, flexShrink: 0 },
  detailBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.ink, justifyContent: "center", alignItems: "center", flexShrink: 0 },
  moreBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: COLORS.zinc200, justifyContent: "center", alignItems: "center", flexShrink: 0 },

  actions: { paddingHorizontal: 16, paddingBottom: 14, gap: 8 },
  qrWrap: { paddingBottom: 4 },
  acceptBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: COLORS.brand, paddingVertical: 12, borderRadius: 14 },
  acceptText: { fontSize: 14, fontFamily: "Montserrat_800ExtraBold", color: COLORS.surface },
  shipBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: COLORS.ink, paddingVertical: 12, borderRadius: 14 },
  shipText: { fontSize: 14, fontFamily: "Montserrat_800ExtraBold", color: COLORS.surface },
  chatBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 8 },
  chatText: { fontSize: 13, fontFamily: "Montserrat_700Bold", color: COLORS.brand },
  evidenceBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 8 },
  evidenceText: { fontSize: 13, fontFamily: "Montserrat_600SemiBold", color: COLORS.muted },

  evModal: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 20 },
  evCard: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 20, width: "100%", maxHeight: "80%" },
  evClose: { alignSelf: "flex-end", width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.zinc100, justifyContent: "center", alignItems: "center", marginBottom: 10 },
  evTitle: { fontSize: 18, fontFamily: "Montserrat_800ExtraBold", color: COLORS.ink, textAlign: "center", marginBottom: 16 },
  evImage: { width: "100%", height: 300, borderRadius: 12, backgroundColor: COLORS.zinc100 },
  profileSelector: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.zinc100,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  profileSelectorHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  profileSelectorTitle: {
    fontSize: 13,
    fontFamily: "Montserrat_700Bold",
    color: COLORS.ink,
  },
  profileChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: COLORS.zinc50,
    borderWidth: 1,
    borderColor: COLORS.zinc200,
    marginRight: 8,
  },
  profileChipActive: {
    backgroundColor: COLORS.brand,
    borderColor: COLORS.brand,
  },
  profileDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.zinc400,
  },
  profileDotActive: {
    backgroundColor: COLORS.surface,
  },
  profileChipText: {
    fontSize: 12,
    fontFamily: "Montserrat_600SemiBold",
    color: COLORS.ink,
  },
  profileChipTextActive: {
    color: COLORS.surface,
    fontFamily: "Montserrat_700Bold",
  },
  sectionHeader: {
    fontSize: 13,
    fontFamily: "Montserrat_800ExtraBold",
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  reservaBody: { paddingHorizontal: 16, paddingTop: 8 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  infoLabel: { fontSize: 12, fontFamily: "Montserrat_600SemiBold", color: COLORS.muted },
  infoValue: { fontSize: 12, fontFamily: "Montserrat_700Bold", color: COLORS.ink },
  clienteSection: { marginHorizontal: 16, marginTop: 12, backgroundColor: COLORS.zinc50, borderRadius: 16, padding: 12 },
  clienteRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  clienteAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.zinc100 },
  clienteAvatarFallback: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.zinc200, justifyContent: "center", alignItems: "center" },
  clienteInfo: { flex: 1, minWidth: 0 },
  clienteLabel: { fontSize: 9, fontFamily: "Montserrat_800ExtraBold", textTransform: "uppercase", letterSpacing: 0.8, color: COLORS.muted },
  clienteNombre: { fontSize: 13, fontFamily: "Montserrat_700Bold", color: COLORS.ink, marginTop: 1 },

  chatOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15,23,42,0.35)" },
  chatBackdrop: { ...StyleSheet.absoluteFillObject },
  chatPanel: { height: "70%", backgroundColor: "#FFFFFF", borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: "hidden" },
  chatHeader: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FF5500", paddingHorizontal: 16, paddingVertical: 14 },
  chatAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.25)", justifyContent: "center", alignItems: "center" },
  chatAvatarImg: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.25)" },
  chatHeaderText: { flex: 1 },
  chatTitle: { fontSize: 16, fontFamily: "Montserrat_700Bold", color: "#FFFFFF" },
  chatSub: { fontSize: 11, fontFamily: "Montserrat_600SemiBold", color: "rgba(255,255,255,0.85)", marginTop: 2 },
  closeChatBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.25)", justifyContent: "center", alignItems: "center" },
  chatBody: { flex: 1 },
});
