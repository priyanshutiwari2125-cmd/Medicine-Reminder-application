const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'medicine_reminder.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database at:', dbPath);
    db.run('PRAGMA foreign_keys = ON;', (pragmaErr) => {
      if (pragmaErr) {
        console.error('Error enabling foreign keys:', pragmaErr.message);
      } else {
        console.log('Foreign key constraints enabled.');
      }
    });
  }
});

// Helper functions that wrap SQLite callbacks in Promises
const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
};

const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

// Initialize schema
const initDatabase = async () => {
  try {
    // Users table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS Users (
        UserId INTEGER PRIMARY KEY AUTOINCREMENT,
        Name TEXT NOT NULL,
        Email TEXT UNIQUE NOT NULL,
        Password TEXT NOT NULL
      )
    `);

    // Ensure default Guest User exists
    const guestUser = await dbGet('SELECT * FROM Users WHERE UserId = 1');
    if (!guestUser) {
      await dbRun(
        'INSERT INTO Users (UserId, Name, Email, Password) VALUES (1, ?, ?, ?)',
        ['Guest User', 'guest@example.com', 'no_password_needed']
      );
      console.log('Inserted default Guest User (UserId = 1).');
    }

    // Drop table Medicines if it has obsolete column Duration or is missing Ringtone
    const tableInfo = await dbAll("PRAGMA table_info(Medicines)");
    const hasDuration = tableInfo.some(col => col.name === 'Duration');
    const hasRingtone = tableInfo.some(col => col.name === 'Ringtone');
    if (hasDuration || (tableInfo.length > 0 && !hasRingtone)) {
      console.log('Obsolete schema detected. Recreating tables for Ringtone System...');
      await dbRun('DROP TABLE IF EXISTS History');
      await dbRun('DROP TABLE IF EXISTS Medicines');
    }

    // Medicines table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS Medicines (
        MedicineId INTEGER PRIMARY KEY AUTOINCREMENT,
        UserId INTEGER NOT NULL,
        MedicineName TEXT NOT NULL,
        Dosage TEXT NOT NULL,
        Time TEXT NOT NULL,
        DaysOfWeek TEXT NOT NULL,
        Ringtone TEXT NOT NULL DEFAULT 'Chime',
        Notes TEXT,
        FOREIGN KEY (UserId) REFERENCES Users(UserId) ON DELETE CASCADE
      )
    `);

    // History table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS History (
        HistoryId INTEGER PRIMARY KEY AUTOINCREMENT,
        MedicineId INTEGER NOT NULL,
        UserId INTEGER NOT NULL,
        Date TEXT NOT NULL,
        Time TEXT NOT NULL,
        Status TEXT NOT NULL CHECK(Status IN ('Taken', 'Missed')),
        FOREIGN KEY (MedicineId) REFERENCES Medicines(MedicineId) ON DELETE CASCADE,
        FOREIGN KEY (UserId) REFERENCES Users(UserId) ON DELETE CASCADE
      )
    `);

    console.log('Database tables verified/created successfully.');
  } catch (error) {
    console.error('Error initializing database tables:', error);
    process.exit(1);
  }
};

initDatabase();

module.exports = {
  db,
  dbRun,
  dbAll,
  dbGet
};
