import { createWakeService } from "./wake-server.js";

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const service = createWakeService({
  deviceId: required("DEVICE_ID"),
  deviceSecret: required("DEVICE_SECRET"),
  apiToken: required("WAKE_API_TOKEN"),
  httpPort: Number(process.env.PORT ?? 3000)
});

const ports = await service.listen();
console.log(`wake service listening: http=${ports.httpPort}`);
