import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbDir = path.join(__dirname, 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir);
}

const db = new Database(path.join(dbDir, 'coex5.db'));

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT,
    contact TEXT UNIQUE,
    password TEXT,
    points INTEGER DEFAULT 0,
    role TEXT DEFAULT 'user',
    avatar TEXT DEFAULT 'farmer1',
    theme TEXT DEFAULT 'dark',
    language TEXT DEFAULT 'es',
    default_anonymous INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    type TEXT,
    animal TEXT,
    notes TEXT,
    lat REAL,
    lng REAL,
    photo_url TEXT,
    anonymous INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS guide_groups (
    id TEXT PRIMARY KEY,
    title TEXT,
    icon TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS guides (
    id TEXT PRIMARY KEY,
    group_id TEXT,
    title TEXT,
    content TEXT,
    image_url TEXT,
    video_url TEXT,
    read_time INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Insert admin user if not exists
  INSERT OR IGNORE INTO users (id, name, contact, password, role) 
  VALUES ('admin-1', 'Admin Luis', 'luiscb@gmail.com', '12345', 'admin');
`);

export default db;
