const Database = require('better-sqlite3')
const bcrypt = require('bcryptjs')
const path = require('path')

const DB_PATH = path.join(__dirname, '..', 'mymech.db')

let db

function getDb() {
  if (!db) {
    db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
  }
  return db
}

function initDatabase() {
  const db = getDb()

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      car_make TEXT,
      car_model TEXT,
      car_year TEXT,
      opted_out INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      issue_description TEXT,
      appointment_date TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      service_summary TEXT,
      completed_at TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    CREATE TABLE IF NOT EXISTS sms_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      appointment_id INTEGER,
      message_type TEXT NOT NULL,
      message_body TEXT NOT NULL,
      scheduled_for TEXT NOT NULL,
      sent_at TEXT,
      status TEXT DEFAULT 'pending',
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (appointment_id) REFERENCES appointments(id)
    );
  `)

  // Seed default admin user on first launch
  const existingUser = db.prepare('SELECT id FROM users LIMIT 1').get()
  if (!existingUser) {
    const hash = bcrypt.hashSync('mechanic123', 10)
    db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run('mechanic', hash)
    console.log('==============================================')
    console.log('  MyMech first-launch setup complete!')
    console.log('  Default login credentials:')
    console.log('    Username: mechanic')
    console.log('    Password: mechanic123')
    console.log('  Change these after your first login.')
    console.log('==============================================')
  }

  return db
}

module.exports = { getDb, initDatabase }
