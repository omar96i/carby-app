# Estados de pedido delivery — conductor (carrera con pedido)

Alcance: `screens/conductor/DetalleCarreraConductor/` cuando `tripData.pedido` existe
(`isDelivery = true`). Físicamente es una carrera, pero el flujo y los mensajes son de delivery.

## 1. Panorama ideal

El problema actual: delivery solo vive en `aceptado → completado`, y el paso intermedio
era un botón suelto “notificar al comercio” (`GET enviar-comercio/{pedido_id}`) que no
cambia `estado`. Como el backend dispara push según `estado`, esos estados intermedios
deben existir de verdad en la carrera.

Flujo propuesto (4 estados + cancelado):

| `estado` backend | Significado | Interno (`getPedidoState`) | Header / botón conductor |
| --- | --- | --- | --- |
| `aceptado` | Pedido aceptado, ir al comercio | `accepted` | “Pedido aceptado · Dirígete al comercio” / botón “Llegué al comercio” |
| `en_comercio` | Llegó al comercio, recogiendo | `at_store` | “Llegaste al comercio” / botón “Pedido recogido · en camino al usuario” |
| `recogido` | Pedido recogido, en camino al usuario | `to_customer` | “Pedido recogido · en camino al usuario” / botón “Completar entrega” (abre PIN) |
| `completado` | Pedido entregado (PIN ok) | `finished` | `FinishedSheet` sin rating (delivery no califica) |
| `cancelado` | Terminal alterno | `canceled` | Volver a `BottomTabNavigatorDelivery` |

Por qué no reusar `llegado/activo` de carrera individual: el backend manda push
distintas por estado (“llegó donde el usuario” vs “llegó al comercio”, “en camino al
destino” vs “pedido en camino”). Si delivery escribiera `llegado/activo`, el usuario
y el comercio recibirían el texto de pasajero. `en_comercio/recogido` son la señal
para que el back notifique al actor correcto.

Mapa en código: `utils.js` → `PEDIDO_ESTADOS`, `getPedidoState`, `HEADER_TEXT`
(`accepted/at_store/to_customer/finished/canceled`). Solo aplica si `isDelivery`;
carrera sin pedido sigue usando `getTripState` (`to_pickup/arrived/to_destination`).

## 2. Consumo de la API (conductor delivery)

Base: `https://back.carbycol.com/api/`. Auth: `Authorization: Bearer <userToken>`.
Mismo helper que carrera: `updateEstado(e)` → `POST carreras/{activeId}/estado`
`{ "estado": e }`, luego `refetch()` (`GET carreras/{id}`).

| Paso UI | Handler | Request | Push asociada |
| --- | --- | --- | --- |
| Aceptar pedido | `ActiveRequestCard.updateTripStatus` / `HomeDelivery` | `POST carreras/{id}` body `{ "estado": "aceptado", "conductor_id": <int> }` | — (entra a `StepTrece`) |
| Llegué al comercio | `handleArriveAtStore` (botón primario + notify) | `POST carreras/{id}/estado { "estado": "en_comercio" }` | `GET enviar-comercio/{pedido_id}` |
| Pedido recogido · en camino | `handlePickupOrder` | `POST carreras/{id}/estado { "estado": "recogido" }` | `GET enviar-usuario/{usuario_id}` |
| Completar entrega | `handleFinish` → `verifyPin` (`enteredPin === tripData.pin`) | `POST carreras/{id}/estado { "estado": "completado" }` | `GET enviar-comercio-finish/{pedido_id}` (manual en `StepTrece`, pendiente cablear aquí) |
| Cancelar | `handleCancel` | `POST carreras/{id}/conductor-cancelar`, fallback `POST carreras/{id}/estado { "estado": "cancelado" }` | — |

Lectura: `useTripData` (`GET carreras/{id}` cada 5s). `FinishedSheet` con
`showRating={!isDelivery}` → en delivery no pide calificación.
Pago: `POST carreras/{id} { estado_pago: "aprobado" }` (ortogonal al estado).

Contrato que el backend debe soportar: aceptar `en_comercio` y `recogido` en
`POST carreras/{id}/estado` y emitir push diferenciadas:
- `en_comercio` → comercio (“repartidor en tienda”) + usuario (“fuimos por tu pedido”).
- `recogido` → usuario (“pedido en camino”) + comercio (cierre).
- `completado` → ambos (entregado). Hoy `enviar-comercio-finish` solo existe manual
en `StepTrece` legacy; conviene que el back lo dispare solo al recibir `completado`.

## 3. Qué cambió en código
- `utils.js`: `PEDIDO_ESTADOS` + `getPedidoState` + headers `accepted/at_store/to_customer`.
- `index.js`: `state = isDelivery ? getPedidoState(estado) : getTripState(estado)`;
handlers `handleArriveAtStore` (`en_comercio` + `enviar-comercio`) y `handlePickupOrder`
(`recogido` + `enviar-usuario`); `ClientSheet` recibe `onArriveAtStore/onPickupOrder`.
- `ClientSheet.js`: botón notify “Llegué al comercio” solo en `accepted`; acción primaria
escalonada `accepted → at_store → to_customer → finished`; `OrderDetailsCard` intacto.
- `RideMap.js` + ruta: `accepted/at_store` muestran pasajero/comercio, `to_customer`
muestra destino + polyline (igual que `to_destination`).
- `TopBar`: respeta `isDelivery` (“Entrega en curso”) y cae a `HEADER_TEXT[state]`.

## 4. Cómo probar
1. Aceptar pedido → `aceptado`, header “Pedido aceptado”, botón “Llegué al comercio”.
2. Llegué al comercio → `en_comercio`, comercio recibe push, botón cambia a “Pedido recogido”.
3. Recogido → `recogido`, usuario recibe push “en camino”, botón “Completar entrega”.
4. PIN → `completado`, `FinishedSheet` sin rating, vuelta a home delivery.
5. Verificar en backend que `estado` nunca sea `llegado/activo` en este flujo.
