import React, { memo, useEffect, useRef } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Keyboard,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { chatLog } from "../utils/chatDebug";

function ChatInput({
  tag,
  value,
  onChangeText,
  onSend,
  sending,
  editable = true,
  onPickImage,
  preview,
  extraSendEnabled = false,
  placeholder = "Escribe un mensaje...",
}) {
  const inputRef = useRef(null);
  const changeRef = useRef(onChangeText);
  const sendRef = useRef(onSend);
  changeRef.current = onChangeText;
  sendRef.current = onSend;

  useEffect(() => {
    chatLog(tag, "input-mount");
    const sub = Keyboard.addListener("keyboardDidHide", () => {
      chatLog(tag, "keyboardHide-blur");
      inputRef.current?.blur();
    });
    return () => sub.remove();
  }, [tag]);

  const disabled = sending || (!value.trim() && !extraSendEnabled);

  return (
    <View style={s.inputContainer}>
      {preview}
      <View style={s.inputRow}>
        {onPickImage ? (
          <TouchableOpacity style={s.iconButton} onPress={onPickImage} activeOpacity={0.8}>
            <Feather name="camera" size={22} color="#64748B" />
          </TouchableOpacity>
        ) : null}
        <TextInput
          ref={inputRef}
          style={s.input}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          value={value}
          onChangeText={(t) => {
            chatLog(tag, "change", { len: t.length });
            changeRef.current(t);
          }}
          onFocus={() => chatLog(tag, "focus", { len: value.length })}
          onBlur={() => chatLog(tag, "blur", { len: value.length })}
          onSelectionChange={(e) => chatLog(tag, "selection", e.nativeEvent.selection)}
          onPressIn={() => chatLog(tag, "pressIn")}
          onTouchStart={() => chatLog(tag, "touchStart")}
          editable={editable && !sending}
          multiline
          scrollEnabled
          maxLength={500}
          blurOnSubmit={false}
          returnKeyType="default"
          textAlignVertical="top"
          selectTextOnFocus={false}
          contextMenuHidden={false}
          autoCorrect
        />
        <TouchableOpacity
          style={[s.sendButton, disabled && s.sendButtonDisabled]}
          onPress={() => sendRef.current()}
          disabled={disabled}
          activeOpacity={0.8}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Feather name="send" size={18} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function sameInput(prev, next) {
  return (
    prev.tag === next.tag &&
    prev.value === next.value &&
    prev.sending === next.sending &&
    prev.editable === next.editable &&
    prev.placeholder === next.placeholder &&
    !!prev.preview === !!next.preview &&
    !!prev.onPickImage === !!next.onPickImage
  );
}

export default memo(ChatInput, sameInput);
export function blurChatInput() { }

const s = StyleSheet.create({
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 10,
    paddingBottom: Platform.OS === "ios" ? 24 : 16,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    marginBottom: Platform.OS === "ios" ? 0 : -2,
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 110,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0F172A",
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FF5500",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Platform.OS === "ios" ? 0 : -2,
  },
  sendButtonDisabled: {
    backgroundColor: "#CBD5E1",
  },
});
