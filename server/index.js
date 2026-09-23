import { createWakeService } from "./wake-server.js";

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const service = createWakeService({
  deviceId: required("DEVICE_ID"),
  apiToken: required("WAKE_API_TOKEN"),
  wolMac: required("WOL_MAC"),
  wolHost: required("WOL_HOST"),
  wolPort: Number(required("WOL_PORT")),
  wolRepeat: Number(process.env.WOL_REPEAT ?? 3),
  httpPort: Number(process.env.PORT ?? 3000),
  allowDelayedWake: process.env.ALLOW_DELAYED_WAKE === "1",
});

const ports = await service.listen();
console.log(`wake service listening: http=${ports.httpPort} mode=udp-magic-packet`);
