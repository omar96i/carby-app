import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

export function useAlturaTecladoAndroid() {
  const [altura, setAltura] = useState(0);
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const show = Keyboard.addListener("keyboardDidShow", (e) => setAltura(e.endCoordinates.height));
    const hide = Keyboard.addListener("keyboardDidHide", () => setAltura(0));
    return () => { show.remove(); hide.remove(); };
  }, []);
  return altura;
}
