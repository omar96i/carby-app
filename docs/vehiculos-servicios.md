# Vehículos × Servicios — autoadministrable

> Flujo afectado: `screens/Delivery/StepUno.js` (servicios por rol + tipo vehículo).
> Flujo intacto: `screens/Delivery/Cart.js` → `PaymentScreen` → `pedidos.tipo_viaje` (delivery).
> Registro afectado: `screens/Register/RegistroDomiciliario.js` (elegir tipos de carro).

## Estado actual (verificado)

- `GET /services` (`ServiceController@indexAll`) filtra hardcodeado `roles = rider.taxi OR rider.moto`.
- `services.roles` es JSON ej. `["rider.moto","rider.taxi"]`.
- `Carrera::getNearbyTrips()` + `CarreraController@resolveDriverTypes` filtran solo por `tipo_usuario`.
- No existe `vehicle_type` funcional (`users.tipo_vehiculo` nunca se escribe).
- Registro rider pide `tipo_usuario` (`rider.moto` Delivery / `rider.taxi` Particular) + `placa/marca/linea/color` texto libre.

## Diseño

```text
vehicle_types (catálogo admin: moto, mototaxi, particular, deluxe, grua, ...)
service_vehicle_type (N:M servicio ↔ tipos)
user_vehicle_type (N:M conductor ↔ tipos que puede atender)
services.roles se mantiene por compatibilidad (deprecated a futuro)
```

## Progreso

### Backend `C:\Users\Omar hincapie\Desktop\yariders-back`

- [x] `database/migrations/2026_10_12_000001_create_vehicle_types_table.php` — crea `vehicle_types` + seed (moto, mototaxi, particular, deluxe, grua).
- [x] `2026_10_12_000002` — pivote `service_vehicle_type`.
- [x] `2026_10_12_000003` — pivote `user_vehicle_type`.
- [x] `2026_10_12_000004` — backfill `services.roles` → pivote (idempotente).
- [x] Modelo `VehicleType` + relaciones `Service::vehicleTypes`, `User::vehicleTypes`.
- [x] `VehicleTypeController` (`GET /vehicle-types` público + CRUD admin).
- [x] `ServiceController`: aceptar `vehicle_type_ids[]` (sync) + filtro `?vehicle_type_id=`.
- [x] `UserController@store/update`: aceptar `vehicle_type_ids[]`.
- [x] `Carrera::getNearbyTrips` + `resolveDriverTypes` + `_notifyNearbyDrivers`: filtrar por vehículo.
- [x] Rutas `api.php` (`GET /vehicle-types`, CRUD auth).
- [x] Filament `VehicleTypeResource` + `ServiceResource` con selector de tipos.
- Sintaxis verificada con `php -l` (15 archivos OK). Pendiente: `php artisan migrate` en prod (solo aditivas).

### App `C:/YaRidersAPP`

- [x] `StepUno.js`: selector tipo vehículo + `fetchServices` filtrado + enviar `vehicle_type_id` en `crearCarrera`.
- [x] `RegistroDomiciliario.js`: multiselect `GET /vehicle-types` + enviar `vehicle_type_ids[]`.
- [x] `Cart.js`: sin cambios (verificado).

## Reglas prod

- Prohibido `migrate:fresh`. Solo migraciones aditivas + `php artisan migrate`.
- Verificar cada archivo con `php -l` antes de migrar.
- Rollout: 1) migraciones + APIs backwards-compatibles, 2) app + admin, 3) deprecar `roles`.

## Verificación (2026-10-12)

- `php -l`: 15 archivos backend OK.
- `php artisan route:list --path=vehicle`: 5 rutas API + 3 Filament OK.
- `php artisan migrate --pretend`: las 4 migraciones generan SQL válido, sin ejecutar nada en prod.
- `php artisan migrate --force` ejecutado: 4/4 DONE.
  - `vehicle_types`: 5 (moto, mototaxi, particular, deluxe, grua).
  - `services`: 6. Pivote `service_vehicle_type`: 7 filas (backfill desde `roles`).
  - Filtro verificado: `moto` → 3 servicios, `grua` → 0 (pendiente enlazar Deluxe→grúa desde admin).
- Paso siguiente: enlazar servicios a tipos desde Filament (Servicios → Tipos de vehículo) y probar app.

## Usuarios existentes (2026-10-12)

- Migración `2026_10_12_000005_backfill_user_vehicle_types`: `rider.moto`→moto, `rider.mototaxi`→mototaxi, `rider.taxi`→particular (idempotente, por chunks de 500).
- Resultado: 3 moto + 1 particular = 4/4 riders cubiertos. Sin mototaxis registrados.

## UserResource funcional (2026-10-12)

- Filtros: tipo de usuario, tipo de vehículo, estado, app activa, rango de registro. Orden default por creación desc.
- Columnas: tipo (badge con color), tipos de vehículo (badges), placa, app activa, estados por rol (ocultas por defecto).
- Acción masiva "Asignar tipo de vehículo" (sync sin quitar los existentes).
- Formulario: `tipo_usuario` como selector, checklist de tipos, placa/marca/línea/color, toggle activa; contraseña solo obligatoria al crear.

## Conectarse del conductor (2026-10-12)

- `HomeDelivery.js` envía `vehicle_type_ids` explícitos en `POST /carreras/nearby` (los resuelve de `userData` → AsyncStorage → `GET usuario/{id}` y los cachea). Sin tipos, el backend usa los del conductor autenticado como respaldo.
- `UserController@get` ahora incluye `vehicleTypes` para que la app siempre los tenga frescos.
- El ping de `StepTrece.js` no se tocó (solo registra ubicación, ignora la respuesta).

## Distintivo offline (2026-10-12)

- `OfflinePanel` muestra en sutil (gris, con icono) los tipos de vehículo del conductor antes de conectarse: `driverVehicleTypeNames` desde `userData.vehicleTypes`.

## Mapa de demanda (2026-10-12)

## Modo oscuro (2026-10-12)

- Tarjetas y pildas en `#1C1C1E` sobre mapa claro (el mapa nocturno no gustó y se revirtió; `constants/mapStyle.js` queda disponible).
- Selección con doble anillo (halo oscuro + color del nivel).

- Tarjeta "Mi zona"/"Zona del pin": analiza el punto evaluado (tu ubicación en seguimiento, el pin central en exploración) contra la malla — nivel, +%, carreras cerca, cuánto falta para subir de nivel y distancia + rumbo a la zona caliente más cercana.
- Barra inferior compacta Media/Alta solo con el % de aumento.
- Dirección del punto evaluado (reverse geocode Google, cacheada ~11 m, debounce 800 ms) en la tarjeta Mi zona.
- Zona seleccionada con nombre de dirección (helper compartido), sin "Celda N…", sin "hexágono": "N carreras en esta zona" + "pagan +X% extra".
- Palpitación: el relleno de zonas activas respira (hook `useLatido` compartido, aislado en `ActivaPulsoWrapper` para no re-renderizar el mapa).
- Selección con doble anillo (halo blanco + color del nivel) en vez del contorno negro.
- Sombras en chip superior y modal; pin central sólido con sombra.
