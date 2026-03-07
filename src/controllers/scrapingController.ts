import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import * as scrapingService from '../services/scrapingService';
import { getCredits } from '../services/creditsService';

function escapeCsvField(value: string | null): string {
  if (value == null) return '';
  const s = String(value);
  if (s.includes(';') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function search(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      const e: AppError = new Error('Usuário não identificado');
      e.statusCode = 401;
      return next(e);
    }
    const { textQuery, languageCode, maxResults } = req.body;
    if (!textQuery || typeof textQuery !== 'string') {
      const e: AppError = new Error('textQuery é obrigatório');
      e.statusCode = 400;
      e.status = 'validation_error';
      return next(e);
    }
    const searchRecord = await scrapingService.createSearch({
      userId,
      textQuery: textQuery.trim(),
      languageCode: languageCode || 'pt-BR',
      maxResults: maxResults == null ? 500 : Number(maxResults),
    });
    res.status(201).json({
      status: 'success',
      data: {
        id: searchRecord.id,
        text_query: searchRecord.text_query,
        language_code: searchRecord.language_code,
        package_size: searchRecord.package_size,
        total_results: searchRecord.total_results,
        created_at: searchRecord.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getCreditsBalance(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      const e: AppError = new Error('Usuário não identificado');
      e.statusCode = 401;
      return next(e);
    }
    const credits = await getCredits(userId);
    res.json({ status: 'success', data: { credits } });
  } catch (error) {
    next(error);
  }
}

export async function listSearches(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      const e: AppError = new Error('Usuário não identificado');
      e.statusCode = 401;
      return next(e);
    }
    const searches = await scrapingService.listSearches(userId);
    res.json({
      status: 'success',
      data: searches.map((s) => ({
        id: s.id,
        text_query: s.text_query,
        language_code: s.language_code,
        package_size: s.package_size,
        total_results: s.total_results,
        created_at: s.created_at,
      })),
    });
  } catch (error) {
    next(error);
  }
}

export async function exportCsv(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id;
    const searchId = req.params.id;
    if (!userId) {
      const e: AppError = new Error('Usuário não identificado');
      e.statusCode = 401;
      return next(e);
    }
    const search = await scrapingService.getSearchById(searchId, userId);
    if (!search) {
      const e: AppError = new Error('Busca não encontrada');
      e.statusCode = 404;
      e.status = 'not_found';
      return next(e);
    }
    const rows = await scrapingService.getResultsForExport(searchId, userId);
    const header = 'nome;telefone;endereço';
    const lines = [header, ...rows.map((r) => [
      escapeCsvField(r.name),
      escapeCsvField(r.phone),
      escapeCsvField(r.address),
    ].join(';'))];
    // CRLF para Excel reconhecer quebras de linha; BOM UTF-8 para acentuação correta
    const csv = '\uFEFF' + lines.join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="scraping-${searchId}.csv"`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
}
