import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = path.join(__dirname, '../../scriva.db')

let db

export function getDb() {
  if (!db) {
    db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
  }
  return db
}

export function initDb() {
  const db = getDb()

  db.exec(`
    CREATE TABLE IF NOT EXISTS dailys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data TEXT NOT NULL,
      transcricao TEXT NOT NULL,
      ata TEXT NOT NULL,
      participantes TEXT,
      tipo TEXT DEFAULT 'daily',
      criado_em TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `)

  try {
    db.exec(`ALTER TABLE dailys ADD COLUMN tipo TEXT DEFAULT 'daily'`)
  } catch {}

  console.log('✅ Banco de dados pronto')
}