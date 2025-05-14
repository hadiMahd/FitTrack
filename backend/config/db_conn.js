import mysql from 'mysql2/promise';
import { config } from 'dotenv';
config({ path: './.env' });
import process from 'process';

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  port: process.env.DB_PORT,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: process.env.DB_CONNECTION_LIMIT || 10,
  queueLimit: process.env.DB_QUEUE_LIMIT || 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    await pool.end();
    console.log('MySQL pool has closed');
    process.exit(0);
  } catch (err) {
    console.error('Error closing MySQL pool:', err);
    process.exit(1);
  }
});

export const db = {
  pool,
  execute: async (query, params) => {
    const connection = await pool.getConnection();
    try {
      const [results] = await connection.execute(query, params);
      return results;
    } finally {
      connection.release();
    }
  },
  transaction: async (callback) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  },
};

// Query function using pool
export const query = async (sql, values) => {
    try {
      const [results] = await pool.query(sql, values);
      return results;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
};

export default db;