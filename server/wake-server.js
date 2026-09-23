import crypto from "node:crypto";
import http from "node:http";

const MAX_BODY_BYTES = 16 * 1024;

function secureEqual(left, right) {
  const a = Buffer.from(String(left ?? ""));
  const b = Buffer.from(String(right ?? ""));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
    "cache-control": "no-store"
  });
  res.end(payload);
}
async function readJson(req) {
  const chunks = [];
  let size = 0;

  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Error("request body too large");
    chunks.push(chunk);
  }

  if (size === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export function createWakeService(options) {
  const {
    deviceId,
    deviceSecret,
    apiToken,
    host = "0.0.0.0",
    httpPort = 3000,
    ttlMs = 5 * 60 * 1000,
    logger = console
  } = options;
  if (!deviceId || !deviceSecret || !apiToken) {
    throw new Error("deviceId, deviceSecret and apiToken are required");
  }

  let pending = null;

  function authenticateDevice(req) {
    return secureEqual(req.headers["x-device-id"], deviceId)
      && secureEqual(req.headers["x-device-secret"], deviceSecret);
  }

  function activePending() {
    if (!pending) return null;
    if (Date.now() >= pending.expiresAt) {
      pending = null;
      return null;
    }
    return pending;
  }

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://localhost");
      if (req.method === "GET" && url.pathname === "/health") {
        sendJson(res, 200, {
          ok: true,
          pending: Boolean(activePending())
        });
        return;
      }

      if (req.method === "POST" && url.pathname === "/api/wake") {
        const auth = req.headers.authorization ?? "";
        if (!auth.startsWith("Bearer ")
            || !secureEqual(auth.slice(7), apiToken)) {
          sendJson(res, 401, { error: "unauthorized" });
          return;
        }

        const body = await readJson(req);
        if (body.deviceId && body.deviceId !== deviceId) {
          sendJson(res, 404, { error: "unknown_device" });
          return;
        }

        const now = Date.now();
        pending = {
          requestId: crypto.randomUUID(),
          createdAt: new Date(now).toISOString(),
          expiresAt: now + ttlMs
        };

        sendJson(res, 202, {
          requestId: pending.requestId,
          expiresAt: new Date(pending.expiresAt).toISOString()
        });
        return;
      }
      if (req.method === "POST" && url.pathname === "/api/poll") {
        if (!authenticateDevice(req)) {
          sendJson(res, 401, { error: "unauthorized" });
          return;
        }

        const current = activePending();
        sendJson(res, 200, {
          pending: current
            ? { requestId: current.requestId, createdAt: current.createdAt }
            : null
        });
        return;
      }
      if (req.method === "POST" && url.pathname === "/api/ack") {
        if (!authenticateDevice(req)) {
          sendJson(res, 401, { error: "unauthorized" });
          return;
        }

        const body = await readJson(req);
        const current = activePending();
        if (!current || body.requestId !== current.requestId) {
          sendJson(res, 404, { error: "request_not_found" });
          return;
        }

        pending = null;
        sendJson(res, 200, { acknowledged: true });
        return;
      }

      sendJson(res, 404, { error: "not_found" });
    } catch (error) {
      logger.error?.(error);
      sendJson(res, 400, { error: "bad_request" });
    }
  });
  return {
    async listen() {
      await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(httpPort, host, resolve);
      });
      return { httpPort: server.address().port };
    },

    async stop() {
      await new Promise((resolve) => server.close(resolve));
    }
  };
}
