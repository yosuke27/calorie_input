import sqlite3InitModule from '@sqlite.org/sqlite-wasm';

let dbInstance: any = null;

export const initDb = async () => {
  if (dbInstance) return dbInstance;

  try {
    const sqlite3 = await sqlite3InitModule({
      print: console.log,
      printErr: console.error,
    });

    console.log('Running SQLite3 version', sqlite3.version.libVersion);

    if (sqlite3.opfs) {
      dbInstance = new sqlite3.oo1.OpfsDb('/calorie_input.sqlite3');
      console.log('OPFS is available, created persistent database.');
    } else {
      console.warn('OPFS is not available. Falling back to transient in-memory database.');
      dbInstance = new sqlite3.oo1.DB('/calorie_input.sqlite3', 'ct');
    }

    // Initialize tables
    dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS profile (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL
      )
    `);

    return dbInstance;
  } catch (error) {
    console.error('Failed to initialize SQLite:', error);
    throw error;
  }
};

export const getDb = async () => {
  if (!dbInstance) {
    return await initDb();
  }
  return dbInstance;
};

export const saveProfileName = async (name: string) => {
  const db = await getDb();
  // Clear existing names assuming single profile for now
  db.exec('DELETE FROM profile');
  db.exec({
    sql: 'INSERT INTO profile (name) VALUES (?)',
    bind: [name]
  });
};

export const getProfileName = async (): Promise<string | null> => {
  const db = await getDb();
  let name = null;
  db.exec({
    sql: 'SELECT name FROM profile LIMIT 1',
    rowMode: 'object',
    callback: (row: any) => {
      name = row.name;
    }
  });
  return name;
};
