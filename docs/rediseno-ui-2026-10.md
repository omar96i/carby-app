# Rediseño de UI — octubre 2026 (rama `cambios_carby_miguel`)

Registro de **todo lo que se tocó** durante el rediseño de la app: qué archivo, qué cambió, por qué,
qué lógica se tocó (si alguna) y dónde está el respaldo para volver atrás.

- Fechas: 24 y 25 de octubre de 2026.
- Dispositivos de prueba: Xiaomi `24116RACCG` (serial `gujz5xu8mzifqcin`) y Redmi Note 13 Pro `23117RA68G`
  (serial `zhpj6x6p9lemca4d`), en modo desarrollo (`npx expo start` + `npx expo run:android --no-bundler`).
- **Nada se subió a producción**: sin commits, sin push, sin EAS build/update. Los APK se compilaron solo en local.
- Respaldos de cada versión: `../carby herramientas/design-versions/<Pantalla>/` (carpeta hermana de `carby-app`, fuera de git).

---

## 1. Reglas que se siguieron

- **Solo diseño**, salvo lo listado en la sección 4 ("Cambios de lógica"). Textos, endpoints, validaciones y
  flujos se mantienen.
- Se respeta cómo programa el desarrollador (`.agents/skills/carby-dev-style`):
  JavaScript puro, **sin paquetes nuevos**, `fetch(\`${BASE_URL}…\`)` + `Authorization: Bearer <userToken>`,
  lógica de datos en `hooks/<rol>/useX.js`, feedback con `AlertaModal` + `showAlert(message, type, onPrimary, primaryLabel)`,
  confirmaciones `"confirm"` con "Sí, …", **"Ocultar" en vez de "Eliminar"** (soft-delete), `StyleSheet.create` al final,
  orden de imports del proyecto, `TouchableOpacity activeOpacity={0.8}`.
- Íconos solo de librería (`@expo/vector-icons` / `react-native-vector-icons`). Nunca emojis ni SVG dibujados a mano.
- **Logo real del comercio** en todo lugar donde aparezca un comercio (componente `LogoComercio`, sección 3).
- Paleta: `brand #fa6205`, `ink #1C1C1E`, `muted #71717A`, `bg #F4F4F5`, `edge #E4E4E7`, `iconBg #FFF0E5`,
  `green #10B981`, `placeholder #A1A1AA`. Fuente Montserrat cargada globalmente en `hooks/useLoadedAssets.js`
  (`_400Regular`, `_600SemiBold`, `_700Bold`, `_800ExtraBold`).
- Botón primario "elevado": píldora naranja sólida + sombra naranja
  (`shadowColor #fa6205, offset {0,8}, opacity .35, radius 16, elevation 8`), texto `Montserrat_700Bold`.
- Radios: tarjetas 18–24, hojas 28, píldoras = **mitad de la altura** cuando llevan sombra (ver gotchas).
- **Herramientas fuera del proyecto** (2026-10-26): los respaldos (`design-versions`), los APK (`APK`) y las 5 skills que no eran del programador (`carby-brand`, `carby-dev-style`, `expo-animation`, `expo-design-system`, `react-native-best-practices`, con su `skills-lock.json`) se movieron a `carby movil/carby herramientas/`, al lado de `carby-app`. En el proyecto quedan solo las skills del programador (`react-native-design`, `vercel-react-native-skills`) y `skills-lock.json` como estaba.
- **Sin comentarios en el código: toda la explicación va en este documento** (pedido del dueño, 2026-10-26). Se quitaron los 463 comentarios que había agregado el rediseño en 71 archivos; los comentarios del código original se conservaron. Respaldo de los archivos con esos comentarios: `../carby herramientas/design-versions/ConComentarios/`. Verificado: los 103 archivos cambiados se leen sin errores de sintaxis.

---

## 2. Archivos nuevos

| Archivo | Para qué |
| --- | --- |
| `components/LogoComercio.js` | Logo real del comercio. Usa la foto del objeto `comercio` (`foto_documento_file`, `logo`, `imagen`, `foto`…); si no viene la pide a `GET usuario/{id}` (como `Cart.js`) con caché en memoria por id. Ícono de tienda solo de respaldo. |
| `components/SplashAnimado.js` | Overlay JS del splash (aparece y se desvanece; oculta el splash nativo al cargar el logo). Montado al final de `App.js`. |
| `components/registro/RegistroUI.js` | Piezas compartidas de los 3 registros (`RegistroScreen`, `RegistroHeader`, `RegistroCard`, `CampoTexto`, `CampoSelector`, `registroStyles`). |
| `components/registro/SelectorFecha.js` | Selector de fecha en 3 columnas virtualizadas (Día/Mes/Año), salida `"AAAA/MM/DD"`. Solo en `RegistroDomiciliario` y `Comercio`. |
| `hooks/useAlturaTecladoAndroid.js` | Altura real del teclado en Android (la app es edge-to-edge y `KeyboardAvoidingView` calcula mal). Se usa como `marginBottom`. |
| `hooks/useTiposVehiculo.js` | Lista de tipos de vehículo con la **misma** petición de "Pedir viaje" (`GET vehicle-types`), una vez por sesión (caché en memoria). Devuelve `{ id: tipo }`. |
| `components/IconoVehiculo.js` | Ícono del viaje según la **categoría real**: nombre que mande el backend (`categoria_nombre`) o el del `vehicle_type_id` guardado al pedir → moto, mototaxi, particular, deluxe, taxi, grúa, envíos, camión, bici. Si el viaje no la trae: vehículo propio del conductor (`rider.moto`/`rider.taxi`/`rider.mototaxi`); si tampoco, el ícono de antes. Nunca inventa la categoría. |
| `utils/nombreRol.js` | Nombre para mostrar de un rol: `rider.moto` → "Moto", `rider.taxi` → "Particular", `rider.mototaxi` → "Mototaxi", `usuario` → "Usuario", `comercio` → "Comercio". Se usa en la insignia de rol de `Perfil.js`, `PerfilUsuer.js` y `StepDiecisiete.js` (antes mostraban "rider.moto" tal cual). |
| `hooks/usuario/useHistorialOculto.js` | Ocultar/mostrar elementos del historial del usuario (soft-delete local, sección 4). |
| `android/app/src/main/res/drawable-v31/` + `drawable/splashscreen_animado.xml` | Splash nativo animado de Android 12+ (AnimatedVectorDrawable "ensamblaje"; en reposo muestra el logo completo). |
| `assets/images/carby-logo-blanco.png`, `assets/images/splash-carby.png` | Logo blanco del splash y del login. |
| `docs/rediseno-ui-2026-10.md` | Este documento. |

> No versionar: `carby-app-production-firebase-adminsdk-fbsvc-6db8019877.json` ni `google-services.json` (credenciales, sin trackear).

---

## 3. Cambios por pantalla (diseño)

Columna "Respaldo" = carpeta dentro de `../carby herramientas/design-versions/`. La versión **actual** es la última listada.

### 3.1 Arranque, ubicación, login y registro

| Archivo(s) | Qué cambió | Respaldo |
| --- | --- | --- |
| `app.json`, `android/app/src/main/res/values/colors.xml`, `styles.xml`, `drawable-*/splashscreen_logo.png`, `drawable-v31/`, `App.js`, `hooks/useLoadedAssets.js`, `components/SplashAnimado.js` | Splash naranja con logo blanco grande; animación nativa "ensamblaje" (Android 12+) y overlay JS que se desvanece (logo sale primero). `styles.xml`: tema del splash, `autofilledHighlight` transparente y `CalendarioCarby`. | `Splash/` (v0…v6) |
| `screens/LocationVerification.js` | "Necesitamos tu ubicación": pin con anillos, razones en tarjeta blanca 3D, botón elevado fijo. | `LocationVerification/` |
| `screens/Login/Login.js` | Franja naranja con logo + marca de agua, hoja blanca, campos píldora (borde fino, naranja al enfocar), "Mínimo 9 caracteres" al enfocar contraseña, teclado real Android, franja reducida con teclado. | `Login/` |
| `screens/Login/Registro.js` | Elegir tipo de cuenta: tarjetas seleccionables (Usuario / Domiciliario / Comercio) + "Continuar". | `RegistroEleccion/` |
| `screens/Register/RegistroUsuario.js`, `RegistroDomiciliario.js`, `Comercio.js` | Mismo esqueleto con `RegistroUI` (encabezado naranja con pasos en círculo, tarjeta blanca, botones abajo); selector de opciones en hoja inferior; fecha con `SelectorFecha`. Sin quitar ni agregar campos. | `RegistroUsuario/`, `RegistroDomiciliario/`, `Comercio/`, `_compartido/`, `SelectorFecha/` |

### 3.2 Inicio, tienda, producto, carrito y checkout

| Archivo(s) | Qué cambió | Respaldo |
| --- | --- | --- |
| `screens/HomeScreen.js` | Hoja "Selecciona tu ubicación": de ventana centrada a hoja inferior (agarre, mapa redondeado, dirección con ícono, Cancelar gris + Guardar elevado, sin el botón nativo duplicado). Dirección en formato colombiano "Calle 97 # 74B-30, …" (ver 4.x). | `HomeUbicacionModal/` |
| `components/NearbyBestSellers.js`, `NearbyCheapest.js`, `NearbyDiscounts.js` | Inicial del comercio → `LogoComercio`. | `Funcionalidad/Nearby*-v0-original.js` |
| `screens/Delivery/Shop.js` | Portada con degradado, logo e identidad, tarjetas de estado/calificación, pestañas píldora Menú/Descuentos, **barra de categorías fija** (salta a la sección y se marca sola al desplazar), productos en tarjeta con "+". Estado real abierto/cerrado y distancia (ver 4.x). | `Shop/` (v0…v7), `Funcionalidad/Shop-v7-antes-estado-real.js` |
| `screens/Delivery/Producto.js` | Foto con degradado, etiquetas comercio (con logo) y descuento, adicionales en carrusel, cantidad + "Agregar", ventana de confirmación "¡Listo!". | `Producto/` |
| `screens/Delivery/Cart.js` | Encabezado oscuro "Tu Pedido", tarjeta de la tienda (foto real, "+ Agregar más" → `Shop`), botón de pago fijo sobre la barra. Pasa `productImage` al checkout (ver 4.x). | `Cart/` |
| `screens/Delivery/PaymentScreen.js` | Checkout: cabecera en una fila (volver · "Confirmar pedido" + min/km · ubicarme), **ruta dibujada** en el mapa, hoja como **línea de tiempo** (Recogida con logo → Entrega con "Cambiar" → Tu pedido con fotos y "Ver listado" → Envío → Método de pago con "Cambiar"), barra Productos/Envío/Total + "Pedir ahora →", modo "fijar en el mapa" con botones sobre la barra del sistema. | `PaymentScreen/` (v0…v13), `Funcionalidad/PaymentScreen-v13-antes-funcionalidad.js` |
| `screens/Delivery/Favoritos.js` | Inicial del comercio → `LogoComercio` (en servicios, el comercio dueño del perfil). | `Funcionalidad/Favoritos-v0-original.js` |

### 3.2b Home del cliente — rediseño "A2 · Noche premium" (aprobado en el mockup del lienzo)

Mockup aprobado: lienzo "Carby Home — rediseño" (propuesta A2). Respaldos de todo en `../carby herramientas/design-versions/HomeA2/v0-*.js`.

| Archivo | Qué cambió | Lógica |
| --- | --- | --- |
| `screens/HomeScreen.js` | Cabecera oscura (`#1C1C1E`, radio 36) con: píldora de ubicación (pin naranja, "Tu ubicación", dirección, flecha), avatar con aro naranja + `StarRating` (se conserva), **saludo por hora** ("Buenos días / Buenas tardes / Buenas noches," + primer nombre de `userData.nombre_completo`), accesos en bloque (Restaurantes grande con la hamburguesa; Servicios; **Pedir viaje** naranja) y "Mis favoritos" dentro de la cabecera (mismo dato: categorías de tus últimos pedidos, círculos superpuestos). Fondo del contenido `#F4F4F5`. Orden de secciones: promociones → tiendas cerca → descuentos → más vendidos → más baratos. Se quitaron los estilos `quickCat*` (ya no se usan). | `QuickCategory` y `QUICK_CATEGORIES` siguen siendo la fuente (mismas rutas y params). **Nuevo**: `saludoPorHora()` (solo texto, reloj del celular) y la tarjeta "Pedir viaje" → `navigation.navigate("Transporte")` (la misma pestaña del botón Viaje). Ubicación, perfil, favoritos y datos: sin cambios. |
| `assets/images/hamburguesa-icono-limpia.png` (nuevo) | Copia de `hamburguesa-icono.png` con fondo transparente: la original trae el cuadriculado gris pintado en la imagen. La original no se tocó. | — |
| `assets/images/hamburguesa-restaurantes.jpg` (nuevo) | Foto de hamburguesa que creó el dueño para la tarjeta "Restaurantes" (reducida a 600×600, 85 KB). Reemplaza en esa tarjeta al ícono transparente: ahora la foto llena un círculo de 168 con aro `#3A3A3C` (`accesoGrandeCirculo` con `overflow: hidden`, `accesoGrandeImg` en `cover`), como en el mockup. `hamburguesa-icono-limpia.png` queda en el proyecto sin uso. Respaldo previo: `../carby herramientas/design-versions/HomeA2/v1-HomeScreen-antes-foto-hamburguesa.js`. | — (solo imagen y estilos) |
| `components/AdCarousel.js` | Promociones más altas (168) con radio 26; cada una más angosta que la pantalla para que **se asome la siguiente**; puntos como barra (activa negra). | Misma petición `publicidades`, mismo filtro por fechas, mismo `autoPlay` 30 s y `loop`. Para el asomado se usa la opción oficial `customAnimation` del carrusel (`translateX = value × (ancho + 12)`) y `style/containerStyle` con ancho numérico (con `'100%'` el carrusel recortaba la siguiente). |
| `components/NearbyBanners.js` | "Tiendas cerca de ti": de carrusel de imágenes a **tarjetas deslizables** con el banner, el **logo real** del comercio (`LogoComercio`) montado encima y el nombre. Título con ícono y "Cerca de tu ubicación". | Misma petición `banners/cercanos`; tocar → `Shop` igual que antes. Ya no rota sola (ahora es una fila que se desliza). |
| `components/NearbyBestSellers.js` | "Los más vendidos": el primero **destacado** (foto grande, "Top 1", corazón, franja oscura con nombre, logo + comercio, precio y "+"); el resto en fila deslizable con insignia "Top 2/Top 3". | Misma petición `productos/mas-vendidos`, mismo orden. |
| `components/NearbyCheapest.js` | "Los más baratos" — **cambiado a la opción 3 del lienzo (tiquetes de precio)**, porque al dueño no le gustó la lista en columnas de 3: fila deslizable de tiquetes (foto a la izquierda, muescas y línea punteada, nombre, logo + comercio, distancia y precio grande en verde, "+" naranja). Respaldo: `../carby herramientas/design-versions/HomeA2/v1-NearbyCheapest-columnas.js`. | Misma petición `productos/mas-baratos`, mismos productos y mismo orden. La distancia es `distancia_km` del servidor (antes no se mostraba); si no viene, no se muestra. |
| `components/NearbyDiscounts.js` | "Descuentos cerca de ti": tarjetas nuevas con insignia "-X%". | Misma petición `productos/descuentos-cercanos`; como antes, aquí siempre se resta el descuento. **No se pudo ver en el celular**: en la zona de prueba el servidor no devuelve descuentos. |
| `components/home/ProductoHome.js` (nuevo) | Piezas compartidas de esas secciones: `TarjetaProducto`, `FilaProducto`, `TituloSeccion`, `BotonAgregar`, `LineaComercio`, `Precio`, helpers `fotoProducto`, `formatPrice`, `preciosDe`, `irATienda`, `abrirProducto`. Antes cada sección repetía la misma tarjeta. | **Botón "+"** (estilo Rappi: círculo naranja en la esquina de la foto con aro del color de la tarjeta, efecto de "mordida"; el corazón `FavoriteHeart` en la otra esquina): **no agrega al carrito desde el Home**; abre `Producto` (la misma pantalla que abre la tienda al tocar un producto), donde ya están "Agregar", adicionales y la regla de un comercio por pedido (`getCartBusiness`). Como esos productos no traen `user_id`, se pasa `product.user_id = item.comercio.id` (es lo que `Producto.js` usa como comercio del carrito; probado: abre con la etiqueta y el logo del comercio correctos). Tocar la tarjeta sigue llevando a la tienda. |

**Arreglo — tocar la dirección no abría el mapa (en desarrollo):** en `screens/HomeScreen.js`, el efecto de inicialización ahora vuelve a poner `isMountedRef.current = true` al empezar. Su limpieza lo dejaba en `false` y nunca se volvía a marcar; con cada recarga en caliente (Fast Refresh) el efecto se re-ejecutaba, la inicialización se cortaba y `handleLocationUpdate` salía sin hacer nada. En la app instalada (sin recargas en caliente) no cambia nada: el valor ya era `true` al montar. Visto en Metro: después del arreglo la inicialización vuelve a correr completa tras una recarga.

**Arreglo — el mapa de ubicación tardaba en abrir:** `handleLocationUpdate` abría el modal solo al final, después de obtener la ubicación (GPS si la guardada tiene más de 30 min) y de esperar la dirección (`reverseGeocodeAsync`); mientras tanto no se veía nada. Ahora el modal se abre al tocar y muestra el "Obteniendo ubicación..." que ya existía en el modal (antes nunca se alcanzaba a ver), y el mapa aparece apenas hay coordenadas; la dirección se completa cuando llega. Mismas funciones y mismo orden de guardado; no cambia qué ubicación se usa ni cuándo se envía. Respaldo previo: `../carby herramientas/design-versions/HomeA2/v2-HomeScreen-antes-modal-ubicacion.js`.

**"Los más baratos" — opción 3 (tiquetes):** se subieron 3 opciones al lienzo (fila "Los más baratos — nuevas opciones"); el dueño pidió "la que sea mejor" y se implementó la 3. En `components/home/ProductoHome.js` la fila `FilaProducto` (solo la usaba esta sección) se reemplazó por `TicketProducto` y se agregó `distanciaTexto(km)` ("a menos de 100 m", "a 340 m", "a 6,7 km"). Tocar el tiquete → tienda; corazón → `FavoriteHeart`; "+" → `abrirProducto`; si el producto tiene descuento activo se ve el precio anterior tachado (mismo cálculo `preciosDe`). La línea punteada se dibuja con trazos porque el borde punteado de un solo lado no funciona bien en Android. Respaldo: `../carby herramientas/design-versions/HomeA2/v1-ProductoHome.js`. Probado en el Redmi: tiquetes con logo real (Chef giuomar Álvarez) y con el ícono cuando el comercio no tiene logo (Areperia Juana), distancia ("a 7 km", "a menos de 100 m"), deslizar de a un tiquete y "+" → pantalla del producto (Arepas con todo). Ajuste tras la prueba: la distancia ya no muestra ",0" ("a 7,0 km" → "a 7 km").

**Dato a corregir por el comercio (no se tocó):** "Chef personal" y "Meal prep perzonalizado" tienen el precio guardado con punto ("150.000", "250.000"); la app lo lee como $150 y $250, y por eso salen de primeros en "los más baratos".

Probado en el Redmi (cuenta de cliente): cabecera, saludo, accesos, favoritos, promociones con la siguiente asomada, tiendas cerca con logos reales, Top 1 destacado, Top 2/3 con "+" y corazón, más baratos; "+" → pantalla del producto (Pizza Hawaiana, Pizzas Juancho); "Pedir viaje" → pantalla de viaje y volver. Sin errores en logcat. No se tocó "Agregar" (no se modificó el carrito).

Ajuste posterior (pedido del dueño): el nombre del saludo del Home baja de 30 a 25 (`saludoNombre`). Respaldo: `../carby herramientas/design-versions/HomeA2/v4-HomeScreen-antes-nombre-mas-pequeno.js`.

Fotos en las tarjetas pequeñas del Home (pedido del dueño, fotos creadas por él con el mismo estilo que la hamburguesa): `assets/images/servicios-herramientas.jpg` (tijeras, peine y navaja sobre fondo oscuro) y `assets/images/carro-pedir-viaje.jpg` (carro blanco sobre fondo naranja), reducidas a 600×600. Van en un círculo de 78 asomado en la esquina de arriba de cada tarjeta (`accesoChicoCirculo`), reemplazando los íconos `cut-outline` y `car-sport`; el texto queda abajo. Mismos destinos (Servicios → `CategoriaVertical` servicios, Pedir viaje → `Transporte`). Respaldo: `../carby herramientas/design-versions/HomeA2/v5-HomeScreen-antes-fotos-servicios-viaje.js`.

### 3.2c Restaurantes y Servicios (`CategoriaVertical`) — concepto A2 (aprobado en el lienzo: tableros R y S)

| Archivo | Qué cambió | Lógica |
| --- | --- | --- |
| `screens/Delivery/CategoriaVertical.js` | Cabecera oscura como la del Home (radio 36): botón volver redondo, píldora "Cerca de tu ubicación" (solo si hay ubicación guardada), título grande "Restaurantes" / "Servicios" (+ "Citas y reservas", el mismo texto del acceso del Home), y las **categorías del servidor dentro de la cabecera** (cuadros de 66, la elegida con borde naranja). Cada comercio: **logo real** (`LogoComercio`, 42), nombre y "Ver más" en píldora blanca. Tarjetas blancas: restaurantes de 150 (foto, corazón, nombre en 2 líneas, precio); servicios de 200 con la **duración** sobre la foto (campo `tiempo` del servidor, en minutos; si no viene no se muestra) y botón **"Reservar"**. Fondo `#F4F4F5`. Mientras carga se ve la cabecera con el indicador debajo. Respaldo: `../carby herramientas/design-versions/CategoriaVertical/v0-original.js`. | Mismas consultas (`comercios|servicios/categorias`, `comercios|servicios/home`, radio 20), mismo filtro por categoría (tocar la elegida la quita), mismo "Buscando..." con el cubo, mismas navegaciones (`Shop`, `ServicioDetalle`) y mismo `FavoriteHeart`. **"Reservar" hace lo mismo que tocar la tarjeta** (abre el servicio). Se quitó `ScreenHeader` (la cabecera nueva trae su propio volver). |
| `components/FocusAwareStatusBar.js` (nuevo) | `StatusBar` que solo se aplica mientras la pantalla está a la vista (patrón de la documentación de React Navigation). Usado en `HomeScreen.js`, `Cart.js` y `CategoriaVertical.js` con `dark-content`. | Arregla la hora/íconos blancos sobre blanco en el Home: las pestañas y pantallas quedan montadas y el `StatusBar` claro de otra (p. ej. Cuenta) seguía mandando. Respaldo del Home: `../carby herramientas/design-versions/HomeA2/v3-HomeScreen-antes-statusbar.js`. |

Probado en el Redmi: Home con la hora legible; Restaurantes con la cabecera, categorías del servidor, logos reales (Pizzas Juancho, Sushi Bangkok, Marroquí salad, Luxo), ícono cuando no hay logo (Panadería, Juan Salazar) y tarjetas con corazón. **Falta probar** en el celular el filtro por categoría y la pantalla de Servicios (el dueño estaba usando el celular).

Pendiente (no tocado): muchas otras pantallas ponen su propio `StatusBar` normal (Perfil, Cuenta, Wallet, MetodosDePago, PedidoDetalle, ServicioDetalle, Shop…); podrían pasar a `FocusAwareStatusBar` para que ninguna "contagie" a las demás.

### 3.2d Adiciones (lo que ve el cliente)

| Archivo | Qué cambió | Lógica |
| --- | --- | --- |
| `screens/Delivery/Producto.js` | Tarjetas de adiciones: la foto se ve **completa** (`resizeMode="contain"` sobre fondo claro, 104 de alto) en vez de recortada; se muestra la **descripción** de la adición (hasta 3 líneas) debajo del nombre (antes no se mostraba en ninguna versión); tarjeta de 148. Respaldo: `../carby herramientas/design-versions/Adiciones/v0-Producto.js`. | Sin cambios: mismos datos (`producto-adicionales/producto/{id}`), misma selección y cantidades. |
| `screens/Delivery/ServicioDetalle.js` | Adiciones del servicio: se muestra la **descripción** debajo del nombre. Respaldo: `../carby herramientas/design-versions/Adiciones/v0-ServicioDetalle.js`. | Sin cambios. |

Pedido explícito del dueño ("no aparecen las descripciones de las adiciones y la foto se ve con zoom"). Falta verlo en el celular.

### 3.3 Viajes

| Archivo(s) | Qué cambió | Respaldo |
| --- | --- | --- |
| `screens/Delivery/StepUno.js` + `screens/Transport/components/{DestinationBar,RouteInfoBar,VehicleCarousel,VehicleCard,BidPanel,NoteInput,PaymentSelector,PeekSummary,SearchModal}.js` | Fuente corregida (usaba `"MontserratBold"`, que no existe → letra del sistema) y paleta Carby. Botones volver/ubicarme apilados junto a la **tarjeta de recorrido** (origen y destino unidos por línea, km·min·tráfico al pie). Servicios en carrusel compacto, oferta en bloque gris, pago en fila completa, buscador a pantalla completa. Se quitaron la píldora del logo "CarBy" y dos animaciones en bucle decorativas (destello del botón y barra del agarre). La hoja sube con el teclado (nota al conductor visible). | `PedirViaje/` (v0…v9; actual v8 + origen editable), `Funcionalidad/StepUno-v8-antes-origen.js`, `Funcionalidad/DestinationBar-v8-antes-origen.js` |

### 3.4 Pedidos, seguimiento, detalle, reservas y chat

| Archivo(s) | Qué cambió | Respaldo |
| --- | --- | --- |
| `screens/usuario/Pedidos.js` | Historial: Carreras/Pedidos más rápido, botón "Ver detalle", Ocultar / "Ver ocultos" (ver 4.x). | `TripCard/usuario-Pedidos-*`, `Funcionalidad/usuario-Pedidos-v4-antes-ver-ocultos.js` |
| `components/usuario/pedidos/TripCard.js` | Logo del comercio (tocable → tienda, solo cliente), recogida "Establecimiento" → nombre del comercio, fotos apiladas de productos, "Ver pedido / Ver viaje / Ver detalle", ícono de carrera naranja, botones Ocultar/Mostrar en historial. `React.memo`. | `TripCard/` |
| `components/usuario/pedidos/DetailSheet.js` | Hoja Detalle: encabezado negro "Detalle", mapa grande de borde a borde con estado y PIN flotando, filas limpias (título/total, ruta con riel, conductor, productos con foto, pago y total), botón fijo que ya no queda bajo la barra del sistema. "Ver en vivo" conectado (ver 4.x). | `DetalleSheet/`, `Funcionalidad/DetailSheet-v3-antes-ver-en-vivo.js` |
| `components/usuario/pedidos/ReservaCard.js` | Arriba **logo + nombre del comercio** (tocable → tienda); abajo el **profesional** con su foto; filas Fecha/Horario/Dirección; servicios; total; **contador** hasta la cita. | `ReservaCard/` |
| `screens/usuario/PedidoDetalle/` (`index.js`, `components/OrderSheet.js`, `TopBar.js`, `StatusTimeline.js`, `OrderMap.js`, `EvidenceModal.js`, `utils.js`) | Seguimiento como **recibo**: franja oscura (logo, comercio, #pedido, fecha, total), pasos del pedido, ruta, repartidor/PIN, productos con foto, pago; barra fija Chat/Llamar. Fuente y paleta corregidas. Arreglos de hoja (ver 4.x). | `PedidoSeguimiento/` |
| `components/OrderStatusStepper.js` | Se agregó prop opcional `compact` (por defecto igual que antes). Hoy no se usa en ninguna pantalla. | `PedidoSeguimiento/OrderStatusStepper-v0-original.js` |
| `components/OrderChatModal.js`, `screens/usuario/ChatPedido.js` | Chat del pedido: cabecera negra con volver, logo, #pedido y estado; burbujas redondeadas; respuestas rápidas en carrusel; chat vacío con ícono. | `Chat/` |
| `components/ChatInput.js` | Campo de escribir (compartido por todos los chats): gris sin borde, barra redondeada, Montserrat. | `Chat/v0-ChatInput-original.js` |
| `components/Delivery/QrPaymentCard.js` | Pago con QR en 3 pasos (línea de tiempo), QR grande centrado; "✓" de texto → ícono. | `QrPago/` |
| `screens/Delivery/ServicioDetalle.js` | Reservar: portada, duración, precio + cantidad, adicionales, **pasos numerados** (perfil → fecha y hora → pago), horas en 4 columnas, total + "Reservar" fijos. Descripción oculta si es solo un número. | `Reservar/` |
| `screens/conductor/DetalleCarreraConductor/components/FinishedSheet.js` (conductor: "Arrendamiento finalizado") | Fondo `rgba(255,255,255,0.98)` + `elevation` → **blanco sólido** (en Android se veía el mapa a través y la letra se perdía). Fuentes inexistentes `"MontserratBold"`/`"Montserrat"` → `Montserrat_*`. "Ganancia del viaje" en franja verde con ícono de billetera; el valor en una línea con `adjustsFontSizeToFit` (`minimumFontScale 0.6`) para que montos largos queden uniformes. Botón "Buscar nuevo arrendamiento" en píldora naranja de marca. Sin cambios de lógica. | `ConductorFinalizado/FinishedSheet-v0-original.js` |
| `FinishedSheet.js` v2 (estructura) + `DetalleCarreraConductor/index.js` | **Una sola hoja para moto, particular y delivery** (todos usan `DetalleCarreraConductor`). Nueva estructura: check verde + título en fila; tarjeta oscura de ganancia (monto grande que se achica si es largo, chip #viaje, chips método de pago y vehículo: Moto/Particular/Mototaxi/Delivery); ruta recogida → destino (`parsedInfo` que ya calculaba la pantalla, pasado como props); tarjeta de calificación con iniciales y "¿Cómo te fue con …?" (solo arrendamientos, `showRating` igual que antes); botón fijo. Hoja máx. 78 % para no tapar el aviso superior. En `index.js`: se pasan `pickupAddress`/`destinationAddress` y el botón "Cómo llegar" se oculta **solo** cuando el viaje está terminado (quedaba encima de la hoja). `rating`, `message` y `onDone` sin cambios. | `ConductorFinalizado/FinishedSheet-v1-fondo-solido.js`, `DetalleCarreraConductor-index-v0.js` |
| `FinishedSheet.js` v3 (solo datos reales) | Se quitó el texto inventado "¿Cómo te fue con …?": ahora "Califica al pasajero" + nombre real del pasajero (si viene). Los chips de método de pago y vehículo solo aparecen si el viaje trae el dato (antes mostraban "Efectivo"/"Moto" por defecto). También en `ItemCreator.js`: "Una buena foto vende más" → "Se recorta en formato cuadrado" (lo que hace el selector). Regla: no mostrar textos ni datos que no sean reales o funcionales. | `ConductorFinalizado/FinishedSheet-v2-estructura.js` |
| `screens/conductor/DetalleCarreraConductor/components/TopBar.js` (barra superior del viaje del conductor, todos los estados y tipos) | `top: insets.top + 8` dentro de un `SafeAreaView` con borde superior → doble espacio (la barra quedaba muy abajo). Ahora `top: 8`. Fondo `rgba(…,0.95)` → blanco sólido; fuentes `"MontserratBold"`/`"Montserrat"` → `Montserrat_700Bold`/`_400Regular`. | `ConductorFinalizado/TopBar-v0-original.js` |
| `HomeDelivery.js` → hoja de calificaciones del conductor (al tocar "Hola, …") | Resumen premium en tarjeta negra: "Tu calificación", promedio grande en blanco, estrellas doradas, total; a la derecha barras 5★–1★ contadas con las calificaciones de `conductor/calificaciones` (solo si la lista trae todas: `data.length === total`, para no mostrar números parciales). Tarjetas de cada calificación sin sombra, comentario en burbuja blanca; fuentes inexistentes `"Montserrat"` corregidas. Misma petición y datos. | `ConductorFinalizado/HomeDelivery-v1-antes-calificaciones.js` |
| `AvailabilitySummary.js` (inicio y Billetera del conductor) + `OfflinePanel.js` | Versión negra probada y **descartada** ("se ve poco estética"). Final: tarjeta de viajes **clara** (`#F4F4F5`, sin borde, radio 24, números en ExtraBold), tipos de vehículo en píldora con su ícono real, "CONECTARSE" en píldora con sombra naranja; `Montserrat_500Medium` (no cargada) → 400/600. Mismos datos y lógica. | `ConductorInicio/*-v0.js` (original), `*-v1-premium-no-gusto.js` (negra) |
| `screens/HomeDomicilio/HomeDelivery.js` (inicio del conductor) | Solo estilos: globo "Hola, …" en blanco sólido (antes 95 % + sombra: se veía el mapa detrás) y la calificación "5.0" en negro (antes amarillo sobre blanco, casi ilegible). | `ConductorFinalizado/HomeDelivery-v0-antes-saludo.js` |
| `screens/conductor/Pedidos.js`, `screens/conductor/DetalleCarreraConductor/components/ClientSheet.js` | Ícono genérico del comercio → `LogoComercio` (fila del pedido, cabecera del chat, tarjeta del comercio). | `LogosComercio/` |

### 3.5 Panel del comercio (rol Aliado → Inicio)

| Archivo(s) | Qué cambió | Respaldo |
| --- | --- | --- |
| `screens/comercio/Dashboard.js` | Nuevo orden: cabecera → **paso a paso (sin tocar)** → aviso rojo "Tus clientes no te ven ahora" (solo con la configuración completa y sin estar público; usa el mismo `motivoNoPublico`/`goMotivo`) → franja de números (calificación → modal de calificaciones, productos en el menú → "Mi menú", días de atención → Horarios) → botón principal **"Nuevo producto"** → 4 accesos rápidos (Pedir rider, Horarios, Ubicación, Publicidad o Mi perfil en servicios) → **Mi menú** → Publicidad. Se quitaron la tarjeta "Mis horarios", la franja naranja del rider y la tarjeta "Mi ubicación" (su información y acciones pasaron a la cabecera y a los accesos). Los destinos del paso a paso (`scrollTo` "producto", "seccion", "horarios", "ubicacion") apuntan al botón principal, a Mi menú y a los accesos. | `ComercioPanel/v0-Dashboard.js` |
| `components/comercio/dashboard/ShopHeader.js` | Logo, nombre y ubicación + dos píldoras: "Abierto · cierra 20:00" / "Cerrado · abre …" y "Visible para clientes" / "No visible" (mismos cálculos que la tarjeta "Mis horarios"; al tocar hace lo mismo que esa tarjeta). | `ComercioPanel/v0-ShopHeader.js` |
| `components/comercio/dashboard/ItemCreator.js` | De formulario siempre abierto a **hoja a pantalla completa "Nuevo producto/servicio"**: foto grande, sección arriba con chips (y "Nueva sección" ahí mismo), nombre, precio con `$` y separador de miles, rango permitido (en rojo si está fuera), duración con atajos (15–90 min) en servicios, descripción, tarjeta "Poner en descuento" con el precio final, **vista previa "Así lo verá tu cliente"** (misma tarjeta de la tienda) y botón fijo "Publicar" que dice qué falta ("Completa: nombre, precio"). Mismo envío (`onCreate` con los mismos campos). | `ComercioPanel/v0-ItemCreator.js` |
| `components/comercio/dashboard/Inventario.js` | **"Mi menú"**: pestañas Todo / cada sección con su número; con una sección elegida aparecen "Renombrar" y "Ocultar" (antes: mantener presionado y una X diminuta) y "Agregar a …". Cada producto: foto, nombre, precio (descuento en verde con el anterior tachado), interruptor "Disponible/Pausado", botones "Editar" y "Ocultar" (antes papelera roja, aunque la acción es ocultar). En servicios no se muestra el interruptor (antes se mostraba pero no hacía nada: `handleToggleItem` sale si es servicio). Crear sección en una ventana propia. | `ComercioPanel/v0-Inventario.js` |
| `components/comercio/dashboard/BannerManager.js` | Solo estilos: título "Publicidad" con explicación, botones en píldora. | `ComercioPanel/v0-BannerManager.js` |
| `components/comercio/dashboard/SeccionCreator.js` | **Sin cambios y ya no se usa** (crear sección vive en Mi menú y en la hoja de producto). Se deja el archivo para poder revertir. | `ComercioPanel/v0-SeccionCreator.js` |

**Instructivo (`OnboardingGuide.js`)**: diseño sin cambios (pedido explícito del usuario). Único ajuste: `paddingBottom: 30 + insets.bottom`
en la hoja, porque "Atrás / Siguiente / Empezar" quedaban debajo de la barra de navegación del celular. Respaldo `ComercioPanel/v0-OnboardingGuide.js`.

**Editar producto / Editar servicio** (`screens/Delivery/EditarProducto.js`, `screens/Delivery/EditarServicio.js`): mismo estilo que "Nuevo producto". Barra superior clara con atrás; foto grande con chip "Cambiar foto"; tarjeta "Información" (nombre, precio con `$`, tiempo con reloj en servicios, rango permitido, descripción); tarjeta "Descuento" con interruptor ligado al mismo `activoDescuento` (antes botón "Activar DTO"), el mismo campo `descuento` y el precio final solo informativo; tarjeta de adicionales con miniaturas, editar y eliminar (mismas funciones y confirmación del desarrollador); "Guardar Cambios" fijo abajo; ventana de adicional como hoja inferior con foto al lado de nombre/precio. Los valores de los campos se muestran y envían **tal cual** (sin formatear para no cambiar lo que se guarda). En `EditarServicio` se reemplazó el `KeyboardAvoidingView` (Android dejaba la vista encogida) por `marginBottom = useAlturaTecladoAndroid()`; el import queda. Respaldos `../carby herramientas/design-versions/EditarItem/EditarProducto-v1-antes-diseno.js` y `EditarServicio-v0-original.js`.

**Mis perfiles → Editar perfil** (`screens/Delivery/CrearPerfil.js`, comercios de servicios): la ventana usaba `alignItems: "center"` y por eso la foto quedaba sin ancho (una rayita punteada) y los campos se encogían. Ahora es una hoja inferior: foto circular de 84 con botón de cámara y texto "Toca la foto para cambiarla", campos a lo ancho con títulos, Cancelar/Guardar en píldora, sube con el teclado (`useAlturaTecladoAndroid`). Mismos estados (`editNombre`, `editDescripcion`, `editFoto`) y mismo `saveEdit`. Respaldo `../carby herramientas/design-versions/MisPerfiles/CrearPerfil-v0-original.js`.

No se tocaron: la tarjeta "Configura tu negocio paso a paso", `HorariosIntroModal.js`, `LocationPickerModal.js`, los hooks `hooks/comercio/*` salvo lo de las filas 10, 25 y 28, ni los modales de editar/ocultar sección y ocultar producto.

### 3.6 Perfil

| Archivo(s) | Qué cambió | Respaldo |
| --- | --- | --- |
| `screens/User/PerfilUsuer.js` | Cabecera oscura con avatar (foto o iniciales) + lápiz, nombre, ciudad y rol; menú en grupos; "Desactivar Cuenta" en rojo; "Cerrar sesión" en píldora; hoja "Preferencia de ingreso" en cuadrícula 2×2. | `Perfil/PerfilUsuer-*`, `PreferenciaIngreso/` |
| `screens/Perfil.js` (Cuenta de **Comercio** y **Delivery/Particular**: motos, carros, domiciliarios) | Mismo diseño que `PerfilUsuer`: cabecera oscura con foto/iniciales + lápiz, nombre, ciudad y rol; tarjetas de rol; franja "0 Progreso · Mandados" y "Tu código de referido" (abre premios, igual que antes); grupos Cuenta (Datos Personales, Palabra de seguridad, Preferencia de ingreso, **Métodos de pago**) y Ajustes & soporte; "Cerrar sesión" en píldora; hoja de preferencia en cuadrícula 2×2; ventanas de desactivar, premios y soporte restilizadas con los **mismos textos y acciones**. Solo se cambió el `return` y se agregaron estilos `pf`/`ps`/`pm`: funciones, peticiones y navegación sin tocar. | `Perfil/Perfil-compartido-v0-original.js` |
| `screens/MetodosDePago.js` (Métodos de pago: los 4 roles lo tienen registrado; hoy se abre desde la Cuenta de Comercio y Delivery/Particular) | Cabecera oscura con atrás (como Datos Personales), píldoras de estado "QR activo/apagado" y "Mercado Pago activo/apagado" (esta solo comercio); una tarjeta por método con ícono, interruptor y borde naranja si está activo; QR grande en marco con "Cambiar imagen" o zona punteada para subirlo; claves de Mercado Pago con ícono (el token sigue oculto); nota informativa; "Guardar métodos de pago" fijo abajo. Mismos estados, validaciones, `pickQrImage` y `saveAllPaymentMethods` (`POST user-tipo-pago[/id]`): solo cambió el `return` y se agregaron estilos `mp`. | `MetodosPago/v0-original.js` |
| `screens/Perfil.js` (oculto, no borrado) | "0 Progreso · Mandados" del diseño original: el 0 está escrito a mano y no tiene acción. Se dejó el código detrás de `const MOSTRAR_PROGRESO = false` (arriba del componente); con `true` vuelve a aparecer. La franja muestra solo "Tu código de referido". | `Perfil/Perfil-compartido-v1-antes-ocultar-progreso.js` |
| `components/RoleSwitcher.js` (compartido con `screens/Perfil.js`) | Tarjetas de rol más grandes, sin borde, elegida con sombra naranja. | `Perfil/RoleSwitcher-*` |
| `screens/Billetera/StepDiecisiete.js` (Datos Personales, 3 roles) | Cabecera oscura con identidad, grupos con separadores, datos cortos de a dos, edición en hoja inferior, **lápiz para cambiar la foto** (misma subida que `PerfilUsuer`). | `Perfil/` |
| `screens/ConfigurarPalabraSeguridad.js` | Franja naranja con marca de agua, escudo, hoja blanca con estado, campos píldora, "Guardar palabra" elevado. | `PalabraSeguridad/` |

---

## 4. Cambios de lógica (todos aprobados por el usuario)

| # | Archivo | Antes | Ahora | Motivo |
| --- | --- | --- | --- | --- |
| 1 | `screens/Delivery/PaymentScreen.js` | La hoja se podía arrastrar sin tope y el `PanResponder` leía un estado viejo; con `Animated.parallel` la hoja quedaba en blanco | `ref` + tope + animaciones separadas | Bugs visibles de la hoja |
| 2 | `PaymentScreen.js` → `selectMapLocation` | Elegir una sugerencia no actualizaba "Hasta" | `setAddress(formattedAddress)` (actualiza "Hasta" y `end_lugar`) | Pedido explícito |
| 3 | `PaymentScreen.js` → `calculateDistanceGoogle` | Solo usaba los km de la respuesta de Directions | Además guarda `overview_polyline` (ruta dibujada) y la duración. **Sin llamadas nuevas** | Rediseño checkout |
| 4 | `PaymentScreen.js` → `calculateDeliveryFee` | Redondeo a 2 decimales (`$21,012.4`) | Pesos enteros (`Math.round`) | El peso colombiano no usa centavos; se mostraba y cobraba con decimales |
| 5 | `screens/Delivery/Cart.js` → `irAPagar` | — | Agrega `productImage` a cada producto (solo para mostrar; el pedido que se envía no lo usa) | Fotos en el checkout |
| 6 | `screens/Delivery/Producto.js` | — | Un pedido por comercio (`getCartBusiness`) | Aprobado por el usuario |
| 7 | `screens/HomeScreen.js` → `getAddressFromCoordinates` | "# 74B-36, Calle 97, …" | "Calle 97 # 74B-36, …". Solo se muestra en pantalla (al servidor se envían solo latitud/longitud); además, si el nombre ya trae la calle, no se repite | Formato colombiano |
| 8 | `screens/usuario/PedidoDetalle/components/OrderSheet.js` | `Animated.parallel` + `PanResponder` con estado viejo → hoja en blanco; contenido bajo la barra del sistema | Animaciones separadas, `expandedRef`, vuelta a la altura, cabecera de la hoja cerrada sin el espacio inferior | Hoja en blanco reportada |
| 9 | `screens/usuario/PedidoDetalle/index.js` | `TopBar top={insets.top}` dentro de `SafeAreaView` (doble espacio) | `top={0}`; pasa `peerComercioId` al chat | Cabecera desplazada |
| 10 | `hooks/usuario/useReservas.js` y `hooks/comercio/useReservas.js` | `new Date("AAAA-MM-DD")` (UTC) → en Colombia mostraba **el día anterior** | Fecha local `new Date(y, m-1, d)` | La tarjeta decía "lunes 26" con la cita guardada el martes 27 |
| 11 | `components/usuario/pedidos/ReservaCard.js` | — | Contador real hasta `fecha + hora_inicio` (se actualiza cada minuto); tocar el comercio → `Shop` | Pedido explícito |
| 12 | `components/usuario/pedidos/TripCard.js` | En historial, "Ver pedido" iba al seguimiento en vivo y las carreras no respondían | En historial abre `DetailSheet` ("Ver detalle"); en activos sigue igual ("Ver viaje"/"Ver pedido"). Prop `irAlComercio` (solo cliente) | "Los dos botones no funcionan bien" |
| 13 | `hooks/usuario/usePedidos.js` + `screens/usuario/Pedidos.js` | Cada cambio de pestaña vaciaba la lista y volvía a pedir `mis-activos` y `mi-historial` con rueda (~2 s); log de cada ítem | Caché de la última respuesta por pestaña (al instante + refresco en segundo plano); sin log por ítem; `useDeferredValue` y `FlatList` más liviana | Lentitud |
| 14 | `hooks/usuario/useHistorialOculto.js` + `Pedidos.js` + `TripCard.js` | — | **Ocultar** del historial con confirmación `showAlert("¿Ocultar este pedido de tu historial?", "confirm", …, "Sí, ocultar")` y **"Ver ocultos"** para mostrarlos de nuevo. Guardado en `AsyncStorage` `historial_oculto_{userId}` (claves `pedido-ID` / `carrera-ID`) | No existe endpoint en el backend para ocultar historial (ver sección 6) |
| 15 | `components/usuario/pedidos/DetailSheet.js` | "Ver en vivo" sin acción | Cierra la hoja y abre el seguimiento (mismo `onNavigate` del botón principal) | Botón muerto |
| 16 | `screens/Delivery/StepUno.js` + `DestinationBar.js` | El origen no se podía cambiar (existía `openLocationPicker(true)` pero nada lo llamaba) | Tocar el origen abre el modo "Seleccionando punto de recogida" (función existente) | Botón faltante |
| 17 | `screens/Delivery/Shop.js` | "Cerca de ti · ¡Abierto!" fijo | Estado con `tienda_estado` (mismo interruptor del panel del comercio) → "¡Abierto!"/"Cerrado"; distancia con `user_location` de la tienda y `userLocation` guardado ("A 1.2 km"). Si faltan datos, se ve como antes | Información fija |
| 18 | `PaymentScreen.js` | Rango "22-28 min" inventado (+6) | Minutos reales de Google ("22 min") | Dato no real |
| 19 | `screens/Delivery/ServicioDetalle.js` | Mostraba la descripción aunque fuera solo un número ("45") | Se oculta si es solo un número | Pedido explícito |
| 20 | `screens/Billetera/StepDiecisiete.js` | — | Lápiz para cambiar la foto: misma subida que `PerfilUsuer` (`POST usuario/actualizar/{id}` con `foto_documento_file` + `tipo_usuario`) | Pedido explícito |
| 21b | `components/usuario/pedidos/DetailSheet.js` (solo estilos) | Título "Arrendamiento en Está…" cortado por el precio | Título hasta 2 líneas (17 px); precio en una línea con `adjustsFontSizeToFit`, máximo 36 % del ancho | "Cuadra la letra del arrendamiento… precio uniforme y compacto". Respaldo `Funcionalidad/DetailSheet-v5-antes-titulo-completo.js` |
| 21c | `components/usuario/pedidos/DetailSheet.js` (hoja "Detalle", la usan cliente y conductor) | Al cerrar con la X desaparecía de golpe; los valores de la animación no volvían, así que desde la 2.ª apertura salía de golpe; en las esquinas superiores se asomaba un pico blanco (hoja blanca + cabecera negra) | Abre siempre desde abajo (`setValue` antes de animar, animaciones por separado); X / tocar fuera / atrás la bajan en 240 ms y luego llaman `onClose`; "Ver pedido" y "Ver en vivo" siguen cerrando al instante (como antes) para no tapar la pantalla siguiente; fondo de la hoja = color de la cabecera y el contenido en blanco | "Cuando me meto al ícono ! y le doy X se buguea". Probado en el Redmi (abrir → X → reabrir). Respaldo `Funcionalidad/DetailSheet-v6-antes-cierre-animado.js` |
| 21 | `components/usuario/pedidos/ReservaCard.js`, `DetailSheet.js` (solo texto) | Fecha cortada: "lunes, 28 de septiembre de 2…" y "#40 · 29 de sept, 11:4…" (`numberOfLines={1}`) | Sin `numberOfLines`: la fecha pasa a una segunda línea si no cabe | Pedido explícito: "tiene que estar la fecha completa" |
| 22 | `components/usuario/pedidos/EmptyState.js` + `Pedidos.js` | En "Ver ocultos" sin elementos decía "Historial vacío · Aún no has completado ningún servicio"; el botón del pie quedaba bajo el botón central "Viaje" | Mensaje propio `ocultos` ("Nada oculto aquí"); `marginBottom: 24` en el botón | Hallado en la prueba en dispositivo |

| 23 | `screens/comercio/Dashboard.js` → `handleCreateItem` | No devolvía nada; el formulario se limpiaba siempre | Devuelve `true`/`false`; si salió bien cierra la hoja y muestra "¡Creado exitosamente!" (350 ms después, para no cruzar dos ventanas) | La hoja necesita saber si cerrarse; mismas llamadas a `createProducto`/`createServicio` |

| 24 | `screens/comercio/Dashboard.js` → `handleGuideAction` + `Inventario.js` (prop `abrirSeccion`) | En el instructivo, "Crear mi primera sección" / "Crear mi primer producto" bajaban y resaltaban el formulario | "Sección" baja a Mi menú y abre la ventana "Nueva sección"; "Producto" abre la hoja "Nuevo producto" (400 ms después de cerrar el instructivo) | El formulario ya no está en el panel; un toque menos para el local nuevo. Pendiente de confirmar por el usuario (respaldo `ComercioPanel/v1-Dashboard.js`) |

| 29 | `hooks/usuario/usePedidos.js`, `hooks/conductor/usePedidos.js` + `TripCard.js`, `DetailSheet.js`, `screens/conductor/Pedidos.js` | Todos los viajes con el mismo ícono de carro; título "Estándar" por defecto | Los normalizadores agregan `vehicle_type_id` (de `informacion_adicional`) y `categoria_nombre` (`service.nombre`/`vehicle_type.nombre` si el backend los manda). Las tarjetas y el Detalle usan `IconoVehiculo`; el título usa la categoría real si existe. El conductor pasa su `tipo_usuario` (de `userData`) | Pedido explícito. **Limitación verificada:** `conductor/mi-historial` hoy no trae servicio ni tipo de vehículo, y `vehicle_type_id` solo se guarda si el cliente eligió una categoría al pedir. Para que todos los viajes (viejos incluidos) tengan su ícono exacto, el backend debe incluir el nombre del servicio o del tipo de vehículo en `mi-historial`. Respaldos `../carby herramientas/design-versions/IconosCategoria/` |
| 30 | `components/LogoComercio.js` | Cada logo sin foto en el objeto pedía `usuario/{id}` al montarse: en el Home eran **13 peticiones a la vez** (~1 s c/u) compitiendo con la carga del Home (medido con un log temporal) | Caché de logos en el celular (`AsyncStorage` `logos_comercio_cache`, 24 h): desde la 2.ª apertura no se piden; los que faltan se piden **1,5 s después del arranque y de a 3**. Mientras, el ícono de tienda (como antes al cargar) | "Se demora mucho en cargar el home". Medición del arranque en modo desarrollo: ~6–8 s cargando el código desde el PC (propio del modo desarrollo), ~1,5 s `AuthLoadingScreen` (original, sin tocar), Home lleno a los ~16 s. Respaldo `../carby herramientas/design-versions/LogosComercio/LogoComercio-v1-antes-cola.js` |
| 25 | `hooks/comercio/useProductos.js` | `createProducto` no devolvía nada; `fetchProductos` no devolvía la lista. Las adiciones solo se podían crear en `EditarProducto` (al final de la pantalla) | `createProducto` devuelve el id nuevo (de la respuesta `data.id`/`producto.id`/`id`, o buscando por nombre el más reciente); nueva `createAdicional(productoId, {nombre, descripcion, precio})` con el **mismo** `POST producto-adicionales` de `EditarProducto` | "No veo dónde añadir las adiciones" |
| 26 | `ItemCreator.js` + `Dashboard.js` (`handleCreateItem`) | — | Bloque "Adiciones (opcional)" en Nuevo producto (nombre, precio y descripción, obligatorios como en `EditarProducto`; foto opcional 4:3 enviada como `file`, igual que `EditarProducto`; miniatura en la lista). Se guardan una por una después de crear el producto; si alguna falla: "Producto creado, pero N adiciones no se guardaron…" | Igual que 25 |
| 27 | `Inventario.js` + `Dashboard.js` + `screens/Delivery/EditarProducto.js` | — | Botón "Adiciones" en cada producto de Mi menú → `EditarProducto` con `verAdiciones: true`, que baja sola hasta "Adicionales del Producto". El estado Disponible/Pausado pasó debajo del precio | Igual que 25 |

| 28 | `hooks/comercio/useShopInfo.js` (`updateShopPhoto`) + `ShopHeader.js` + `Dashboard.js` (`handleCambiarLogo`) | El logo del comercio solo se cambiaba desde Cuenta → Datos Personales | Lápiz naranja sobre el logo de la cabecera del panel: galería (recorte 1:1) → misma petición `POST usuario/actualizar/{id}` con `foto_documento_file` + `tipo_usuario` que `StepDiecisiete`/`PerfilUsuer`; muestra carga sobre el logo y "Logo actualizado." | Pedido explícito. Respaldos `ComercioPanel/v0-useShopInfo.js`, `v1-ShopHeader.js`, `v3-Dashboard.js` |
| 30 | `screens/Delivery/Favoritos.js` (`doAdd`) | "Ver carrito" del aviso "Agregado" iba a `Cart`, una copia de la pantalla del carrito dentro del stack de Inicio, y el aviso quedaba abierto | Cierra el aviso y va a la pestaña `Carrito` (la del menú de abajo), igual que `Producto.js` y `Shop.js` | Pedido explícito: "que lo lleve al verdadero carro". Respaldo: `../carby herramientas/design-versions/Favoritos/v0-Favoritos.js` |

Respaldos de 25–27: `ComercioPanel/v0-useProductos.js`, `v0-EditarProducto.js`, `v1-ItemCreator.js`, `v2-Dashboard.js`, `v2-Inventario.js`.

Respaldos de 21–22: `../carby herramientas/design-versions/Funcionalidad/ReservaCard-v-antes-fecha-completa.js`,
`DetailSheet-v4-antes-fecha-completa.js`, `EmptyState-v0-original.js`, `usuario-Pedidos-v5-antes-vacio-ocultos.js`.

### 4b. Auditoría con 7 agentes (2026-10-26) y decisiones del dueño

Siete agentes revisaron todo el trabajo contra el código original (HEAD), solo lectura. Resultado: **nada que rompa la app**; consultas, envíos y claves de AsyncStorage intactos salvo lo aprobado. Decisiones del dueño y arreglos aplicados después (respaldos en `../carby herramientas/design-versions/Auditoria/`):

| # | Archivo | Antes | Ahora | Motivo |
| --- | --- | --- | --- | --- |
| 31 | `screens/Delivery/Cart.js` | El pedido guardaba "Restaurante" como lugar de recogida (`start_lugar`) | Consulta `usuario/{id}` y usa el **nombre real del negocio**, que llega a `PaymentScreen` → `start_lugar` | **Aprobado** por el dueño ("deben tener el nombre del negocio real") |
| 32 | `.gitignore` | — | Las líneas de las credenciales de Firebase siguen comentadas | **Decisión del dueño: dejarlo así** |
| 33 | `screens/Delivery/EditarProducto.js` (`eliminarAdicional`) | Tras borrar llamaba a `loadAdicionales()` (no existe): salía "Ocurrió un error" y la lista no se actualizaba; la confirmación solo tenía "Entendido" y ese botón (y atrás) **borraba** | `fetchAdicionales()`; la confirmación tiene "Eliminar" (ejecuta) y "Volver"/atrás (solo cierra) | Error del código original, arreglo pedido |
| 34 | `screens/Delivery/EditarServicio.js` | El botón "Eliminar" de la confirmación borraba pero el aviso quedaba abierto | Cierra el aviso y luego borra | Mismo arreglo |
| 35 | `screens/Delivery/Cart.js` | "Explorar Restaurantes" iba a `HomeScreen` (ruta que no existe; no hacía nada) | Abre Restaurantes (`Home` → `CategoriaVertical`, `tipo: "productos"`) | Pedido explícito |
| 36 | `EditarProducto.js`, `EditarServicio.js` (`pickAdicionalImage`) | `MediaTypeOptions.Images` (obsoleto) y sin manejo de error: al tocar la foto de la adición no pasaba nada | `mediaTypes: ["images"]` (como `ItemCreator`) + aviso si falla | Pedido explícito ("no me deja subir la foto"). Probado: con la app reiniciada abre la galería. Además la foto de la adición se sube **sin recorte** (`allowsEditing: false`, también en `ItemCreator`; `EditarServicio` ya era así): el recorte 4:3 cortaba fotos verticales como una botella. Foto principal del producto: **con recorte cuadrado** (1:1) también en `EditarProducto` (antes ahí no recortaba; al crear en `ItemCreator` ya recortaba 1:1), pedido del dueño |
| 38 | `screens/Delivery/StepUno.js` (`goBack`) | Volver llamaba `navigation.goBack()` siempre; sin pantalla anterior no hacía nada ("The action 'GO_BACK' was not handled") | Si se puede volver, vuelve; si no, va a la pestaña `Home` | Error del código original que el dueño vio en la consola. Respaldo: `../carby herramientas/design-versions/Auditoria/v0-StepUno-antes-goBack.js` |
| 39 | `screens/Delivery/StepUno.js` (alto de la hoja) | La hoja usaba `Dimensions.get("window").height` leído una sola vez al cargar el archivo; en el Redmi quedó en ~390 (el ancho) y la hoja se quedaba en 290 dp, con el botón de continuar cortado y sin poder subirla | Se mide el alto real con `onLayout` del contenedor (+ inset de arriba) y con eso se calcula la hoja abierta (62 %, igual que antes) y el tope con teclado | Pedido del dueño ("no deja subirlo, se dañó"). Probado en el Redmi: la hoja vuelve a abrir al 62 % y se ve "Zona muy concurrida", "Tu oferta" y la nota. Respaldo: `../carby herramientas/design-versions/Auditoria/v1-StepUno-antes-alto-hoja.js` |
| 37 | Chat y viajes: `components/ChatScreen.js`, `ChatUsuario.js`, `screens/Transport/components/{NearbyDriversMap,ServiceSelector}.js`, `screens/conductor/DetalleCarreraConductor/{index,components/ClientSheet,PinModal,RideMap}.js`, `screens/usuario/DetalleCarrera/{index,components/*}.js` | Fuentes `"MontserratBold"`/`"MontserratRegular"`/`"Montserrat"` que solo existen si antes se abrió el carrito → letras cortadas | `Montserrat_700Bold`/`_400Regular` (y el peso del `fontWeight` del mismo estilo para `"Montserrat"`, quitando ese `fontWeight`) | Pedido explícito ("arregla lo de la pantalla") |

Arreglos de cosas que el rediseño había cambiado sin aprobación (vuelven a como estaban o quitan un error propio):
- `HomeScreen.js`: si falla la ubicación, se cierra el mapa (antes del arreglo quedaba abierto detrás del aviso).
- Hojas de adición (`EditarProducto`, `EditarServicio`) y "Editar perfil" (`CrearPerfil`): tocar fuera ya no cierra (se perdía lo escrito); se cierra con la X / Cancelar / atrás, como antes.
- `TripCard.js`: se quitó un estilo duplicado (`detailBtnText`, se ve igual) y el ícono de respaldo vuelve a ser `car` como antes.
- `DetailSheet.js`: si no viene el nombre del comercio, la recogida muestra el texto original (antes del arreglo decía "Pedido").
- `Inventario.js`: "Pausado · no se muestra" → "Pausado" (que no se muestre depende del servidor, no está comprobado).
- `Favoritos.js`: en servicios, el logo usa también `item.user_id` (el id de comercio que el código original usa para ese servicio).
- `StepDiecisiete.js` (Datos personales): los valores ya no se cortan con "…" (se ven completos).
- `Dashboard.js`: en negocios de servicios el botón dice "Nuevo producto o servicio" (la hoja abre con el selector Producto/Servicio, como antes), no "Nuevo servicio".

Cambios menores que los agentes encontraron sin anotar (se dejan, son de diseño o mejoras):
- `SearchModal.js`: atrás cierra la búsqueda y una sugerencia se elige con un toque aunque el teclado esté abierto. `VehicleCarousel.js`: se quitaron las flechas ‹ › (se desliza con el dedo). Se quitaron animaciones decorativas (pulso del ícono de búsqueda, brillo del precio en `BidPanel`) y el texto "Mapa" del botón de mapa.
- `OrderSheet.js`: el arrastre de la hoja tiene tope arriba. `useHistorialOculto.js`: sin `userId` usa la clave `historial_oculto_anon`. `DetailSheet` también lo usa el comercio (`screens/comercio/Pedidos.js`).
- `NearbyBanners.js`: los banners sin imagen ya no muestran "Banner no disponible". Secciones del Home: el comercio se nombra con `establecimiento_nombre` (antes `nombre_completo`). `PaymentScreen.js` lee el carrito solo para mostrar fotos.
- `Inventario.js`: tocar toda la tarjeta abre Editar. `Dashboard.js`: "Estás fuera de tu horario de atención" (sale del `abiertoAhora` real). `CrearPerfil.js` (antes del arreglo de arriba) cerraba al tocar fuera.
- `Perfil.js`: "Tu code de referido" → "Tu código de referido"; "Referidos necesarios: N" → "N referidos". `LocationVerification.js`: "CarBy" → "Carby". `SelectorFecha` (registro): años desde hace 99 años hasta hoy.
- `Producto.js` (fila 6): el control "un comercio por pedido" ya existía en el código original pero nunca corría (el botón pasaba el evento como `confirmed`); el arreglo fue `onPress={() => addToCart()}`.

Pendiente / a revisar en el celular: sombras de botones con `borderRadius: 999` + `elevation` en varias pantallas (regla de la sección 5); los vistos en el celular (Agregar, Ir a pagar, Ver carrito) se ven bien. Errores del código original sin tocar: `GOOGLE_PLACES_API_KEY` sin definir en `ServicioDetalle.js` (la búsqueda del mapa falla), `setModalVisible` sin definir en `screens/User/Desembolso.js`, hooks después de un `return` en `ChatRiderComercio.js` y `usuario/ChatReserva.js`, íconos inexistentes (`calendar-check-outline`, AntDesign `checkcircle`…).

---

## 5. Gotchas encontrados (Android / edge-to-edge)

- `KeyboardAvoidingView` con edge-to-edge: `height` deja la vista encogida (franja gris); `padding` deja ~86 dp
  reservados; y **sobrescribe `paddingBottom` con 0 aunque esté desactivado** → usar `marginBottom = useAlturaTecladoAndroid()`.
- `Animated.parallel`: si una animación se detiene (arrastre), se detienen todas → hojas "en blanco". Animar por separado.
- `PanResponder` creado una vez lee estado viejo → usar `ref`.
- `borderRadius: 999` con `elevation` puede dibujar la sombra como recuadro → radio = mitad de la altura.
- Botón blanco con `elevation` sobre un mapa muestra un recuadro gris → sin `elevation`.
- Tarjeta con `elevation` + `borderRadius` + `overflow: "hidden"` sin borde quedó **en blanco** → `borderWidth: 1`, sin `overflow`.
- `SafeAreaView edges={['top']}` + `insets.top` en un hijo = doble espacio arriba.
- `new Date("AAAA-MM-DD")` se interpreta en UTC (día anterior en Colombia).
- **Galería que no abre en desarrollo**: después de varias recargas de la app en modo desarrollo, `expo-image-picker` falla con "Attempting to launch an unregistered ActivityResultLauncher" (sus lanzadores se registran al crear la pantalla nativa y la recarga los pierde). Se arregla **cerrando la app por completo y abriéndola de nuevo**; en el APK no pasa (no hay recargas).
- APK release local: el task `createReleaseUpdatesResources` de expo-updates reutiliza un `app.manifest` viejo y las
  imágenes cambiadas salen vacías → borrar `android/app/build/generated/assets/createReleaseUpdatesResources` y
  `android/app/build/intermediates/assets/release/mergeReleaseAssets` antes de `assembleRelease`.
- Cambios en vivo (Fast Refresh) en `HomeScreen` apagaban `isMountedRef` → la hoja de ubicación no abría hasta reiniciar la app (solo en desarrollo). **Arreglado**: el efecto de inicialización lo vuelve a poner en `true`.
- **Letras cortadas** ("Agrega", "Ver", "Volv"): `components/ErrorModal.js` (el `AlertaModal` de toda la app) usaba los alias `'MontserratBold'`/`'MontserratRegular'`, que solo existen cuando alguna pantalla los carga (`Cart.js`, `PedidoDetalle*.js`). Antes de abrir el carrito, Android medía el texto con una fuente y lo dibujaba con otra y lo cortaba. Ahora usa `Montserrat_700Bold`/`Montserrat_400Regular`, que se cargan al iniciar (`hooks/useLoadedAssets.js`). Respaldo: `../carby herramientas/design-versions/Favoritos/v0-ErrorModal.js`. Otros archivos usan esos alias sin cargarlos (viajes del usuario y del conductor, chat, `ServiceSelector`, `NearbyDriversMap`): pueden cortar letras igual; pendiente de aprobación.
- **Hora e íconos de arriba casi invisibles en el carrito**: `screens/Delivery/Cart.js` pedía `barStyle="light-content"` (pensado para el encabezado oscuro), pero con edge-to-edge la franja de arriba es la del `SafeAreaView` (clara) y el `backgroundColor` del `StatusBar` no se aplica. Ahora `dark-content`. Respaldo: `../carby herramientas/design-versions/Favoritos/v0-Cart-antes-statusbar.js`. Probado en el Redmi: Favoritos → Agregar → "Ver carrito" abre la pestaña Carrito (con el menú de abajo) y la hora se lee.

---

## 6. Pendiente / depende del servidor o de datos

- **Ocultar del historial** se guarda solo en el celular. Para que quede en la cuenta, el backend necesitaría una ruta
  (p. ej. `POST mi-historial/ocultar` con `{ tipo, id }`) y un campo `oculto_usuario`; la app ya tiene el punto de
  integración en `useHistorialOculto.js`.
- **Métodos de pago del checkout**: solo aparecen los activados para el usuario/comercio (`puede_pagar_efectivo`,
  `qr_estado`, `mercado_pago_estado`). Con un comercio sin ninguno activo no se puede pedir: es configuración, no código.
- **Logos**: los comercios sin foto subida (p. ej. "Hamburguesería Pepe") muestran el ícono de respaldo.
- **"Cerca de ti"** solo muestra la distancia si `GET usuario/{id}` trae `user_location`; si no, queda el texto anterior.
  Es la misma ubicación de tienda que usa el panel del comercio (`hooks/comercio/useShopInfo.js`). Las tiendas de prueba
  están configuradas casi en la dirección del usuario de prueba, por eso salen "A 3 m" / "A 5 m".
- **Total del Detalle (código original, sin tocar — pendiente de decisión)**: la tarjeta del historial muestra
  `calcOrderCosts(item).total` (productos + envío, p. ej. $119.002) y el Detalle muestra `item.costo_total`
  (solo productos, $110.000) arriba y en "Total". Así estaba en la versión original (`DetalleSheet/v0-original.js`).
- **Pedidos antiguos con decimales** ("$30.015,44"): vienen guardados así en el servidor desde antes del arreglo #4.
- **"Recogida: Restaurante"** en el Detalle: es el texto guardado en `start_lugar`; en la tarjeta se reemplaza
  "Establecimiento" por el nombre del comercio, pero "Restaurante" se muestra tal cual.

---

## 7. Pruebas

No hay pruebas automáticas en el proyecto. Cada cambio se verificó así: el bundle de Metro compila
(`AppEntry.bundle?platform=android&dev=true` → HTTP 200), sin errores en logcat, y prueba manual en el Redmi
(`zhpj6x6p9lemca4d`) tocando con `adb shell input tap` solo cuando el usuario no estaba usando el celular.

## 8. Registro de pruebas en dispositivo

25-oct-2026, Redmi Note 13 Pro, modo desarrollo, cuenta de usuario (cliente).

| # | Prueba | Resultado |
| --- | --- | --- |
| 1 | Reservas → tocar "Salon Malaga" en la tarjeta | OK: abre `Shop` de Salon Malaga con "A 3 m · ¡Abierto!" |
| 2 | Historial → Carreras → ojo tachado en #157 | OK: confirmación "¿Ocultar este arrendamiento de tu historial?" → "Sí, ocultar" → "Ocultado de tu historial."; contadores 68 → 67 y Carreras 48 → 47 |
| 3 | Pie de la lista → "Ver ocultos (1)" | OK: Carreras (1) / Pedidos (0) con la #157 y botón de ojo; "Volver al historial". Se vio el mensaje "Historial vacío" y el botón bajo "Viaje" → arreglado (#22) |
| 4 | Ojo en la #157 oculta | OK: "Visible de nuevo en tu historial."; contador vuelve a 68 |
| 5 | Historial → Pedidos → tocar "Pizzas Juancho" | OK: abre su tienda ("A 5 m · ¡Abierto!") |
| 6 | Viaje → tocar el origen (lápiz) | OK: modo "Seleccionando punto de recogida" con la dirección actual; "Cancelar" vuelve sin cambios |
| 7 | Fecha de la reserva y del Detalle (#21) | OK: "lunes, 28 de septiembre de 2026" completa en 2 líneas; "#45 · 6 de oct, 7:42 p. m." completo |
| 8 | Logos en "Los más baratos" / "Los más vendidos" | OK: logos reales; Carlos Sánchez sin logo → ícono de respaldo |

Una primera prueba del punto 1 llevó a Inicio, pero el usuario estaba usando el celular al mismo tiempo; repetida sin
interferencia funcionó (fila 1).

## 9. Cómo revertir

- Una pantalla: copiar el archivo de la versión deseada desde `../carby herramientas/design-versions/<Pantalla>/` sobre el archivo del repo.
- Splash nativo: tras revertir los recursos de `android/`, recompilar (`npx expo run:android --device <MODELO> --no-bundler`).
- Todo el rediseño: `git checkout -- <archivo>` / `git restore` sobre los archivos de las secciones 2–4 (nada está commiteado).

## 10. APK generados (local, no publicados)

`../carby herramientas/APK/`: `Carby-diseno-20261024-1404-pasos-circulo.apk`, `Carby-diseno-20261024-2148-tienda-ubicacion.apk`,
`Carby-diseno-20261024-2226-viaje-perfil.apk`, `Carby-diseno-20261025-0019-checkout-perfil.apk`, `Carby-diseno-20261025-1051-panel-comercio.apk`, `Carby-diseno-20261026-1056-conductor-comercio.apk`, `Carby-diseno-20261026-1451-home-restaurantes.apk` (Home A2, hamburguesa, más baratos en tiquetes, ubicación, Favoritos → Carrito, aviso sin letras cortadas, Restaurantes/Servicios A2), `Carby-diseno-20261026-1940-auditoria-adiciones-viaje.apk` (último: además arreglos de la auditoría (filas 31–39), adiciones con foto completa y descripción, recorte cuadrado en Editar producto, fuentes de chat y viajes, hoja de Pedir viaje, fotos de Servicios y Pedir viaje en el Home, nombre del saludo más pequeño, sin comentarios en el código; hashes de imágenes verificados).
`NO-ENVIAR-sin-logo-20261024-1348.apk` tiene el bug del logo vacío (manifest viejo).
