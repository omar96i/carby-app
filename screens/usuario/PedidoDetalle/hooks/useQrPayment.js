import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../../../../constants/url";
import { getImageUrl } from "../utils";

export function useQrPayment(comercioId) {
  const [qrUrl, setQrUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!comercioId) return;
    const load = async () => {
      setLoading(true);
      try {
        const token = await AsyncStorage.getItem("userToken");
        const response = await fetch(`${BASE_URL}user-tipo-pago/getByUser/${comercioId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return;
        const data = await response.json();
        if (data.status && data.data && data.data.qr_estado === 1 && data.data.qr_file) {
          setQrUrl(getImageUrl(data.data.qr_file));
        }
      } catch (e) { /* noop */ }
      finally { setLoading(false); }
    };
    load();
  }, [comercioId]);

  return { qrUrl, loading };
}
