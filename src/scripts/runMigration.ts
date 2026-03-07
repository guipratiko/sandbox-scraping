/**
 * Executa as migrations SQL do PostgreSQL (tabelas scraping_searches e scraping_results)
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import '../config/constants'; // carrega dotenv
import { pgPool } from '../config/databases';

async function run() {
  console.log('📦 Executando migrations Scraping-Flow...');
  const migrationsDir = join(__dirname, '../database/migrations');
  const files = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
  const client = await pgPool.connect();
  try {
    for (const file of files) {
      console.log(`   Executando ${file}...`);
      const sql = readFileSync(join(migrationsDir, file), 'utf-8');
      await client.query(sql);
    }
    console.log('✅ Migrations concluídas.');
  } catch (err) {
    console.error('❌ Erro na migration:', err);
    process.exit(1);
  } finally {
    client.release();
    await pgPool.end();
  }
}

run();
