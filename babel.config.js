module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        "babel-preset-expo",
        {
          // Use React 17 automatic JSX runtime.
          jsxRuntime: "automatic",
        },
      ],
    ],
    // ------------------------------------
    // ¡LA SECCIÓN DE PLUGINS ES NECESARIA!
    // ------------------------------------
    plugins: [
      'react-native-reanimated/plugin', // ¡Este debe ser el último!
    ],
  };
};