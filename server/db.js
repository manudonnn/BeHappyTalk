const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'behappytalk.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');

    db.serialize(() => {
      // -----------------------------------------------
      // IMPORTANT: Never DROP tables — data is persistent
      // -----------------------------------------------

      // Users table
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT,
        phone TEXT UNIQUE,
        password TEXT,
        walletBalance REAL DEFAULT 500.00
      )`);

      // Providers table (our 3 dummy listeners)
      db.run(`CREATE TABLE IF NOT EXISTS providers (
        id TEXT PRIMARY KEY,
        name TEXT,
        phone TEXT UNIQUE,
        password TEXT,
        verified INTEGER,
        demographic TEXT,
        rating TEXT,
        reviews TEXT,
        tagline TEXT,
        exp TEXT,
        langs TEXT,
        status TEXT,
        waitTime TEXT,
        imagePath TEXT,
        priceChat INTEGER DEFAULT 10,
        priceCall INTEGER DEFAULT 20,
        priceVideo INTEGER DEFAULT 30,
        walletBalance REAL DEFAULT 0.0
      )`);

      // Inbox table
      db.run(`CREATE TABLE IF NOT EXISTS inbox (
        id TEXT PRIMARY KEY,
        userId TEXT,
        providerId TEXT,
        date TEXT,
        type TEXT,
        status TEXT,
        message TEXT,
        icon TEXT,
        iconColor TEXT,
        isSystem INTEGER,
        FOREIGN KEY(userId) REFERENCES users(id),
        FOREIGN KEY(providerId) REFERENCES providers(id)
      )`);

      // Messages table
      db.run(`CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT,
        providerId TEXT,
        senderId TEXT,
        text TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(userId) REFERENCES users(id),
        FOREIGN KEY(providerId) REFERENCES providers(id)
      )`);

      // Sessions table
      db.run(`CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        userId TEXT,
        providerId TEXT,
        type TEXT,
        rate INTEGER,
        status TEXT,
        startTime DATETIME DEFAULT CURRENT_TIMESTAMP,
        duration INTEGER DEFAULT 0,
        cost REAL DEFAULT 0.0,
        FOREIGN KEY(userId) REFERENCES users(id),
        FOREIGN KEY(providerId) REFERENCES providers(id)
      )`);

      // Seed providers if not already present
      db.get('SELECT count(*) as count FROM providers', async (err, row) => {
        if (row && row.count === 0) {
          console.log('Seeding providers...');
          const bcrypt = require('bcryptjs');
          const defaultPassword = await bcrypt.hash('password', 10);

          const stmt = db.prepare(
            `INSERT INTO providers (id, name, phone, password, verified, demographic, rating, reviews, tagline, exp, langs, status, waitTime, imagePath, priceChat, priceCall, priceVideo)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          );
          
          // Seed with phones 1111111111, 2222222222, 3333333333
          stmt.run('p1', 'Ridhi', '1111111111', defaultPassword, 1, 'F · 31 yrs', '4.97', '4K+', 'I was heartbroken after he left me alone.', '1K+', 'Hindi', 'online', '', '', 10, 20, 30);
          stmt.run('p2', 'Shruti', '2222222222', defaultPassword, 1, 'F · 32 yrs', '4.91', '800+', 'I felt torn by family conflict over values.', '100+', 'Hindi · Odia · Bengali', 'online', '', '', 15, 25, 40);
          stmt.run('p3', 'Dhvani', '3333333333', defaultPassword, 1, 'F · 22 yrs', '4.88', '300+', 'I suffered from depression after my breakup.', '50+', 'Hindi', 'online', '', '', 8, 15, 25);
          stmt.finalize();
        }
      });
    });
  }
});

module.exports = db;
