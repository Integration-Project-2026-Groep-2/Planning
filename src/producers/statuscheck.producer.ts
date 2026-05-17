import os from "os";
import { execSync } from "child_process";
import { getChannel } from "../rabbitmq";
import { buildXml } from "../utils/xml.builder";

function getDiskUsage(): number {
  const output = execSync("df -k /").toString();

  const lines = output.trim().split("\n");
  const parts = lines[1].split(/\s+/);

  const used = Number(parts[2]);
  const available = Number(parts[3]);
  const total = used + available;

  return Number((used / total).toFixed(2));
}

export async function startStatusCheckProducer() {
  const channel = getChannel();

  const sendStatusCheck = async () => {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();

    const memoryUsage = Number(
      ((totalMemory - freeMemory) / totalMemory).toFixed(2)
    );

    const payload = {
      serviceId: "planning",
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      memory: memoryUsage,
      disk: getDiskUsage(),
    };

    const xml = buildXml("StatusCheck", payload);

    channel.publish(
      "statuscheck.direct",
      "routing.statuscheck",
      Buffer.from(xml),
      { persistent: true }
    );

    console.log("[StatusCheck] verzonden");
  };

  await sendStatusCheck();

  setInterval(sendStatusCheck, 2 * 60 * 1000);
}