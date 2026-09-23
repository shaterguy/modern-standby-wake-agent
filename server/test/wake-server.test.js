import assert from "node:assert/strict";
import dgram from "node:dgram";
import test from "node:test";
import { createMagicPacket, normalizeMac, sendMagicPacket } from "../magic-packet.js";
import { createWakeService } from "../wake-server.js";

test("magic packet has the standard 6+16xMAC layout", () => {
  const mac = "00-11-22-33-44-55";
  const packet = createMagicPacket(mac);

  assert.equal(normalizeMac(mac), "00:11:22:33:44:55");
  assert.equal(packet.length, 102);
  assert.deepEqual([...packet.subarray(0, 6)], [255, 255, 255, 255, 255, 255]);

  const expectedMac = Buffer.from("001122334455", "hex");
  for (let offset = 6; offset < packet.length; offset += 6) {
    assert.deepEqual(packet.subarray(offset, offset + 6), expectedMac);
  }
});

test("authenticated wake request sends one immediate WOL operation", async () => {
  const calls = [];
  const service = createWakeService({
    deviceId: "test-device",
    apiToken: "api-token",
    wolMac: "00:11:22:33:44:55",
    wolHost: "203.0.113.5",
    wolPort: 47981,
    wolRepeat: 4,
    host: "127.0.0.1",
    httpPort: 0,
    wakeSender: async (options) => {
      calls.push(options);
      return {
        host: options.host,
        port: options.port,
        mac: normalizeMac(options.mac),
        repeat: options.repeat,
        bytesPerPacket: 102,
      };
    },
    logger: { info() {}, error() {} },
  });

  const { httpPort } = await service.listen();
  const base = `http://127.0.0.1:${httpPort}`;

  const unauthorized = await fetch(`${base}/api/wake`, { method: "POST" });
  assert.equal(unauthorized.status, 401);

  const response = await fetch(`${base}/api/wake`, {
    method: "POST",
    headers: {
      authorization: "Bearer api-token",
      "content-type": "application/json",
    },
    body: JSON.stringify({ deviceId: "test-device" }),
  });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.sent, true);
  assert.equal(body.repeat, 4);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], {
    mac: "00:11:22:33:44:55",
    host: "203.0.113.5",
    port: 47981,
    repeat: 4,
  });

  const delayed = await fetch(`${base}/api/wake`, {
    method: "POST",
    headers: {
      authorization: "Bearer api-token",
      "content-type": "application/json",
    },
    body: JSON.stringify({ deviceId: "test-device", delayMs: 100 }),
  });
  assert.equal(delayed.status, 400);
  assert.equal((await delayed.json()).error, "delayed_wake_disabled");

  await service.stop();
});

test("sendMagicPacket emits a real UDP datagram", async () => {
  const listener = dgram.createSocket("udp4");
  await new Promise((resolve) => listener.bind(0, "127.0.0.1", resolve));
  const port = listener.address().port;

  const received = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("UDP packet timeout")), 1500);
    listener.once("message", (message) => {
      clearTimeout(timer);
      resolve(message);
    });
  });

  await sendMagicPacket({
    mac: "00:11:22:33:44:55",
    host: "127.0.0.1",
    port,
    repeat: 1,
  });

  const packet = await received;
  assert.equal(packet.length, 102);
  assert.deepEqual(packet, createMagicPacket("00:11:22:33:44:55"));
  listener.close();
});
