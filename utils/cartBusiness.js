import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Lee el negocio dueño del carrito actual (key "cart").
 * El pedido es solo por negocio: si el carrito trae otro
 * establishmentId hay que confirm vaciar antes de agregar.
 */
export async function getCartBusiness() {
  try {
    const raw = await AsyncStorage.getItem("cart");
    const cart = raw ? JSON.parse(raw) : [];
    const list = Array.isArray(cart) ? cart : [];
    const first = list.find((i) => i?.product?.establishmentId);
    return {
      cart: list,
      establishmentId: first?.product?.establishmentId ?? null,
      establishmentName:
        first?.product?.establishmentName ?? first?.product?.nombre ?? null,
    };
  } catch {
    return { cart: [], establishmentId: null, establishmentName: null };
  }
}

export async function clearCart() {
  await AsyncStorage.removeItem("cart");
}
