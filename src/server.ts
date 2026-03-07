/**
 * Servidor do microserviço Scraping-Flow (Google Places, créditos, export CSV)
 */

process.env.TZ = 'America/Sao_Paulo';

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { connectAllDatabases } from './config/databases';
import { SERVER_CONFIG } from './config/constants';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { connectSocket } from './socket/socketClient';

const app: Express = express();
const PORT = SERVER_CONFIG.PORT;

app.use(cors({
  origin: SERVER_CONFIG.CORS_ORIGIN,
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

connectAllDatabases();
connectSocket();

app.get('/', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'Scraping Flow está funcionando',
    version: '1.0.0',
    endpoints: {
      search: 'POST /api/scraping-flow/search',
      searches: 'GET /api/scraping-flow/searches',
      export: 'GET /api/scraping-flow/searches/:id/export',
    },
  });
});

app.use('/api', routes);
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Scraping-Flow rodando na porta ${PORT}`);
  console.log(`🌐 API em http://localhost:${PORT}/api`);
});

process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));
