import dgram from "node:dgram";

export function normalizeMac(mac) {
  const hex = String(mac ?? "")
    .replace(/[^0-9a-f]/gi, "")
    .toLowerCase();

  if (!/^[0-9a-f]{12}$/.test(hex)) {
    throw new Error("invalid MAC address");
  }

  return hex.match(/../g).join(":");
}

export function createMagicPacket(mac) {
  const normalized = normalizeMac(mac);
  const macBytes = Buffer.from(normalized.replaceAll(":", ""), "hex");
  const packet = Buffer.alloc(6 + 16 * 6, 0xff);

  for (let offset = 6; offset < packet.length; offset += 6) {
    macBytes.copy(packet, offset);
  }

  return packet;
}
export async function sendMagicPacket(options) {
  const {
    mac,
    host,
    port,
    repeat = 3,
    intervalMs = 100,
  } = options;

  if (!host) throw new Error("WOL host is required");
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("WOL port must be 1..65535");
  }
  if (!Number.isInteger(repeat) || repeat < 1 || repeat > 10) {
    throw new Error("WOL repeat must be 1..10");
  }
  if (!Number.isInteger(intervalMs) || intervalMs < 0 || intervalMs > 1000) {
    throw new Error("WOL intervalMs must be 0..1000");
  }

  const packet = createMagicPacket(mac);
  const socket = dgram.createSocket("udp4");
  try {
    for (let index = 0; index < repeat; index += 1) {
      await new Promise((resolve, reject) => {
        socket.send(packet, port, host, (error) => {
          if (error) reject(error);
          else resolve();
        });
      });

      if (index + 1 < repeat && intervalMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }
    }
  } finally {
    socket.close();
  }

  return {
    host,
    port,
    mac: normalizeMac(mac),
    repeat,
    bytesPerPacket: packet.length,
  };
}
