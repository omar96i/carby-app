const ENABLED = typeof __DEV__ === "undefined" ? true : __DEV__;

export function chatLog(tag, event, extra) {
  if (!ENABLED) return;
  const ts = new Date().toISOString().slice(11, 23);
  if (extra === undefined) {
    console.log(`[ChatInput:${tag}] ${ts} ${event}`);
  } else {
    console.log(`[ChatInput:${tag}] ${ts} ${event}`, extra);
  }
}
