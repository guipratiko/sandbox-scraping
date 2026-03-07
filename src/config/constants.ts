/**
 * Configurações centralizadas do Scraping-Flow
 */

import dotenv from 'dotenv';

dotenv.config();

export const SERVER_CONFIG = {
  PORT: parseInt(process.env.PORT || '4336', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
};

export const JWT_CONFIG = {
  SECRET: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  EXPIRE: process.env.JWT_EXPIRE || '7d',
};

export const MONGODB_CONFIG = {
  URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/clerky',
};

export const POSTGRES_CONFIG = {
  URI: process.env.POSTGRES_URI || 'postgres://user:password@localhost:5432/clerky_db',
};

export const GOOGLE_PLACES_CONFIG = {
  API_KEY: process.env.GOOGLE_PLACES_API_KEY || '',
  BASE_URL: 'https://places.googleapis.com/v1',
};

/** Quantidade de resultados: usuário escolhe (1 crédito por resultado). API retorna no máx. 60 por consulta. */
export const MIN_RESULTS = 1;
export const MAX_RESULTS = 60;
export const RESULTS_PER_PAGE = 20;

/** Dados disponíveis por 30 dias */
export const RESULTS_RETENTION_DAYS = 30;

/** Socket.io do Backend principal (para emitir scraping-credits-updated) */
export const SOCKET_CONFIG = {
  URL: process.env.BACKEND_SOCKET_URL || process.env.SOCKET_URL || 'http://localhost:4331',
};
