/**
 * Copia migrações .sql para dist/ após o tsc (node dist/scripts/runMigration.js precisa delas).
 */
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'src', 'database', 'migrations');
const dst = path.join(__dirname, '..', 'dist', 'database', 'migrations');

if (!fs.existsSync(src)) {
  console.warn('[copySqlMigrations] Origem não encontrada:', src);
  process.exit(0);
}

fs.mkdirSync(dst, { recursive: true });
const files = fs.readdirSync(src).filter((f) => f.endsWith('.sql'));
for (const f of files) {
  fs.copyFileSync(path.join(src, f), path.join(dst, f));
}
console.log('[copySqlMigrations] Copiados', files.length, 'ficheiro(s) para dist/database/migrations');
