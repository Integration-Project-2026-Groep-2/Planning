import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const MAX_RETRIES = 3;
const INITIAL_DELAY = 1000;

export const query = async (text: string, params?: any[]) => {
  let lastError: any;
  
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await pool.query(text, params);
    } catch (err: any) {
      lastError = err;
      const isTransient = err.code === 'EAI_AGAIN' || err.code === 'ECONNREFUSED' || err.message?.includes('getaddrinfo');
      
      if (!isTransient || attempt === MAX_RETRIES - 1) {
        throw err;
      }
      
      const delay = INITIAL_DELAY * Math.pow(2, attempt);
      console.warn(`[DB] Query mislukt (${err.code}). Retry ${attempt + 1}/${MAX_RETRIES} in ${delay}ms...`);
      await new Promise(res => setTimeout(res, delay));
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