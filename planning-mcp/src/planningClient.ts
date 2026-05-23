export class PlanningApiError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "PlanningApiError";
    this.status = status;
  }
}

export type PlanningClient = {
  get<T>(path: string): Promise<T>;
};

const DEFAULT_TIMEOUT_MS = 10_000;

export function createPlanningClient(baseUrl: string, timeoutMs: number = DEFAULT_TIMEOUT_MS): PlanningClient {
  return {
    async get<T>(path: string): Promise<T> {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      let res: Response;
      try {
        res = await fetch(baseUrl + path, { signal: controller.signal });
      } catch (err) {
        const cause = err as Error;
        const msg =
          cause.name === "AbortError"
            ? `Planning API timed out after ${timeoutMs}ms for ${path}`
            : `Planning API request failed for ${path}: ${cause.message}`;
        throw new PlanningApiError(msg);
      } finally {
        clearTimeout(timer);
      }
      if (!res.ok) {
        throw new PlanningApiError(`Planning API ${res.status} for ${path}`, res.status);
      }
      try {
        return (await res.json()) as T;
      } catch (err) {
        throw new PlanningApiError(`Planning API returned invalid JSON for ${path}: ${(err as Error).message}`);
      }
    },
  };
}
