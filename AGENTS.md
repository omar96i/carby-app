# Agent notes for YaRidersAPP

## Project type

Expo SDK 53 React Native app, React 19, React Native 0.79. Multi-role client (Usuario, Aliado/Delivery). Entry point: `App.js` → `navigation/index.js` → role-specific bottom-tab navigators.

## Daily commands

- `npm install`
- `npm run start` — Expo dev server
- `npm run android` / `npm run ios` / `npm run web`

No test, lint, typecheck, or formatter scripts exist. No CI or pre-commit config.

## Native code

`android/` is intentionally tracked (do not delete it). `.gitignore` only ignores `android/.gradle/`, `android/app/build/`, and `android/build/`.

## Build / deploy

- EAS build profiles are in `eas.json`: `development`, `preview`, `production`.
- `production` uses `autoIncrement: true` and `appVersionSource: "remote"`.
- `expo-notification.json` and `google-services.json` are checked in for push notifications.
- `credentials.json` exists; do not edit or expose it.

## Architecture gotchas

- **Country-specific backend**: `constants/url.js` switches between Peru (`https://back.yariders.com/api/`) and Colombia (`https://co.yariders.com/api/`). The selected country is stored in AsyncStorage under key `pais_seleccionado`. `BASE_URL` is an object with `toString()`/`valueOf()`; use it like a string in template literals.
- **Role-based nav**: `navigation/index.js` registers three bottom-tab navigators (`BottomTabNavigatorUsuario`, `BottomTabNavigatorDelivery`, `BottomTabNavigatorAliado`). Check the active navigator when adding role-specific screens.
- **Assets**: `BaseColombia/` holds Colombia geographic JSONs (`colombia.json`, `colombia_departamentos.json`). `assets/sounds/` contains `pedido.wav` and `carrera.wav` used by foreground notification handlers.
- **Notification channels**: Android channels are created at runtime in `context/NotificationContext.js` with sound names referenced without extension (`pedido.mp3`, `carrera.mp3`) even though source files are `.wav`.
- **OTA updates**: `App.js` checks `expo-updates` on launch and shows a blocking alert if an update is available, then reloads.
- **Version gate**: `App.js` also calls `${BASE_URL}active-version` and forces store redirect if the local version differs from backend.

## Babel

`babel.config.js` must keep `react-native-reanimated/plugin` as the **last** plugin. Do not append plugins after it without verifying reanimated still works.

## Style / conventions

- Codebase mixes Spanish and English. New files can follow either, but match the surrounding module.
- Many screens are large single files (`screens/Pedidos.js`, `screens/HomeScreen.js`, etc.); prefer editing in place rather than aggressive refactors.

## What not to change

- Do not regenerate or rotate keys/credentials in `credentials.json`, `google-services.json`, or `expo-notification.json`.
- Do not bump `version`, `runtimeVersion`, iOS `buildNumber`, or Android `versionCode` unless explicitly asked; EAS production handles auto-increment remotely.
