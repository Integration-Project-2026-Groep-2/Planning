export type Config = {
  apiBaseUrl: string;
  port: number;
};

const DEFAULT_API_BASE_URL = "http://localhost:3000";
const DEFAULT_PORT = 5556;

export function getConfig(): Config {
  const apiBaseUrl = (process.env.PLANNING_API_BASE_URL ?? DEFAULT_API_BASE_URL).replace(/\/+$/, "");
  const parsedPort = Number(process.env.PLANNING_MCP_PORT);
  const port = Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : DEFAULT_PORT;
  return { apiBaseUrl, port };
}
