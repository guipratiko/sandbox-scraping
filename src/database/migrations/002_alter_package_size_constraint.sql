-- Scraping-Flow: package_size fixo em 60 (não usamos mais 500/1000)

-- 1) Remover a constraint antiga (500 ou 1000) para permitir o UPDATE
ALTER TABLE scraping_searches DROP CONSTRAINT IF EXISTS scraping_searches_package_size_check;

-- 2) Atualizar linhas antigas para 60
UPDATE scraping_searches SET package_size = 60 WHERE package_size != 60;

-- 3) Criar a nova constraint (só 60)
ALTER TABLE scraping_searches ADD CONSTRAINT scraping_searches_package_size_check CHECK (package_size = 60);
