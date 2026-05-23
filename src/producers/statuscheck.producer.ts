import os from "os";
import { getChannel } from "../rabbitmq";
import { buildXml } from "../utils/xml.builder";

function getDiskUsage(): number {
  try {
    const { execSync } = require("child_process");
    let output: string;

    if (process.platform === "win32") {
      output = execSync("wmic logicaldisk get size,freespace /format:csv")
        .toString()
        .trim();
      const lines = output.split("\n").filter((l: string) => l.trim() && !l.startsWith("Node"));
      let totalSize = 0, totalFree = 0;
      for (const line of lines) {
        const parts = line.trim().split(",");
        if (parts.length >= 3) {
          totalFree += Number(parts[1]) || 0;
          totalSize += Number(parts[2]) || 0;
        }
      }
      if (totalSize === 0) return 0;
      return Number(((totalSize - totalFree) / totalSize).toFixed(2));
    } else {
      output = execSync("df -k /").toString();
      const lines = output.trim().split("\n");
      const parts = lines[1].split(/\s+/);
      const used = Number(parts[2]);
      const available = Number(parts[3]);
      const total = used + available;
      return Number((used / total).toFixed(2));
    }
  } catch {
    return 0;
  }
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