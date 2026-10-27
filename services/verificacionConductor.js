import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../constants/url";

async function authHeaders() {
  const token = await AsyncStorage.getItem("userToken");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function getEstadoVerificacion() {
  const response = await fetch(`${BASE_URL}conductor/verificacion/estado`, {
    headers: await authHeaders(),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.message || "No se pudo consultar la verificación.");
  return json;
}

export async function iniciarVerificacion() {
  const response = await fetch(`${BASE_URL}conductor/verificacion/iniciar`, {
    method: "POST",
    headers: await authHeaders(),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.message || "No se pudo iniciar la verificación.");
  return json;
}

export async function confirmarVerificacion() {
  const response = await fetch(`${BASE_URL}conductor/verificacion/confirmar`, {
    method: "POST",
    headers: await authHeaders(),
  });
  const json = await response.json().catch(() => ({}));
  return { ok: response.ok, data: json };
}
