# Carby App

App móvil multi-rol (Usuario, Aliado/Comercio, Delivery/Conductor) construida con **Expo SDK 54**, **React 19.1** y **React Native 0.81.5**.

Entrada: `App.js` → `navigation/index.js` → navegadores por rol (`BottomTabNavigatorUsuario`, `BottomTabNavigatorDelivery`, `BottomTabNavigatorAliado`).

## Requisitos

- Node.js LTS + npm
- Android Studio (SDK + emulador o dispositivo) para Android
- Xcode solo para iOS (macOS)
- Cuenta de Expo / EAS para builds (`eas.json`, `projectId: 6d1c249f-72db-48aa-8440-3b942a4ae021`)

## Instalación

```bash
npm ci
```

> `package-lock.json` está commiteado. Usa `npm ci`, no `npm install` sin lock, para no romper el árbol de dependencias.

## Cómo correr (importante)

Este proyecto **es Expo, pero NO funciona con Expo Go ni con el `npx expo start` típico**.

Usa código nativo custom (`android/` está commiteado), config plugins (`expo-location`, `expo-notifications`, `expo-audio`, `expo-background-task`), `google-services.json`, permisos de ubicación/audio/notificaciones y mapas. Por eso necesitas compilar el cliente nativo:

```bash
# Android (emulador o dispositivo conectado) — forma recomendada
npx expo run:android

# iOS (solo macOS)
npx expo run:ios

# npm scripts equivalentes
npm run android
npm run ios
```

```bash
# NO usar para desarrollo diario (no levanta el nativo, falla por módulos custom):
npx expo start
npm run start

# Web solo como referencia, no es el target principal:
npm run web
```

Flujo típico diario:

1. `npm ci` (solo primera vez o si cambia `package.json`)
2. Conecta dispositivo o abre el emulador
3. `npx expo run:android`
4. Si solo cambiaste JS, luego puedes iterar con el dev server que abre ese comando

## Builds / Deploy (EAS)

Perfiles en `eas.json`:

| Perfil | Uso |
|---|---|
| `development` | Dev client interno (`developmentClient: true`, channel `development`) |
| `preview` | Build interna de prueba (channel `preview`) |
| `production` | Producción (`autoIncrement: true`, channel `production`) |

```bash
eas build --profile development --platform android
eas build --profile preview --platform android
eas build --profile production --platform all
eas update --channel production
```

Notas de release:

- `app.json`: `version 1.0.1`, `runtimeVersion 1.0.0`, Android `versionCode 1`, iOS `buildNumber 1`.
- Producción usa `appVersionSource: remote` + `autoIncrement`. No subas versión/build numbers a mano salvo que se pida.
- `App.js` revisa OTA (`expo-updates`) al arrancar y muestra alerta bloqueante si hay update.
- `google-services.json` / `expo-notifications` están commiteados para push. No toques credenciales.

## Configuración

- Backend: `constants/url.js` → `BASE_URL = "https://back.carbycol.com/api/"`.
- Navegación por rol en `navigation/`: revisa el navegador activo antes de agregar pantallas.
- Pantallas grandes en un solo archivo (`screens/Pedidos.js`, `screens/HomeScreen.js`, etc.): preferir editar en sitio.
- `babel.config.js`: `react-native-worklets/plugin` debe ir último. No agregues plugins después sin verificar.

## Estructura

```
App.js                  # entry, providers, chequeo OTA
navigation/             # Stack + Tabs por rol
screens/                # Usuario, Delivery, comercio, conductor, Transport
components/             # UI compartida + usuario/pedidos
hooks/                  # useFavoritos, useReservas, etc.
constants/url.js        # BASE_URL backend
android/                # código nativo (NO borrar)
assets/                 # imágenes, sonidos
eas.json / app.json     # config Expo/EAS
```
