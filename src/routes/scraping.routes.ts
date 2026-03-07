import { Router } from 'express';
import { protect } from '../middleware/auth';
import * as scrapingController from '../controllers/scrapingController';

const router = Router();

router.use(protect);

router.get('/credits', scrapingController.getCreditsBalance);
router.post('/search', scrapingController.search);
router.get('/searches', scrapingController.listSearches);
router.get('/searches/:id/export', scrapingController.exportCsv);

export default router;
