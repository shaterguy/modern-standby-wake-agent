import crypto from "node:crypto";
import http from "node:http";
import { sendMagicPacket } from "./magic-packet.js";

const MAX_BODY_BYTES = 16 * 1024;
const MAX_TEST_DELAY_MS = 60_000;

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
    "cache-control": "no-store",
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
    apiToken,
    wolMac,
    wolHost,
    wolPort,
    wolRepeat = 3,
    httpPort = 3000,
    host = "0.0.0.0",
    allowDelayedWake = false,
    wakeSender = sendMagicPacket,
    logger = console,
  } = options;

  if (!deviceId || !apiToken || !wolMac || !wolHost || !wolPort) {
    throw new Error("deviceId, apiToken and WOL target are required");
  }
  async function executeWake(requestId) {
    const result = await wakeSender({
      mac: wolMac,
      host: wolHost,
      port: wolPort,
      repeat: wolRepeat,
    });

    logger.info?.(
      `wake packet sent requestId=${requestId} repeat=${result.repeat}`
    );
    return result;
  }

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://localhost");

      if (req.method === "GET" && url.pathname === "/health") {
        sendJson(res, 200, {
          ok: true,
          mode: "udp-magic-packet",
          deviceId,
        });
        return;
      }

      if (req.method !== "POST" || url.pathname !== "/api/wake") {
        sendJson(res, 404, { error: "not_found" });
        return;
      }
      const authorization = req.headers.authorization ?? "";
      if (!authorization.startsWith("Bearer ")
          || !secureEqual(authorization.slice(7), apiToken)) {
        sendJson(res, 401, { error: "unauthorized" });
        return;
      }

      const body = await readJson(req);
      if (body.deviceId && body.deviceId !== deviceId) {
        sendJson(res, 404, { error: "unknown_device" });
        return;
      }

      const delayMs = Number(body.delayMs ?? 0);
      if (!Number.isInteger(delayMs) || delayMs < 0 || delayMs > MAX_TEST_DELAY_MS) {
        sendJson(res, 400, { error: "invalid_delay" });
        return;
      }
      if (delayMs > 0 && !allowDelayedWake) {
        sendJson(res, 400, { error: "delayed_wake_disabled" });
        return;
      }

      const requestId = crypto.randomUUID();
      if (delayMs > 0) {
        setTimeout(() => {
          executeWake(requestId).catch((error) => {
            logger.error?.(
              `delayed wake failed requestId=${requestId}: ${error.message}`
            );
          });
        }, delayMs);

        sendJson(res, 202, {
          requestId,
          scheduled: true,
          delayMs,
        });
        return;
      }

      const result = await executeWake(requestId);
      sendJson(res, 200, {
        requestId,
        sent: true,
        repeat: result.repeat,
      });
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
    },
  };
}
