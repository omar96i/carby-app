# Plan de implementación — Nuevo algoritmo de tarifas Carby

Fuente: `estudio-factura/Carby - Estudio de tarifas/Estudio de tarifas Carby.html` + `Anexo - Fórmula propia/codigo/` (`pico.js`, `curva.js`, `util.js`, `modelo-pico.json`, `modelo-curva.json`, `prueba-propia.mjs`).
Destino: `screens/Delivery/StepUno.js` (+ guardado de detalle en `carreras.informacion_adicional`).
Alcance: solo Colombia, Medellín/Valle de Aburrá. Perú fuera de alcance.
Modalidad: implementación tal cual el documento, reutilizando el código existente. Sin panel administrable, sin reescritura de fórmulas.

---

## 1. Resumen general

Se implementa la fórmula propia del estudio tal cual está codificada: PICO como fórmula principal y CURVA como alternativa conmutables por flag, usando los JSON entrenados del estudio sin modificar coeficientes.

```
precio = base(km,min) × hora × zonaOrigen × zonaDestino × tráfico × lluvia × (1+margen)
→ redondeado a $100, mínima $6.300 carro / $3.700 moto
```

En `StepUno.js` se reemplaza el cálculo actual (`base + distKm*precioKm + adicional`, `StepUno.js:874-899`) por la llamada al código del estudio. Todo lo demás se mantiene: `DistanceMatrix` (km/min/tráfico), `POST /demanda/evaluar`, `bidOffset` manual, `crearCarrera`.

## 1.1 Qué se reemplaza y qué se recicla

Motor nuevo, carrocería actual. Estado: **implementado**.

- **Se reemplaza (núcleo de precio):** `precio_base`, `precio_km`, `precio_adicional` y su `tarifa_vigente` por schedule dejan de alimentar el cálculo **solo para moto, carro y deluxe/confort**. La base pasa a salir del JSON del estudio (ej. carro PICO: `5536.8 + 750.1/663.5/683.2 por tramo + 225.2/min`). Esos 3 campos del servicio quedan como catálogo, referencia (`schedule_id` en `informacion_adicional`) y respaldo del rollback.
- **Se recicla tal cual:** `fetchRouteInfo` (km, min con/sin tráfico), `pickupCoord/deliveryCoord`, `vehicleTypes/services`, `POST /demanda/evaluar` (el `%` se suma encima del precio PICO/CURVA), `bidOffset`, `PaymentSelector`, `crearCarrera`, y toda la UI (mapa, bottom sheet, `VehicleCarousel`, `BidPanel`).
- **Rollback:** flag `USE_TARIFA_NUEVA`. En `true` cotiza con PICO/CURVA; en `false` vuelve a la fórmula anterior sin nueva publicación en tiendas. Es el interruptor de seguridad si la tarifa nueva cobra mal en producción.
- **Precio visible solo con A y B:** `updatePriceDisplay` y `VehicleCarousel` usan `hayRuta()` (requiere `pickupAddress + deliveryAddress + ambas coords + distanceInKm > 0`). Sin ruta completa, tarjetas muestran `--`, `BidPanel` se oculta (`hasPrice=false`), botón muestra `Ofrecer $--` y `crearCarrera` queda bloqueado por `disabled`.

## 2. Qué se reutiliza tal cual (sin tocar lógica)

| Origen | Destino en la app | Cambio |
|---|---|---|
| `codigo/pico.js` (7.9 KB) | `utils/tarifas/pico.js` | Ninguno (puro, sin dependencias, apto navegador) |
| `codigo/curva.js` (7.1 KB) | `utils/tarifas/curva.js` | Ninguno, solo resuelve `./util.js` en Metro |
| `codigo/util.js` (4.0 KB) | `utils/tarifas/util.js` | Ninguno (`esFestivo`, hex, Huber) |
| `codigo/modelo-pico.json` (16.8 KB) | `assets/tarifas/modelo-pico.json` | Ninguno, import estático |
| `codigo/modelo-curva.json` (14.6 KB) | `assets/tarifas/modelo-curva.json` | Ninguno, import estático |
| `codigo/prueba-propia.mjs` | Test de aceptación | Verificado: los 3 ejemplos del anexo dan $12.200 / $22.400 / $38.000 en carro PICO ±$100 con el wrapper (`utils/tarifas/index.js`) |

> Archivos ya copiados a `utils/tarifas/` y `assets/tarifas/` (ver 3.2 para el mapeo por nombre de servicio).

No se porta el laboratorio (colector USB, orquestador, torneo, vigía, supervisor) ni las variantes con inDrive en vivo (HN1/HN3, EN VIVO/Kalman, `_nivel`): son infraestructura de medición, no cotizador, y requieren fuente inDrive en producción que no existe.

## 3. Qué se implementa (plan único)

1. **Copia + wrapper** (`utils/tarifas/index.js`, archivo nuevo): traduce lo que `StepUno.js` ya tiene al formato `viaje` del estudio (`km = distanceInKm`, `min = routeDurationInTraffic`, `trafico = minCon/minSin`, `o/d = coords`, `lluvia = flag`). Expone `cotizarTarifa()` con flag `PICO/CURVA`. Complejidad: **Baja**.
2. **Integración `StepUno.js`**: `computeSuggestedPrice` llama al wrapper; demanda (`×(1+pct)`) y `bidOffset` se siguen sumando encima. Se corrigen mínima (`5` → la del JSON) y redondeo (a $100, ya lo hace el código). Flag `USE_TARIFA_NUEVA` con rollback a fórmula anterior + modo sombra (loguear viejo vs nuevo, métricas banda `[-300,+500]`/pierde/típica). Complejidad: **Media** (punto más frágil: 5 `useEffect` de precio encadenados).
3. **Zona caliente**: se mantiene `POST /demanda/evaluar` actual con tope y aviso "Zona muy concurrida" existente (`StepUno.js:1654-1664`). Sin conteo de conductores libres (fuera de este plan). Complejidad: **Baja**.
4. **Trazabilidad**: guardar `detalle{formula, tipoDia, hora, base, factores, margen, demanda}` en `informacion_adicional` de `crearCarrera:1085`. Sin cambios de API ni migraciones. Complejidad: **Baja**.
5. **Validación**: 3 ejemplos del anexo + hexágono desconocido (debe dar 1 o promedio vecinos, nunca NaN) + cambio de hora sin salto (interpolación) + mínima/redondeo. Complejidad: **Media**.

**Complejidad total del plan: Media (6/10).** Sin bloqueadores técnicos; el riesgo es de datos (modelo entrenado con fin de semana Medellín; la fila laboral es promedio hasta medir días laborales en Medellín).

## 3.1 Panorama actual del ecosistema (moto y carro)

El ecosistema actual solo abarca **moto y carro**. Por tanto:

- **Moto y Auto/Particular → algoritmo nuevo** (PICO principal, CURVA conmutable).
- **Envíos → algoritmo nuevo con selector Moto/Carro + adicional** (`envioVehiculo` en el sheet, default moto).
- **Pedidos de comercio (`Cart → PaymentScreen`) → algoritmo moto + adicional.** El `costo_envio` se calcula con `cotizarServicio({ service: { nombre: "Moto" }, km: distance, minCon: rutaMin })` (origen = ubicación del establecimiento, destino = entrega elegida) **más el `precio_adicional` efectivo del servicio comercio**, con redondeo a $100 (nunca bajo el precio del modelo). Se mantiene la compuerta de `deliveryService` (el comercio debe tener servicio configurado) y la referencia `schedule_id/tarifa_vigente` en `datos_generales`, más `tarifa_formula/rama/detalle` (incluye `adicional`) igual que en StepUno.
- **Deluxe/confort y todos los demás escenarios (mototaxi, camión/grúa, servicios futuros) → algoritmo actual** (`precio_base + distKm*precio_km + precio_adicional` con `tarifa_vigente`). Sin cambios para ellos en este plan.

### 3.2 Servicios futuros (moto, particular, deluxe, camión)

El JSON del estudio solo trae 2 vehículos (`carro`, `moto`). No existen coeficientes para deluxe ni camión. Estado: **implementado en `utils/tarifas/index.js:detectarRama`**.

Verificación contra API: la app no trae "carro" como nombre de servicio. El mapeo se hace **solo por `nombre` del servicio** (sin rol ni `vehicle_types`), en minúsculas y sin tildes, en este orden:

- **Moto → `modelo.moto`. Auto/Particular/Carro/Taxi → `modelo.carro`.** (`mototaxi` se excluye antes para no confundir `moto` con `mototaxi`.)
- **Envíos (`envio`, `encomienda`, `paquete`, `mensajeria`) → algoritmo nuevo con opción Moto/Carro + `precio_adicional` del servicio.** Al seleccionar Envíos aparecen solo las pills Moto | Carro (sin etiqueta, default moto): Moto → `modelo.moto`, Carro → `modelo.carro`, y se suma el adicional efectivo del servicio con redondeo a $100 (nunca bajo el precio del modelo). Verificado corto 4.2 km: moto $7.300 + $1.500 → $8.800; carro $12.200 + $1.500 → $13.700. La tarjeta del carrusel estima con moto por defecto. Al elegir Moto/Carro se escribe la nota automática `Solicitud de envio - moto|carro` en `observations` (respeta nota manual del usuario; se elimina sola al cambiar de servicio). El detalle (`envioVehiculo`, `adicional`) queda en `informacion_adicional`.
- **Deluxe, mototaxi, grúa y cualquier otro nombre → algoritmo actual** (`precio_base/km/adicional` con `tarifa_vigente`), sin importar rol o tipo de vehículo enlazado.

## 4. Fuera de alcance

- Panel administrable / CRUD de tarifas (descartado por el cliente).
- Backend nuevo (`/cotizar`, migraciones, reentreno automático, torneo).
- Medición de días laborales, festivo o tráfico pesado (proyecto de datos aparte).
- Cambios visuales salvo el aviso de zona caliente ya existente.
- Coeficientes propios para deluxe, camión y servicios futuros (no existen en el JSON del estudio, que solo trae `carro`/`moto`).

### 4.1 Dificultad técnica de esos servicios (fuera de este plan)

Deluxe, mototaxi, camión y futuros usan el algoritmo actual, sin dificultad adicional. Si el día de mañana se les quisiera dar algoritmo nuevo propio, la dificultad sería:

- **Deluxe/confort (Media):** opción `modelo.carro` × factor premium constante (referencia estudio: ×1.10–1.30). El estudio no lo midió para Carby, así que el factor sería estimado: riesgo de no capturar hora/zona propia del deluxe.
- **Camión/grúa (Alta):** sin lecturas en el estudio, sin base, sin zonas, sin hora pico propia. Sacarle coeficientes reales exige repetir el proceso del laboratorio solo para ese vehículo: cientos de lecturas reales en Medellín, tablas 24h, hexágonos propios, validación banda/pierde. Cualquier factor provisional sobre `modelo.carro` sería estimado, no medido.
- **Servicios futuros en general (Alta si piden precisión):** cada categoría nueva con comportamiento distinto (ej. carga, mototaxi) necesita su propio ciclo de medición + entrenamiento + versión de modelo. El wrapper actual solo mapea (`moto | carro | actual`); agregar una rama real implica nuevo `modelo-<servicio>.json` y su `prueba-propia` equivalente.
