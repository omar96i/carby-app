# Estados de carrera individual — conductor (sin pedido)

Alcance: carrera sin `pedido` asociado, pantalla `screens/conductor/DetalleCarreraConductor/`
(ruta `StepTrece` / `DetalleCarreraConductor`). No aplica a delivery con pedido ni a pedidos de comercio.

## 1. Terminología canónica

| `estado` backend | Significado | UI conductor (`getTripState` → interno) | Header / botón |
| --- | --- | --- | --- |
| `pendiente` | Buscando conductor (nadie aceptó aún) | `to_pickup` | “Conductor aceptó · en camino a recoger” / Dirígete al punto de recogida |
| `aceptado` | Conductor aceptó el arrendamiento, va en camino | `to_pickup` | Botón: “Llegué donde el cliente” |
| `llegado` | Conductor llegó donde el usuario | `arrived` | Botón: “Recogí al cliente · Iniciar viaje” |
| `activo` | En camino al lugar de llegada (pasajero a bordo) | `to_destination` | Botón: “Finalizar arrendamiento (PIN)” |
| `completado` | Arrendamiento completado | `finished` | `FinishedSheet` + calificar pasajero |
| `cancelado` | Terminal alterno | `canceled` | Sheet cancelado / volver |

Mapa en código: `screens/conductor/DetalleCarreraConductor/utils.js` → `CARRERA_ESTADOS`, `getTripState`, `HEADER_TEXT`.
Valores legacy solo lectura (nunca escribirlos): `en_camino/en_curso → to_pickup`, `iniciado/en_viaje → to_destination`, `finalizado → finished`, `arrived → arrived`.

El conductor no ve `pendiente` en su detalle: llega aquí después de aceptar. Si `GET carreras/{id}` devuelve otro estado, el polling cada 5s (`useTripData`) lo refleja solo.

## 2. Consumo de la API (conductor)

Base: `constants/url.js` → `BASE_URL = https://back.carbycol.com/api/`. Auth: `Authorization: Bearer <userToken>` (AsyncStorage `userToken`).

### 2.1 Aceptar (crea el vínculo conductor→carrera)
- `POST {BASE_URL}carreras/{id}` — usado por `components/ActiveRequestCard.js:updateTripStatus`
- Body: `{ "estado": "aceptado", "conductor_id": <int> }`
- Respuesta esperada: carrera con `estado: "aceptado"`. Navega a `StepTrece { carreraId: id }`.
- Delivery equivalente: `screens/HomeDomicilio/HomeDelivery.js:506` → `{ conductor_id, estado: "aceptado" }`.

### 2.2 Avanzar estados (detalle conductor)
Todos vía helper `updateEstado(nuevoEstado)` en `screens/conductor/DetalleCarreraConductor/index.js:130`:
- `POST {BASE_URL}carreras/{activeId}/estado`
- Headers: `{ "Content-Type": "application/json", Authorization: Bearer <token> }`
- Body: `{ "estado": "<llegado|activo|completado|cancelado>" }`
- Tras `ok` → `refetch()` (`GET carreras/{id}`).

| Acción UI | Handler | `estado` enviado | Efecto extra |
| --- | --- | --- | --- |
| Llegué donde el cliente | `handleArrive` | `llegado` | `GET enviar-usuario/{usuario_id}` (push “llegó”, best-effort) |
| Recogí al cliente · Iniciar viaje | `handleStartTrip` | `activo` | — |
| Finalizar (PIN ok: `enteredPin === tripData.pin`) | `verifyPin` | `completado` | Cierra modal, `refetch` → `FinishedSheet` |
| Cancelar servicio | `handleCancel` | `cancelado` | Intenta primero `POST carreras/{id}/conductor-cancelar`; si 404, fallback a `/estado` |

### 2.3 Lectura / polling
- `GET {BASE_URL}carreras/{tripId}` (`useTripData`), cada 5s. Acepta `{data}` envuelto o directo.
- `POST {BASE_URL}carreras/ubicacion` (`useDriverPing`, cada 10s): `{ latitud, longitud, estado: "activo" }`. Ojo: ese `estado` es del ping de ubicación, no cambia la carrera.
- Activa bloqueante: `GET {BASE_URL}carreras/conductor/activa` — si `data.estado` no es `completado/cancelado`, no aceptar otra.
- Pago (no es estado de carrera): `POST carreras/{id} { estado_pago: "aprobado" }`; calificación: `POST carrera/{id}/calificar-pasajero { puntuacion, mensaje }`.

## 3. Push asociadas (quién dispara qué)
- Registro token: `utils/registerForPushNotification.js` → `notification-token/register { token }` + `notification-token/assign-user { user_id, token }`.
- Al marcar `llegado`: `GET enviar-usuario/{usuario_id}` (texto lo pone backend).
- Botones manuales delivery (`StepTrece`): `enviar-comercio/{pedido_id}`, `enviar-usuario/{usuario_id}`, `enviar-comercio-finish/{pedido_id}`. En carrera sin pedido solo aplica `enviar-usuario`.

## 4. Archivos tocados en esta formalización
- `screens/conductor/DetalleCarreraConductor/utils.js`: `CARRERA_ESTADOS` + `getTripState` explícito (`aceptado → to_pickup`, `cancelado → canceled`) + `HEADER_TEXT` con copy acordado.
- Sin cambios de endpoints ni de backend.

## 5. Cómo probar
1. Conductor acepta desde `ActiveRequestCard` → backend `aceptado`, entra a `StepTrece`, botón “Llegué donde el cliente”.
2. `llegado` → header “Llegaste donde el usuario”, botón “Recogí al cliente · Iniciar viaje”, usuario recibe push.
3. `activo` → header “En camino al lugar de llegada”, mapa muestra destino + ruta, botón PIN.
4. PIN correcto → `completado` → `FinishedSheet`, calificar, volver a `BottomTabNavigatorDelivery`.
5. Intentar aceptar segunda carrera con una en `aceptado/llegado/activo` → bloqueado por `carreras/conductor/activa`.
