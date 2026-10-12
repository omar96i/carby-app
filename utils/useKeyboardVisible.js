import { useState, useEffect } from "react";
import { Keyboard } from "react-native";

/**
 * true mientras el teclado está visible. Sirve para ocultar
 * controles flotantes (ej. botones de scroll del chat).
 */
export default function useKeyboardVisible() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setVisible(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return visible;
}
