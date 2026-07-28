/**
 * Logger centralizado — Pedidos (usuario)
 * Activar/desactivar con LOG_ENABLED
 */

const LOG_ENABLED = true;

function ts() {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

function log(level, tag, message, data = null) {
  if (!LOG_ENABLED) return;

  const prefix = `[${ts()}] [${level.toUpperCase()}] [${tag}]`;

  if (data !== null) {
    if (typeof data === "object") {
      console.log(prefix, message);
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log(prefix, message, data);
    }
  } else {
    console.log(prefix, message);
  }
}

const logger = {
  request(method, url, body) {
    log("info", "REQUEST", `${method} ${url}`, body || undefined);
  },

  response(tag, status, data) {
    log("success", tag || "RESPONSE", `status: ${status}`, data);
  },

  summary(tag, message) {
    log("info", tag || "INFO", message);
  },

  warn(tag, message) {
    log("warn", tag || "WARN", message);
  },

  error(tag, message, err) {
    log("error", tag || "ERROR", message, err?.message || err);
  },
};

export default logger;
