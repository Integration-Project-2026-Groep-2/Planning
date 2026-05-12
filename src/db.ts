import "dotenv/config";
import { Pool } from "pg";

const pool = new Pool({
    host: process.env.PLANNING_DB_HOST || process.env.DB_HOST,
    port: Number(process.env.PLANNING_DB_PORT || process.env.DB_PORT),
    database: process.env.PLANNING_DB_NAME || process.env.DB_NAME,
    user: process.env.PLANNING_DB_USER || process.env.DB_USER,
    password: process.env.PLANNING_DB_PASSWORD || process.env.DB_PASSWORD,
});

const MAX_RETRIES = 5;
const INITIAL_DELAY = 1000;

export const query = async (text: string, params?: any[]) => {
    let lastError: any;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            return await pool.query(text, params);
        } catch (err: any) {
            lastError = err;
            const isTransient =
                err.code === "EAI_AGAIN" ||
                err.code === "ECONNREFUSED" ||
                err.code === "ETIMEDOUT" ||
                err.message?.includes("getaddrinfo") ||
                err.message?.includes("connection");

            if (!isTransient || attempt === MAX_RETRIES - 1) {
                console.error(
                    `[DB] Fatale query fout na ${attempt + 1} pogingen:`,
                    err.message,
                );
                throw err;
            }

            const delay = INITIAL_DELAY * Math.pow(2, attempt);
            console.warn(
                `[DB] Query mislukt (${err.code || "UNKNOWN"}). Retry ${attempt + 1}/${MAX_RETRIES} in ${delay}ms...`,
            );
            await new Promise((res) => setTimeout(res, delay));
        }
    }

    throw lastError;
};

export const testConnection = async () => {
    const client = await pool.connect();
    client.release();
    return true;
};

export default pool;
