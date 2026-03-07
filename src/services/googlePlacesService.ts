/**
 * Google Places API (New) - searchText com paginação
 */

import axios from 'axios';
import { GOOGLE_PLACES_CONFIG, RESULTS_PER_PAGE } from '../config/constants';

const FIELD_MASK =
  'places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.id,nextPageToken';

export interface PlaceResult {
  placeId?: string;
  name?: string;
  phone?: string;
  address?: string;
}

export interface SearchTextResponse {
  places: PlaceResult[];
  nextPageToken?: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function searchText(
  textQuery: string,
  languageCode: string,
  pageToken?: string
): Promise<SearchTextResponse> {
  const url = `${GOOGLE_PLACES_CONFIG.BASE_URL}/places:searchText`;
  const body: Record<string, unknown> = {
    textQuery,
    languageCode,
    pageSize: RESULTS_PER_PAGE,
  };
  if (pageToken) body.pageToken = pageToken;

  const opts = {
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_PLACES_CONFIG.API_KEY,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    timeout: 15000,
  };

  let lastErr: any;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { data } = await axios.post(url, body, opts);
      const places: PlaceResult[] = (data.places || []).map((p: any) => ({
    placeId: p.id || undefined,
    name: p.displayName?.text || undefined,
    phone: p.nationalPhoneNumber || undefined,
    address: p.formattedAddress || undefined,
  }));

  return {
    places,
    nextPageToken: data.nextPageToken || undefined,
  };
    } catch (err: any) {
      lastErr = err;
      const status = err?.response?.status;
      const isRetryable = status === 500 || status === 503 || status === 429;
      if (isRetryable && attempt < 2) {
        await sleep(1500 * (attempt + 1));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

/**
 * Busca até atingir maxResults (máx. 500 ou 1000), paginando com nextPageToken
 */
export async function searchTextAllPages(
  textQuery: string,
  languageCode: string,
  maxResults: number
): Promise<PlaceResult[]> {
  const all: PlaceResult[] = [];
  let nextPageToken: string | undefined;

  do {
    const res = await searchText(textQuery, languageCode, nextPageToken);
    all.push(...res.places);
    nextPageToken = res.nextPageToken;
    if (all.length >= maxResults) break;
  } while (nextPageToken);

  return all.slice(0, maxResults);
}
