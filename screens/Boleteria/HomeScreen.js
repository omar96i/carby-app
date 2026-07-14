import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    ImageBackground,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    ActionSheetIOS,
    Platform,
    Image,
    Modal,
    ScrollView,
    TextInput,
    Alert,
    SafeAreaView
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Picker } from "@react-native-picker/picker";
import DatePickerComponent from "../../components/DatePickerComponent";
import colombiaData from "../../BaseColombia/colombia.json";
import { Ionicons } from '@expo/vector-icons';
import { Feather } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useIsFocused } from '@react-navigation/native';
import { API_SECRET_TOKEN } from '../../utils/token'
export default function BoleteriaScreen({ navigation }) {
    const [fechaSeleccionada, setFechaSeleccionada] = useState("");
    const [mostrarFiltros, setMostrarFiltros] = useState(false);
    const [departamento, setDepartamento] = useState('');
    const [ciudad, setCiudad] = useState('');
    const [distrito, setDistrito] = useState('');
    const [eventos, setEventos] = useState([]);
    const [eventosFiltrados, setEventosFiltrados] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [eventoSeleccionado, setEventoSeleccionado] = useState(null);
    const [localidadSeleccionada, setLocalidadSeleccionada] = useState(null);
    const [showImageFull, setShowImageFull] = useState(false);
    const [cantidades, setCantidades] = useState({});
    const [nombreEvento, setNombreEvento] = useState('');
    const departamentos = colombiaData.map((d) => d.departamento);
    const ciudades = departamento
        ? colombiaData.find((d) => d.departamento === departamento)?.ciudades.map((c) => c.ciudad)
        : [];
    const distritos = ciudad
        ? colombiaData
            .find((d) => d.departamento === departamento)
            ?.ciudades.find((c) => c.ciudad === ciudad)
            ?.distritos || []
        : [];
    const [compra, setCompra] = useState({
        localidadId: null,
        cantidad: ''
    });
    const isFocused = useIsFocused();

    const Selector = ({ label, value, options, onSelect }) => {
        const showActionSheet = () => {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options: ['Cancelar', ...options],
                    cancelButtonIndex: 0,
                },
                (buttonIndex) => {
                    if (buttonIndex !== 0) {
                        onSelect(options[buttonIndex - 1]);
                    }
                }
            );
        };

        return (
            <>
                <Text style={styles.label}>{label}</Text>
                {Platform.OS === 'ios' ? (
                    <TouchableOpacity
                        onPress={showActionSheet}
                        style={styles.selectorTouchable}
                    >
                        <Text style={{ color: value ? '#000' : '#999' }}>
                            {value || `Selecciona ${label.toLowerCase()}`}
                        </Text>
                    </TouchableOpacity>
                ) : (
                    <View style={{
                        borderWidth: 1,
                        borderColor: '#ccc',
                        borderRadius: 8,
                        paddingHorizontal: 12,
                        marginBottom: 8,
                        backgroundColor: '#fff',
                    }}>
                        <Picker
                            selectedValue={value}
                            onValueChange={onSelect}
                            style={{ color: '#000', height: 50 }}
                            dropdownIconColor="#000" // ícono también visible
                        >
                            <Picker.Item
                                label={`Selecciona ${label.toLowerCase()}`}
                                value=""
                                color="#999"
                            />
                            {options.map((opt, i) => (
                                <Picker.Item
                                    key={i}
                                    label={opt}
                                    value={opt}
                                    color="#000"
                                />
                            ))}
                        </Picker>
                    </View>
                )}
            </>
        );
    };

    const handleVerDetalles = (evento) => {
        setEventoSeleccionado(evento); // Guarda el evento completo en el estado
        setModalVisible(true);        // Abre el modal
    };

    const handleCompra = () => {
        console.log(eventoSeleccionado)
        if (eventoSeleccionado?.estado_compra === 'Activa') {
            // 1. Encontrar la localidad seleccionada por su ID desde el nuevo estado
            const localidadSeleccionada = eventoSeleccionado.localidades.find(
                loc => loc.id === compra.localidadId
            );

            // 2. Verificar que se haya seleccionado una localidad
            if (!localidadSeleccionada) {
                Alert.alert('Selección Requerida', 'Por favor, ingresa una cantidad en una localidad.');
                return;
            }

            // 3. Verificar que la cantidad sea válida
            const cantidadNumerica = parseInt(compra.cantidad || '0', 10);
            if (cantidadNumerica <= 0) {
                Alert.alert(
                    'Cantidad Inválida',
                    'Por favor, ingresa una cantidad mayor a cero.'
                );
                return;
            }

            const datosParaPago = {
                localidad: localidadSeleccionada,
                cantidad: cantidadNumerica,
            };
            setModalVisible(false)
            navigation.navigate('PaymentScreenBoleteria', datosParaPago);
        } else {
            Alert.alert(
                'La venta no esta disponible',
                'La venta de boleteria no esta disponible en el momento'
            );
        }

    };

    const handleIncrement = (localidad) => {
        // Si se está cambiando de localidad, se empieza en 1.
        // Si ya es la localidad seleccionada, se suma 1 a la cantidad actual.
        const currentQty = compra.localidadId === localidad.id ? parseInt(compra.cantidad || '0', 10) : 0;
        const newQty = currentQty + 1;

        const disponibilidad = localidad.disponibilidad_venta ?? 0;

        // No permitir que la cantidad exceda la disponibilidad
        if (newQty <= disponibilidad) {
            setCompra({
                localidadId: localidad.id,
                cantidad: newQty.toString(),
            });
        }
    };

    const handleDecrement = (localidad) => {
        // Solo se puede decrementar si es la localidad ya seleccionada
        if (compra.localidadId !== localidad.id) return;

        const currentQty = parseInt(compra.cantidad || '0', 10);
        const newQty = currentQty - 1;

        // No permitir que la cantidad sea menor a 0
        if (newQty >= 0) {
            setCompra({
                localidadId: localidad.id,
                cantidad: newQty.toString(),
            });
        }
    };

    useEffect(() => {
        const filtrarEventos = () => {
            let filtrados = eventos;

            // --- NUEVO FILTRO POR NOMBRE ---
            if (nombreEvento) {
                filtrados = filtrados.filter(e =>
                    // Compara los nombres en minúsculas para una búsqueda flexible
                    e.nombre.toLowerCase().includes(nombreEvento.toLowerCase())
                );
            }

            if (departamento) {
                filtrados = filtrados.filter(e => e.departamento === departamento);
            }

            if (ciudad) {
                filtrados = filtrados.filter(e => e.ciudad === ciudad);
            }

            if (distrito) {
                filtrados = filtrados.filter(e => e.distrito === distrito);
            }

            if (fechaSeleccionada) {
                // Reemplazar "/" por "-" para asegurar compatibilidad
                const fechaNormalizada = fechaSeleccionada.replace(/\//g, "-");

                const fechaFiltro = new Date(fechaNormalizada).toISOString().split('T')[0];
                console.log("Filtro:", fechaFiltro);

                filtrados = filtrados.filter(e => {
                    if (!e.fecha_evento) {
                        return false;
                    }

                    const fechaEvento = new Date(e.fecha_evento.replace(/\//g, "-")).toISOString().split('T')[0];
                    return fechaEvento === fechaFiltro;
                });
            }

            setEventosFiltrados(filtrados);
        };

        filtrarEventos();
    }, [nombreEvento, departamento, ciudad, distrito, fechaSeleccionada, eventos]);

    const renderItem = ({ item }) => {
        const precios = item.localidades?.map(l => l.precio) || [];
        const precioMin = precios.length > 0 ? Math.min(...precios) : null;
        const horaFormateada = item.hora_apertura_puertas ? item.hora_apertura_puertas.substring(0, 5) : 'N/A';
        const estadoCompra = item.estado_compra || 'No disponible';
        const isVentaActiva = estadoCompra === 'Activa';

        // Determina el estilo del badge de estado
        const getStatusStyle = () => {
            switch (estadoCompra) {
                case 'Activa': return styles.statusActiva;
                case 'Próximamente': return styles.statusProximamente;
                case 'Finalizada': return styles.statusFinalizada;
                default: return styles.statusNoDisponible;
            }
        };

        return (
            <TouchableOpacity style={styles.card} onPress={() => handleVerDetalles(item)} activeOpacity={0.8}>
                <View style={styles.imageContainer}>
                    <Image
                        source={{ uri: `https://boleteria.yariders.com/storage/${item.imagen_principal}` }}
                        style={styles.image}
                    />
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{item.tipo_evento}</Text>
                    </View>
                    {precioMin !== null && (
                        <View style={styles.priceTag}>
                            <Text style={styles.priceText}>Desde S/ {precioMin}</Text>
                        </View>
                    )}
                </View>

                <View style={styles.content}>
                    <Text style={styles.eventName}>{item.nombre}</Text>
                    <Text style={styles.artistas}>
                        {item.artistas_participantes?.map(a => a).join(' • ')}
                    </Text>

                    {/* --- NUEVO: Indicador de Estado de Compra --- */}
                    <View style={[styles.statusContainer, getStatusStyle()]}>
                        <Icon
                            name={isVentaActiva ? 'check-circle' : (estadoCompra === 'Próximamente' ? 'clock' : 'x-circle')}
                            size={16}
                            color="#fff"
                        />
                        <Text style={styles.statusText}>{estadoCompra}</Text>
                    </View>

                    <View style={styles.infoGrid}>
                        <View style={styles.infoItem}>
                            <Icon name="calendar" size={16} color="#8d24b6" />
                            <Text style={styles.infoText}>
                                {item.fecha_evento ? new Date(item.fecha_evento).toLocaleDateString('es-PE', {
                                    day: 'numeric', month: 'short',
                                }) : 'Fecha no definida'}
                            </Text>
                        </View>
                        <View style={styles.infoItem}>
                            <Icon name="clock" size={16} color="#8d24b6" />
                            <Text style={styles.infoText}>{horaFormateada}</Text>
                        </View>
                    </View>
                    <View style={[styles.infoItem, { marginTop: 8 }]}>
                        <Icon name="map-pin" size={16} color="#8d24b6" />
                        <Text style={styles.infoText} numberOfLines={1}>{item.lugar_nombre}, {item.ciudad}</Text>
                    </View>
                </View>

                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.detailsButton, !isVentaActiva && styles.detailsButtonDisabled]}
                        onPress={() => handleVerDetalles(item)}
                    >
                        <Text style={styles.detailsButtonText}>
                            {isVentaActiva ? 'Comprar Boletas' : 'Ver Detalles'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    };

    const fetchEventos = useCallback(async () => {
        try {
            const response = await fetch('https://boleteria.yariders.com/api/getEventos', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-API-KEY': API_SECRET_TOKEN
                }
            });
            const json = await response.json();
            if (json.status && Array.isArray(json.data)) {
                setEventos(json.data);
                setEventosFiltrados(json.data); // Inicialmente, los filtrados son todos los eventos
            }
        } catch (error) {
            console.error('Error al obtener eventos:', error);
            Alert.alert("Error", "No se pudieron cargar los eventos.");
        }
    }, []);

    useEffect(() => {
        if (isFocused) {
            console.log("estoy focus")
            handleClearFilters();
            fetchEventos();
        }
    }, [isFocused, fetchEventos]);

    const handleClearFilters = () => {
        setNombreEvento('');
        setDepartamento('');
        setCiudad('');
        setDistrito('');
        setFechaSeleccionada(null);
        setCantidades({});
        setModalVisible(false);
        setLocalidadSeleccionada(null)
        setCompra({
            localidadId: null,
            cantidad: ''
        })
    };

    return (
        <View style={styles.container}>
            <View style={{ padding: 16 }}>
                <View style={styles.headerContainer}>
                    <Image
                        source={require('../../assets/images/logo-boleteria-yariders.png')}
                        style={styles.logo}
                    />

                    <View style={styles.iconsContainer}>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('MisCompras')}
                            style={styles.iconButton}
                        >
                            <Ionicons name="ticket-outline" size={26} color="#333" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => setMostrarFiltros(!mostrarFiltros)}
                            style={styles.iconButton}
                        >
                            <Ionicons name="search" size={24} color="#333" />
                        </TouchableOpacity>
                    </View>
                </View>
                <Modal
                    animationType="slide"
                    transparent={false}
                    visible={mostrarFiltros}
                    onRequestClose={() => setMostrarFiltros(false)}
                >
                    <SafeAreaView style={styles.modalSafeArea}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.filterTitle}>Filtrar Eventos</Text>
                            <TouchableOpacity onPress={() => setMostrarFiltros(false)}>
                                <Icon name="x" size={28} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalScrollView}>
                            <View style={styles.filterContainer}>
                                <View style={styles.inputContainer}>
                                    <Icon name="search" size={20} color="#999" />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Buscar por nombre de evento..."
                                        placeholderTextColor="#999"
                                        value={nombreEvento}
                                        onChangeText={setNombreEvento}
                                    />
                                </View>

                                <Text style={styles.filterSubtitle}>Ubicación</Text>
                                <Selector
                                    label="Departamento"
                                    value={departamento}
                                    options={departamentos}
                                    onSelect={(value) => { setDepartamento(value); setCiudad(''); setDistrito(''); }}
                                />
                                {ciudades.length > 0 && (
                                    <Selector
                                        label="Ciudad"
                                        value={ciudad}
                                        options={ciudades}
                                        onSelect={(value) => { setCiudad(value); setDistrito(''); }}
                                    />
                                )}
                                {distritos.length > 0 && (
                                    <Selector
                                        label="Distrito"
                                        value={distrito}
                                        options={distritos}
                                        onSelect={(value) => setDistrito(value)}
                                    />
                                )}

                                <Text style={styles.filterSubtitle}>Fecha del Evento</Text>
                                <DatePickerComponent
                                    fechaNacimiento={fechaSeleccionada}
                                    setFechaNacimiento={setFechaSeleccionada}
                                />
                            </View>
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity style={styles.clearButton} onPress={handleClearFilters}>
                                <Text style={styles.clearButtonText}>Limpiar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.applyButton} onPress={() => setMostrarFiltros(false)}>
                                <Text style={styles.applyButtonText}>Ver Resultados</Text>
                            </TouchableOpacity>
                        </View>
                    </SafeAreaView>
                </Modal>
            </View>

            <FlatList
                data={eventosFiltrados}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderItem}
                contentContainerStyle={{ padding: 16 }}
                showsVerticalScrollIndicator={false}
            />

            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        {!showImageFull ? (
                            <>
                                <ScrollView showsVerticalScrollIndicator={false}>
                                    <View style={styles.coverContainer}>
                                        {eventoSeleccionado?.imagen_principal ? (
                                            <Image
                                                source={{ uri: `https://boleteria.yariders.com/storage/${eventoSeleccionado.imagen_principal}` }}
                                                style={styles.coverImage}
                                            />
                                        ) : (
                                            <View style={styles.coverPlaceholder}>
                                                <Feather name="image" size={32} color="#999" />
                                                <Text style={{ color: '#999' }}>Sin imagen</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={styles.modalTitle}>{eventoSeleccionado?.nombre}</Text>
                                    <Text style={styles.modalSub}>{eventoSeleccionado?.tipo_evento}</Text>


                                    <View style={styles.infoCardContainer}>
                                        <View style={styles.infoRow}>
                                            <Feather name="users" size={16} color="#8d24b6" />
                                            <Text style={styles.modalText}>
                                                {eventoSeleccionado?.artistas_participantes.map(a => a).join(' • ')}
                                            </Text>
                                        </View>
                                        <View style={styles.infoRowGroup}>
                                            <View style={styles.infoRow}>
                                                <Feather name="calendar" size={16} color="#8d24b6" />
                                                <Text style={styles.modalText}>
                                                    {eventoSeleccionado?.fecha_evento}
                                                </Text>
                                            </View>
                                            <View style={styles.infoRow}>
                                                <Feather name="log-in" size={16} color="#8d24b6" />
                                                <Text style={styles.modalText}>Apertura: {eventoSeleccionado?.hora_apertura_puertas}</Text>
                                            </View>
                                        </View>
                                        <View style={styles.infoRow}>
                                            <Feather name="map-pin" size={16} color="#8d24b6" />
                                            <Text style={styles.modalText}>
                                                {eventoSeleccionado?.departamento}, {eventoSeleccionado?.ciudad}, {eventoSeleccionado?.distrito} - {eventoSeleccionado?.lugar_direccion}
                                            </Text>
                                        </View>
                                        {eventoSeleccionado?.descripcion_larga && (
                                            <View style={styles.infoRow}>
                                                <Feather name="info" size={16} color="#8d24b6" />
                                                <Text style={styles.modalText}>{eventoSeleccionado?.descripcion_larga}</Text>
                                            </View>
                                        )}

                                    </View>
                                    <Text style={styles.sectionTitle}>Distribución</Text>
                                    <TouchableOpacity
                                        style={styles.fullscreenContainer}
                                        onPress={() => setShowImageFull(true)}
                                        activeOpacity={1}
                                    >
                                        <Image
                                            source={{ uri: `https://boleteria.yariders.com/storage/${eventoSeleccionado?.imagen_distribucion_asientos}` }}
                                            style={styles.distribucionImage}
                                            resizeMode="contain"
                                        />
                                    </TouchableOpacity>

                                    <Text style={styles.sectionTitle}>Localidades</Text>
                                    <View style={styles.localidadesContainer}>
                                        {eventoSeleccionado?.localidades.map((loc) => (
                                            <TouchableOpacity
                                                key={loc.id}
                                                style={[
                                                    styles.localidadItem,
                                                ]}
                                                activeOpacity={0.8}
                                            >
                                                <Text style={styles.localidadNombre}>{loc.nombre}</Text>
                                                <Text style={styles.localidadPrecio}>S/ {loc.precio}</Text>
                                                <Text style={styles.localidadSubText}>Aforo total: {loc.aforo}</Text>
                                                <Text style={styles.localidadSubText}>
                                                    Disponibles para venta: {loc.disponibilidad_venta ?? '0'}
                                                </Text>

                                                <View style={styles.quantitySelectorContainer}>
                                                    <TouchableOpacity
                                                        style={styles.quantityButton}
                                                        onPress={() => handleDecrement(loc)}
                                                    >
                                                        <Text style={styles.quantityButtonText}>-</Text>
                                                    </TouchableOpacity>
                                                    <Text style={styles.quantityText}>
                                                        {compra.localidadId === loc.id ? compra.cantidad : '0'}
                                                    </Text>

                                                    <TouchableOpacity
                                                        style={styles.quantityButton}
                                                        onPress={() => handleIncrement(loc)}
                                                    >
                                                        <Text style={styles.quantityButtonText}>+</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                    <TouchableOpacity
                                        onPress={handleCompra}
                                        style={[
                                            styles.buttonBase,
                                            eventoSeleccionado?.estado_compra === 'Activa'
                                                ? styles.buttonBuy
                                                : styles.buttonDisabled,
                                        ]}

                                    >
                                        <Text style={styles.buttonText}>
                                            {eventoSeleccionado?.estado_compra === 'Activa'
                                                ? 'Comprar'
                                                : eventoSeleccionado?.estado_compra
                                            }
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.buttonClose}>
                                        <Text style={styles.buttonCloseText}>Cerrar</Text>
                                    </TouchableOpacity>
                                </ScrollView>

                            </>
                        ) : (
                            <>
                                <Text style={styles.sectionTitle}>Distribución</Text>
                                <TouchableOpacity onPress={() => setShowImageFull(false)}>
                                    <Image
                                        source={{ uri: `https://boleteria.yariders.com/storage/${eventoSeleccionado?.imagen_distribucion_asientos}` }}
                                        style={styles.distribucionImage2}
                                        resizeMode="contain"
                                    />
                                </TouchableOpacity>
                            </>
                        )}

                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
    },
    badgeContainer: {
        position: 'absolute',
        top: 12,
        left: 12,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    rowItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flex: 1, // Permite que el texto se ajuste si es largo
    },
    verDetallesButton: {
        backgroundColor: '#8d24b6', // Color principal de la app
        borderRadius: 8,
        marginTop: 12,
        paddingVertical: 12,
        alignItems: 'center',
    },
    verDetallesText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    filterButton: {
        backgroundColor: '#fff',
        paddingVertical: 6,
        paddingHorizontal: 14,
        borderRadius: 20,
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#e5e7eb', // gris claro
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    filterText: {
        fontSize: 14,
        color: '#111827',
        fontWeight: '500',
    },
    selectorTouchable: {
        padding: 12,
        backgroundColor: '#f9f9f9',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#ccc',
        marginBottom: 12,
    },
    selectorText: {
        fontSize: 16,
        color: '#000',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        padding: 16,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        maxHeight: '90%',
    },
    coverContainer: {
        width: '100%',
        height: 200,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#eee',
        marginBottom: 12,
    },
    coverImage: {
        width: '100%',
        height: '100%',
    },
    coverPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#222',
    },
    modalSub: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
    },
    divider: {
        height: 1,
        backgroundColor: '#ddd',
        marginVertical: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 6,
        marginTop: 10,
        color: '#222',
    },
    distribucionImage: {
        width: '100%',
        height: 200,
        marginTop: 8,
        borderRadius: 8,
        backgroundColor: '#f0f0f0',
    },
    distribucionImage2: {
        width: '100%',
        height: 500,
        marginTop: 8,
        borderRadius: 8,
        backgroundColor: '#f0f0f0',
    },
    localidadText: {
        fontWeight: '600',
        color: '#333',
        fontSize: 13,
    },
    linkText: {
        color: '#007BFF',
        textDecorationLine: 'underline',
        fontSize: 13,
    },
    buttonDisabledText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 16,
    },
    buttonClose: {
        backgroundColor: '#eee',
        padding: 12,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 10,
    },
    buttonCloseText: {
        color: '#444',
        fontWeight: '600',
        fontSize: 15,
    },
    localidadesContainer: { // Última definición
        gap: 10,
        marginBottom: 14
    },
    localidadItem: { // Última definición
        backgroundColor: '#f2f2f2',
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#ccc',
    },
    localidadItemSelected: {
        backgroundColor: 'rgba(141, 36, 182, 0.1)',
        borderColor: '#8d24b6',
    },
    localidadNombre: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
        color: '#333',
    },
    localidadPrecio: {
        fontSize: 14,
        marginBottom: 2,
        color: '#555',
    },
    localidadSubText: { // Última definición
        fontSize: 13,
        color: '#777',
    },
    infoCardContainer: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginVertical: 12,
        borderColor: '#e0e0e0',
        borderWidth: 1,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 3,
    },
    infoRow: { // Última definición
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    infoRowGroup: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        marginBottom: 8,
    },
    modalText: { // Última definición
        marginLeft: 8,
        fontSize: 14,
        color: '#333',
        flexShrink: 1,
    },
    inputCantidad: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
        marginTop: 6,
        fontSize: 14,
        color: '#000',
        width: 80,
        textAlign: 'center',
    },
    buttonBase: {
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 10,
        width: '100%',
    },
    buttonBuy: {
        backgroundColor: '#8d24b6',
    },
    buttonDisabled: { // Última definición
        backgroundColor: '#cccccc',
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 30,
        paddingHorizontal: 16,
        paddingBottom: 10,
        backgroundColor: '#fff',
    },
    logo: {
        width: 150,
        height: 50,
        resizeMode: 'contain',
    },
    iconsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconButton: {
        marginLeft: 16,
    },
    card: { // Última definición
        backgroundColor: '#fff',
        borderRadius: 20,
        marginBottom: 24,
        elevation: 5,
        shadowColor: '#5a3a69',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
    },
    imageContainer: {
        height: 200,
    },
    image: { // Última definición
        width: '100%',
        height: '100%',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    badge: { // Última definición
        position: 'absolute',
        top: 16,
        left: 16,
        backgroundColor: 'rgba(141, 36, 182, 0.9)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
    },
    badgeText: { // Última definición
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    priceTag: { // Última definición
        position: 'absolute',
        bottom: 16,
        right: 16,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
    },
    priceText: { // Última definición
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    content: { // Última definición
        padding: 20,
    },
    eventName: { // Última definición
        fontSize: 22,
        fontWeight: 'bold',
        color: '#111',
        marginBottom: 4,
    },
    artistas: { // Última definición
        fontSize: 14,
        color: '#666',
        marginBottom: 16,
    },
    infoGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    infoText: { // Última definición
        fontSize: 14,
        color: '#333',
        marginLeft: 8,
    },
    footer: {
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        padding: 16,
        alignItems: 'center',
    },
    detailsButton: {
        backgroundColor: '#8d24b6',
        paddingVertical: 12,
        paddingHorizontal: 40,
        borderRadius: 999,
        width: '100%',
        alignItems: 'center',
    },
    detailsButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
        gap: 12,
    },
    modalSafeArea: { flex: 1, backgroundColor: '#f4f2f8' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e8e8e8' },
    modalScrollView: { flex: 1 },
    filterContainer: { // Última definición (de 3)
        padding: 20,
        gap: 16
    },
    filterTitle: { // Última definición
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333'
    },
    filterSubtitle: { // Última definición
        fontSize: 16,
        fontWeight: '600',
        color: '#555',
        marginTop: 10
    },
    inputContainer: { // Última definición
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingHorizontal: 15,
        borderWidth: 1,
        borderColor: '#ddd'
    },
    input: { // Última definición
        flex: 1,
        height: 50,
        fontSize: 16,
        color: '#333',
        marginLeft: 10
    },
    modalFooter: { flexDirection: 'row', padding: 20, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e8e8e8', gap: 12 },
    clearButton: { // Última definición
        flex: 1,
        padding: 15,
        borderRadius: 12,
        backgroundColor: '#e8e8e8',
        alignItems: 'center'
    },
    clearButtonText: { // Última definición
        color: '#333',
        fontWeight: 'bold',
        fontSize: 16
    },
    applyButton: { // Última definición
        flex: 1,
        padding: 15,
        borderRadius: 12,
        backgroundColor: '#8d24b6',
        alignItems: 'center'
    },
    applyButtonText: { // Última definición
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16
    },
    label: { // Última definición (de 3)
        fontSize: 14,
        fontWeight: 'bold',
        color: '#555',
        marginBottom: 8
    },
    selectorButton: { height: 50, justifyContent: 'center', paddingHorizontal: 15, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 12 },
    selectorButtonText: { fontSize: 16, color: '#333' },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    statusActiva: {
        backgroundColor: '#28a745', // Verde
    },
    statusProximamente: {
        backgroundColor: '#ffc107', // Naranja
    },
    statusFinalizada: {
        backgroundColor: '#6c757d', // Gris
    },
    statusNoDisponible: {
        backgroundColor: '#dc3545', // Rojo
    },
    statusText: {
        color: '#fff',
        fontWeight: 'bold',
        marginLeft: 8,
    },
    detailsButtonDisabled: {
        backgroundColor: '#a9a9a9', // Gris para deshabilitado
    },
    quantitySelectorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        backgroundColor: '#f0f0f0',
        borderRadius: 25,
        padding: 5,
    },
    quantityButton: {
        width: 40,
        height: 40,
        backgroundColor: '#dcdcdc',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 10,
    },
    quantityButtonText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    quantityText: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#000',
        minWidth: 40,
        textAlign: 'center',
    },
});
