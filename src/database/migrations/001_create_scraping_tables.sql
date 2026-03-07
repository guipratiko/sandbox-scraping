-- Scraping-Flow: buscas e resultados (dados por usuário, retenção 30 dias)

-- Buscas realizadas
CREATE TABLE IF NOT EXISTS scraping_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(24) NOT NULL,
  text_query TEXT NOT NULL,
  language_code VARCHAR(10) NOT NULL DEFAULT 'pt-BR',
  package_size INTEGER NOT NULL CHECK (package_size IN (500, 1000)),
  total_results INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scraping_searches_user_id ON scraping_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_scraping_searches_created_at ON scraping_searches(created_at);

-- Resultados (places) por busca
CREATE TABLE IF NOT EXISTS scraping_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id UUID NOT NULL REFERENCES scraping_searches(id) ON DELETE CASCADE,
  user_id VARCHAR(24) NOT NULL,
  place_id TEXT,
  name TEXT,
  phone TEXT,
  address TEXT,
  raw_json JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scraping_results_search_id ON scraping_results(search_id);
CREATE INDEX IF NOT EXISTS idx_scraping_results_user_id ON scraping_results(user_id);

COMMENT ON TABLE scraping_searches IS 'Buscas Google Places por usuário; dados mantidos 30 dias';
COMMENT ON TABLE scraping_results IS 'Resultados (nome, telefone, endereço) por busca; dados mantidos 30 dias';
