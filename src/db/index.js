// ============================================================
// DocRx — Database Engine (sql.js loader + persistence)
// ============================================================
import { SCHEMA_VERSION, CREATE_TABLES_SQL, MIGRATIONS } from './schema.js';
import { SEED_MEDICINES, SEED_TESTS, SEED_DIAGNOSES } from './seed.js';

let SQL = null;
let db  = null;

const DB_KEY = 'docrx_db_v1';

// ── Load sql.js WASM ─────────────────────────────────────────
async function loadSQLjs() {
  if (SQL) return SQL;
  // sql.js CJS/ESM interop: handle both .default and direct export
  const sqlModule = await import('sql.js');
  const initSqlJs = sqlModule.default ?? sqlModule;
  SQL = await initSqlJs({
    // WASM file is copied to /public/sql-wasm.wasm at build time
    locateFile: () => `${import.meta.env.BASE_URL}sql-wasm.wasm`,
  });
  return SQL;
}


// ── Persist DB to IndexedDB ───────────────────────────────
export function persistDB() {
  if (!db) return;
  try {
    const data = db.export();
    const buf  = new Uint8Array(data);
    import('idb-keyval').then(({ set }) => {
      set('docrx_sqlite_db_v1', buf).catch(e => console.warn('IDB save error', e));
    });
  } catch (e) {
    console.warn('DocRx: DB persist error', e);
  }
}

// ── Load DB from IndexedDB ────────────────────────────────
async function loadPersistedDB(SQL) {
  try {
    const { get, set } = await import('idb-keyval');
    let buf = await get('docrx_sqlite_db_v1');
    
    // Auto-migrate from localStorage if IndexedDB is empty
    if (!buf) {
      const saved = localStorage.getItem(DB_KEY);
      if (saved) {
        const binary = atob(saved);
        buf = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);
        await set('docrx_sqlite_db_v1', buf);
        console.log('Migrated DB from localStorage to IndexedDB');
        // We leave localStorage as a fallback backup, but it's no longer the source of truth
      }
    }
    
    if (!buf) return null;
    return new SQL.Database(buf);
  } catch (e) {
    console.warn('DocRx: DB load error', e);
    return null;
  }
}

// ── Run migrations ────────────────────────────────────────────
function runMigrations(db) {
  // Add first_name and last_name if missing (schema update)
  try {
    db.exec("ALTER TABLE settings ADD COLUMN doctor_first_name TEXT DEFAULT ''");
    db.exec("ALTER TABLE settings ADD COLUMN doctor_last_name TEXT DEFAULT ''");
    db.exec("UPDATE settings SET doctor_first_name = doctor_name WHERE doctor_first_name = ''");
  } catch (e) { /* ignores if columns already exist */ }

  try {
    db.exec("ALTER TABLE visits ADD COLUMN fee INTEGER DEFAULT 0");
    db.exec("ALTER TABLE visits ADD COLUMN attachment_idb_key TEXT");
  } catch (e) {}

  const row = db.exec("SELECT schema_version FROM settings WHERE id=1");
  if (!row.length || !row[0].values.length) return;
  let version = row[0].values[0][0];
  while (version < SCHEMA_VERSION) {
    version++;
    if (MIGRATIONS[version]) {
      db.run(MIGRATIONS[version]);
      db.run(`UPDATE settings SET schema_version=${version} WHERE id=1`);
    }
  }
}

// ── Seed initial data ────────────────────────────────────────
function seedData(db) {
  const count = db.exec("SELECT COUNT(*) FROM medicines")[0].values[0][0];
  if (count > 0) return; // already seeded

  const medStmt = db.prepare(
    `INSERT OR IGNORE INTO medicines (name, default_dosage, default_frequency, default_instructions, default_route)
     VALUES (?, ?, ?, ?, ?)`
  );
  for (const m of SEED_MEDICINES) {
    medStmt.run([m.name, m.dosage || null, m.freq || null, m.instr || null, m.route || 'Oral']);
  }
  medStmt.free();

  const testStmt = db.prepare(
    `INSERT OR IGNORE INTO test_catalog (name, default_instructions) VALUES (?, ?)`
  );
  for (const t of SEED_TESTS) {
    testStmt.run([t.name, t.instr || null]);
  }
  testStmt.free();

  const dxStmt = db.prepare(
    `INSERT OR IGNORE INTO diagnosis_suggestions (name) VALUES (?)`
  );
  for (const d of SEED_DIAGNOSES) {
    dxStmt.run([d]);
  }
  dxStmt.free();
}

// ── Initialize DB ────────────────────────────────────────────
export async function initDB() {
  if (db) return db;

  const SQL = await loadSQLjs();
  const existing = await loadPersistedDB(SQL);

  if (existing) {
    db = existing;
    runMigrations(db);
  } else {
    db = new SQL.Database();
    db.run(CREATE_TABLES_SQL);
    seedData(db);
    persistDB();
  }

  return db;
}

// ── Get DB instance (must call initDB first) ─────────────────
export function getDB() {
  if (!db) throw new Error('DocRx: DB not initialized');
  return db;
}

// ── Query helpers ─────────────────────────────────────────────
export function queryAll(sql, params = []) {
  const result = db.exec(sql, params);
  if (!result.length) return [];
  const { columns, values } = result[0];
  return values.map(row => {
    const obj = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  });
}

export function queryOne(sql, params = []) {
  const rows = queryAll(sql, params);
  return rows[0] || null;
}

export function run(sql, params = []) {
  db.run(sql, params);
  persistDB();
}

export function runGetId(sql, params = []) {
  db.run(sql, params);
  const id = db.exec("SELECT last_insert_rowid()")[0].values[0][0];
  persistDB();
  return id;
}

// ── Export DB binary (for backup) ────────────────────────────
export function exportDBBinary() {
  if (!db) return null;
  return db.export();
}

// ── Import DB binary (restore) ────────────────────────────────
export async function importDBBinary(arrayBuffer) {
  const SQL = await loadSQLjs();
  const buf  = new Uint8Array(arrayBuffer);
  db = new SQL.Database(buf);
  persistDB();
  return db;
}
