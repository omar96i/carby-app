# Panel Filament — grupos y orden

Solo cambia el menú lateral. Sin migraciones, sin cambios de lógica ni permisos (`canAccess`/`canViewAny` intactos).

## Grupos (orden fijado en `AdminPanelProvider::navigationGroups`)

| Grupo | Contenido (orden) |
|---|---|
| Operación | Cocina/Despacho (1), Activación de usuarios (2), Activación antiguos (3), Alertas de seguridad (4), Notificaciones (5) |
| Usuarios | Usuarios (10), Peticiones de suscripción (11), Suscripciones (12), Movimientos de Tokens (13) |
| Viajes y tarifas | Servicios (20), Tipos de vehículo (21), Índices de demanda (22), Malla de demanda (23), Precios (24) |
| Comercio y catálogo | Productos (30), Categorías de comercio (31), Categorías globales (32), Estaciones/Áreas (33), Servicios de comercio (34), Perfiles de empleados (35) |
| Marketing | Publicidades (40), Cajas misteriosas (41), Premios por referido (42) |
| Reportes | Reportes (50), Estadísticas diarias (51) |

`Home` queda sin grupo al inicio. Grupos colapsables.

## Etiquetas/iconos desambiguados

- `Categorias` (global) → `Categorías globales`; `CategoriaResource` → `Categorías de comercio` (antes ambas mostraban "Categorias").
- `ReferidoPremioResource` → `Premios por referido`.
- Iconos únicos: Servicios (clipboard), Tokens (circle-stack), Publicidades (megáfono), Premios (sparkles), Notificaciones (campana), Activación antiguos (document-duplicate).

## Verificación (2026-10-12)

- `php -l`: 26 archivos OK.
- `php artisan route:list`: 309 rutas, el panel levanta.

## Activación de usuarios (2026-10-12)

- `admin@example.com` con acceso a "Activación de usuarios" y "Activación antiguos".
- Ambas vistas muestran la lista completa de documentos rider (13 campos: inspección, SOAT, antecedentes, licencias, tarjeta circulación/identificación/propiedad, revisión técnica, b2b, permiso municipal, DNI, categoría vehicular) en vez del subconjunto por rol.
- Nueva tarjeta "Tipos de vehículo y pago": badges de `vehicleTypes` (solo lectura) + QR de pago con checkbox `qr_image`.
- `AuthController@subirArchivos`: `qr_image` se guarda en `UserTipoPago` (antes caía al loop genérico) y cuenta como actualización válida.
