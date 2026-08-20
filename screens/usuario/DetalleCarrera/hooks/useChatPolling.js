import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../../../../constants/url";

export const useChatPolling = (tripId) => {
  const [messageCount, setMessageCount] = useState(0);
  const [lastMessage, setLastMessage] = useState(null);

  const fetchMessages = useCallback(async () => {
    if (!tripId) return;
    try {
      const token = await AsyncStorage.getItem("userToken");
      const response = await fetch(`${BASE_URL}carrera-chat/${tripId}/messages`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });
      const data = await response.json();
      const messages = data?.data || [];
      setMessageCount(messages.length);
      if (messages.length > 0) {
        setLastMessage(messages[messages.length - 1]);
      }
    } catch (e) {
      console.log("Error polling chat (silent):", e);
    }
  }, [tripId]);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  return { messageCount, lastMessage, refetch: fetchMessages };
};
