/**
 * Conexões MongoDB (User/scrapingCredits) e PostgreSQL (buscas/resultados)
 */

import mongoose from 'mongoose';
import { Pool } from 'pg';
import { MONGODB_CONFIG, POSTGRES_CONFIG } from './constants';

// MongoDB
let mongooseConnection: typeof mongoose | null = null;

export const connectMongoDB = async (): Promise<void> => {
  if (mongooseConnection) return;
  mongooseConnection = await mongoose.connect(MONGODB_CONFIG.URI);
  console.log('✅ MongoDB conectado (Scraping-Flow)');
};

// PostgreSQL
export const pgPool = new Pool({
  connectionString: POSTGRES_CONFIG.URI,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pgPool.on('error', (err: Error) => {
  console.error('❌ Erro no pool PostgreSQL:', err);
});

export const testPostgreSQL = async (): Promise<boolean> => {
  try {
    const client = await pgPool.connect();
    await client.query('SELECT NOW()');
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Erro ao testar PostgreSQL:', error);
    return false;
  }
};

export const connectAllDatabases = async (): Promise<void> => {
  await connectMongoDB();
  const pgOk = await testPostgreSQL();
  if (pgOk) console.log('✅ PostgreSQL conectado e testado');
  else console.warn('⚠️ PostgreSQL não conectado');
};
