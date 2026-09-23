import assert from "node:assert/strict";
import test from "node:test";
import { createWakeService } from "../wake-server.js";

test("wake request is delivered by authenticated polling and acknowledged", async () => {
  const service = createWakeService({
    deviceId: "test-device",
    deviceSecret: "device-secret",
    apiToken: "api-token",
    host: "127.0.0.1",
    httpPort: 0,
    logger: { error() {} }
  });

  const { httpPort } = await service.listen();
  const base = `http://127.0.0.1:${httpPort}`;

  const unauthorized = await fetch(`${base}/api/wake`, { method: "POST" });
  assert.equal(unauthorized.status, 401);

  const wake = await fetch(`${base}/api/wake`, {
    method: "POST",
    headers: {
      authorization: "Bearer api-token",
      "content-type": "application/json"
    },
    body: JSON.stringify({ deviceId: "test-device" })
  });
  assert.equal(wake.status, 202);
  const wakeBody = await wake.json();

  const poll = await fetch(`${base}/api/poll`, {
    method: "POST",
    headers: {
      "x-device-id": "test-device",
      "x-device-secret": "device-secret"
    }
  });
  assert.equal(poll.status, 200);
  const pollBody = await poll.json();
  assert.equal(pollBody.pending.requestId, wakeBody.requestId);

  const ack = await fetch(`${base}/api/ack`, {
    method: "POST",
    headers: {
      "x-device-id": "test-device",
      "x-device-secret": "device-secret",
      "content-type": "application/json"
    },
    body: JSON.stringify({ requestId: wakeBody.requestId })
  });
  assert.equal(ack.status, 200);

  const afterAck = await fetch(`${base}/api/poll`, {
    method: "POST",
    headers: {
      "x-device-id": "test-device",
      "x-device-secret": "device-secret"
    }
  });
  assert.equal((await afterAck.json()).pending, null);

  await service.stop();
});
