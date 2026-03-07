/**
 * Orquestra busca Google Places, gravação no PG e débito de créditos
 */

import { pgPool } from '../config/databases';
import { getCredits, debitCredits } from './creditsService';
import { searchTextAllPages, PlaceResult } from './googlePlacesService';
import { emitScrapingCreditsUpdate } from '../socket/socketClient';
import { MIN_RESULTS, MAX_RESULTS } from '../config/constants';
import { AppError } from '../middleware/errorHandler';

export interface CreateSearchInput {
  userId: string;
  textQuery: string;
  languageCode?: string;
  maxResults: number;
}

export interface SearchRecord {
  id: string;
  user_id: string;
  text_query: string;
  language_code: string;
  package_size: number;
  total_results: number;
  created_at: Date;
}

export async function createSearch(input: CreateSearchInput): Promise<SearchRecord> {
  const { userId, textQuery, maxResults, languageCode = 'pt-BR' } = input;
  const requested = Math.max(MIN_RESULTS, Math.min(MAX_RESULTS, Math.floor(Number(maxResults)) || MIN_RESULTS));
  if (Number.isNaN(requested) || requested < MIN_RESULTS || requested > MAX_RESULTS) {
    const e: AppError = new Error(`Quantidade inválida. Informe entre ${MIN_RESULTS} e ${MAX_RESULTS} resultados.`);
    e.statusCode = 400;
    e.status = 'validation_error';
    throw e;
  }

  let credits: number;
  try {
    credits = await getCredits(userId);
  } catch (err: any) {
    console.error('[Scraping-Flow] getCredits MongoDB error:', err?.message || err);
    const e: AppError = new Error('Erro ao verificar créditos. Verifique a conexão com o banco.');
    e.statusCode = 503;
    e.status = 'service_unavailable';
    throw e;
  }
  if (credits < requested) {
    const e: AppError = new Error(
      `Créditos insuficientes. Necessário: ${requested}, disponível: ${credits}`
    );
    e.statusCode = 402;
    e.status = 'insufficient_credits';
    throw e;
  }

  let places: PlaceResult[];
  try {
    places = await searchTextAllPages(textQuery, languageCode, requested);
  } catch (err: any) {
    console.error('[Scraping-Flow] Google Places error:', err?.response?.data || err?.message || err);
    const status = err?.response?.status;
    let msg: string;
    if (status === 403) {
      msg = 'Google Places API: chave inválida ou não ativada. Verifique GOOGLE_PLACES_API_KEY.';
    } else if (status === 500 || status === 503) {
      msg = 'Serviço da Google temporariamente indisponível. Tente novamente em alguns instantes.';
    } else {
      msg = err?.response?.data?.error?.message || err?.message || 'Erro ao buscar lugares.';
    }
    const e: AppError = new Error(msg);
    e.statusCode = 502;
    e.status = 'external_service_error';
    throw e;
  }

  const client = await pgPool.connect();
  try {
    const searchRes = await client.query(
      `INSERT INTO scraping_searches (user_id, text_query, language_code, package_size, total_results)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, user_id, text_query, language_code, package_size, total_results, created_at`,
      [userId, textQuery, languageCode, requested, places.length]
    );
    const search = searchRes.rows[0] as SearchRecord;
    const searchId = search.id;

    for (const p of places) {
      await client.query(
        `INSERT INTO scraping_results (search_id, user_id, place_id, name, phone, address)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [searchId, userId, p.placeId ?? null, p.name ?? null, p.phone ?? null, p.address ?? null]
      );
    }

    const newBalance = await debitCredits(userId, places.length);
    if (newBalance === null) {
      await client.query('DELETE FROM scraping_results WHERE search_id = $1', [searchId]);
      await client.query('DELETE FROM scraping_searches WHERE id = $1', [searchId]);
      const e: AppError = new Error(
        'Créditos insuficientes no momento do débito ou falha ao atualizar. Verifique seu saldo e tente novamente.'
      );
      e.statusCode = 402;
      e.status = 'insufficient_credits';
      throw e;
    }

    emitScrapingCreditsUpdate(userId, newBalance);

    return search;
  } catch (err: any) {
    if (err?.statusCode) throw err;
    if (err?.code === '42P01') {
      const e: AppError = new Error('Tabelas do Scraping não encontradas. Execute no Scraping-Flow: npm run migrate');
      e.statusCode = 503;
      e.status = 'service_unavailable';
      throw e;
    }
    console.error('[Scraping-Flow] createSearch error:', err?.message || err);
    const e: AppError = new Error(err?.message || 'Erro ao salvar busca');
    e.statusCode = 500;
    throw e;
  } finally {
    client.release();
  }
}

export async function listSearches(userId: string): Promise<SearchRecord[]> {
  try {
    const { rows } = await pgPool.query(
      `SELECT id, user_id, text_query, language_code, package_size, total_results, created_at
       FROM scraping_searches
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
    return rows as SearchRecord[];
  } catch (err: any) {
    if (err?.code === '42P01') {
      const e: AppError = new Error('Tabelas do Scraping não encontradas. Execute no Scraping-Flow: npm run migrate');
      e.statusCode = 503;
      e.status = 'service_unavailable';
      throw e;
    }
    console.error('[Scraping-Flow] listSearches PG error:', err?.message || err);
    const e: AppError = new Error(err?.message || 'Erro ao listar buscas');
    e.statusCode = 500;
    throw e;
  }
}

export async function getSearchById(searchId: string, userId: string): Promise<SearchRecord | null> {
  const { rows } = await pgPool.query(
    `SELECT id, user_id, text_query, language_code, package_size, total_results, created_at
     FROM scraping_searches
     WHERE id = $1 AND user_id = $2`,
    [searchId, userId]
  );
  return (rows[0] as SearchRecord) || null;
}

export interface ResultRow {
  name: string | null;
  phone: string | null;
  address: string | null;
}

export async function getResultsForExport(
  searchId: string,
  userId: string
): Promise<ResultRow[]> {
  const { rows } = await pgPool.query(
    `SELECT r.name, r.phone, r.address
     FROM scraping_results r
     JOIN scraping_searches s ON s.id = r.search_id
     WHERE s.id = $1 AND s.user_id = $2
     ORDER BY r.created_at`,
    [searchId, userId]
  );
  return rows as ResultRow[];
}
