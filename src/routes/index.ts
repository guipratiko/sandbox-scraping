import { Router } from 'express';
import scrapingRoutes from './scraping.routes';

const router = Router();

router.use('/scraping-flow', scrapingRoutes);

export default router;
