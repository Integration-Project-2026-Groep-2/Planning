import pool from '../../db';
import fs from 'fs';
import path from 'path';

const migrate = async () => {
  const sql = fs.readFileSync(
    path.join(__dirname, 'schema.sql'),
    'utf-8'
  );
  try {
    await pool.query(sql);
    console.log('Alle tabellen aangemaakt!');
  } catch (err) {
    console.error('Fout bij aanmaken tabellen:', err);
  } finally {
    await pool.end();
  }
};

migrate();
