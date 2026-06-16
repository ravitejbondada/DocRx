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
function migrateToV3(db) {
  console.log('DocRx: Migrating database to version 3 (UUID and Soft Deletes)...');
  
  // 1. Create temporary tables
  db.run(`
    CREATE TABLE IF NOT EXISTS patients_new (
      id                      TEXT     PRIMARY KEY,
      patient_code            TEXT     UNIQUE NOT NULL,
      full_name               TEXT     NOT NULL,
      dob                     DATE,
      age                     INTEGER  NOT NULL,
      gender                  TEXT     NOT NULL CHECK (gender IN ('M','F','Other')),
      phone                   TEXT     NOT NULL,
      address                 TEXT,
      blood_group             TEXT     CHECK (blood_group IN ('A+','A-','B+','B-','O+','O-','AB+','AB-','')),
      allergies               TEXT,
      chronic_conditions      TEXT,
      emergency_contact_name  TEXT,
      emergency_contact_phone TEXT,
      notes                   TEXT,
      created_at              DATETIME NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at              DATETIME NOT NULL DEFAULT (datetime('now','localtime')),
      deleted                 INTEGER  NOT NULL DEFAULT 0,
      deleted_at              DATETIME
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS visits_new (
      id              TEXT     PRIMARY KEY,
      patient_id      TEXT     NOT NULL REFERENCES patients_new(id) ON DELETE CASCADE,
      visit_date      DATE     NOT NULL DEFAULT (date('now','localtime')),
      chief_complaint TEXT     NOT NULL,
      diagnosis       TEXT,
      clinical_notes  TEXT,
      bp              TEXT,
      temperature     REAL,
      weight          REAL,
      height          REAL,
      bmi             REAL,
      spo2            INTEGER,
      pulse           INTEGER,
      visit_type      TEXT     NOT NULL DEFAULT 'New' CHECK (visit_type IN ('New','Follow-up')),
      follow_up_date  DATE,
      fee             INTEGER  DEFAULT 0,
      attachment_idb_key TEXT,
      created_at      DATETIME NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at      DATETIME NOT NULL DEFAULT (datetime('now','localtime')),
      deleted         INTEGER  NOT NULL DEFAULT 0,
      deleted_at      DATETIME
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS prescriptions_new (
      id            TEXT PRIMARY KEY,
      visit_id      TEXT NOT NULL REFERENCES visits_new(id) ON DELETE CASCADE,
      medicine_name TEXT    NOT NULL,
      dosage        TEXT,
      frequency     TEXT,
      route         TEXT,
      duration      TEXT,
      instructions  TEXT,
      sort_order    INTEGER DEFAULT 0,
      updated_at    DATETIME NOT NULL DEFAULT (datetime('now','localtime')),
      deleted       INTEGER  NOT NULL DEFAULT 0,
      deleted_at    DATETIME
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS diagnostic_tests_new (
      id            TEXT PRIMARY KEY,
      visit_id      TEXT NOT NULL REFERENCES visits_new(id) ON DELETE CASCADE,
      test_name     TEXT    NOT NULL,
      instructions  TEXT,
      urgency       TEXT    DEFAULT 'Routine' CHECK (urgency IN ('Routine','Urgent')),
      result_notes  TEXT,
      result_date   DATE,
      updated_at    DATETIME NOT NULL DEFAULT (datetime('now','localtime')),
      deleted       INTEGER  NOT NULL DEFAULT 0,
      deleted_at    DATETIME
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS pharmacies_new (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      address       TEXT,
      phone         TEXT,
      is_default    INTEGER DEFAULT 0,
      updated_at    DATETIME NOT NULL DEFAULT (datetime('now','localtime')),
      deleted       INTEGER  NOT NULL DEFAULT 0,
      deleted_at    DATETIME
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS diagnostic_centers_new (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      address       TEXT,
      phone         TEXT,
      is_default    INTEGER DEFAULT 0,
      updated_at    DATETIME NOT NULL DEFAULT (datetime('now','localtime')),
      deleted       INTEGER  NOT NULL DEFAULT 0,
      deleted_at    DATETIME
    );
  `);

  const queryRows = (sql) => {
    const res = db.exec(sql);
    if (!res.length) return [];
    const { columns, values } = res[0];
    return values.map(row => {
      const obj = {};
      columns.forEach((col, i) => { obj[col] = row[i]; });
      return obj;
    });
  };

  // 2. Fetch and Migrate Patients
  const patients = queryRows("SELECT * FROM patients");
  const patientMap = {}; // old_id -> new_uuid
  const patStmt = db.prepare(`
    INSERT INTO patients_new (id, patient_code, full_name, dob, age, gender, phone, address, blood_group, allergies, chronic_conditions, emergency_contact_name, emergency_contact_phone, notes, created_at, updated_at, deleted)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
  `);
  for (const p of patients) {
    const uuid = crypto.randomUUID();
    patientMap[p.id] = uuid;
    patStmt.run([
      uuid, p.patient_code, p.full_name, p.dob, p.age, p.gender, p.phone, p.address,
      p.blood_group, p.allergies, p.chronic_conditions, p.emergency_contact_name,
      p.emergency_contact_phone, p.notes, p.created_at, p.created_at
    ]);
  }
  patStmt.free();

  // 3. Fetch and Migrate Visits
  const visits = queryRows("SELECT * FROM visits");
  const visitMap = {}; // old_id -> new_uuid
  const visStmt = db.prepare(`
    INSERT INTO visits_new (id, patient_id, visit_date, chief_complaint, diagnosis, clinical_notes, bp, temperature, weight, height, bmi, spo2, pulse, visit_type, follow_up_date, fee, attachment_idb_key, created_at, updated_at, deleted)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
  `);
  for (const v of visits) {
    const uuid = crypto.randomUUID();
    visitMap[v.id] = uuid;
    const newPatientId = patientMap[v.patient_id];
    if (newPatientId) {
      visStmt.run([
        uuid, newPatientId, v.visit_date, v.chief_complaint, v.diagnosis, v.clinical_notes,
        v.bp, v.temperature, v.weight, v.height, v.bmi, v.spo2, v.pulse, v.visit_type,
        v.follow_up_date, v.fee || 0, v.attachment_idb_key || null, v.created_at, v.updated_at || v.created_at
      ]);
    }
  }
  visStmt.free();

  // 4. Fetch and Migrate Prescriptions
  const prescriptions = queryRows("SELECT * FROM prescriptions");
  const rxStmt = db.prepare(`
    INSERT INTO prescriptions_new (id, visit_id, medicine_name, dosage, frequency, route, duration, instructions, sort_order, updated_at, deleted)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
  `);
  for (const r of prescriptions) {
    const uuid = crypto.randomUUID();
    const newVisitId = visitMap[r.visit_id];
    if (newVisitId) {
      rxStmt.run([
        uuid, newVisitId, r.medicine_name, r.dosage, r.frequency, r.route, r.duration, r.instructions, r.sort_order || 0, r.created_at || r.updated_at || (new Date().toISOString())
      ]);
    }
  }
  rxStmt.free();

  // 5. Fetch and Migrate Diagnostic Tests
  const tests = queryRows("SELECT * FROM diagnostic_tests");
  const testStmt = db.prepare(`
    INSERT INTO diagnostic_tests_new (id, visit_id, test_name, instructions, urgency, result_notes, result_date, updated_at, deleted)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
  `);
  for (const t of tests) {
    const uuid = crypto.randomUUID();
    const newVisitId = visitMap[t.visit_id];
    if (newVisitId) {
      testStmt.run([
        uuid, newVisitId, t.test_name, t.instructions, t.urgency || 'Routine', t.result_notes, t.result_date, t.created_at || t.updated_at || (new Date().toISOString())
      ]);
    }
  }
  testStmt.free();

  // 6. Fetch and Migrate Pharmacies (if pharmacies table exists)
  try {
    const pharmacies = queryRows("SELECT * FROM pharmacies");
    const pharStmt = db.prepare(`
      INSERT INTO pharmacies_new (id, name, address, phone, is_default, updated_at, deleted)
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `);
    for (const ph of pharmacies) {
      const uuid = crypto.randomUUID();
      pharStmt.run([uuid, ph.name, ph.address, ph.phone, ph.is_default || 0, new Date().toISOString()]);
    }
    pharStmt.free();
  } catch (e) {
    console.log("No existing pharmacies to migrate.");
  }

  // 7. Fetch and Migrate Diagnostic Centers (if exists)
  try {
    const centers = queryRows("SELECT * FROM diagnostic_centers");
    const ctrStmt = db.prepare(`
      INSERT INTO diagnostic_centers_new (id, name, address, phone, is_default, updated_at, deleted)
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `);
    for (const c of centers) {
      const uuid = crypto.randomUUID();
      ctrStmt.run([uuid, c.name, c.address, c.phone, c.is_default || 0, new Date().toISOString()]);
    }
    ctrStmt.free();
  } catch (e) {
    console.log("No existing diagnostic centers to migrate.");
  }

  // 8. Swap Tables
  db.run("DROP TABLE IF EXISTS prescriptions");
  db.run("DROP TABLE IF EXISTS diagnostic_tests");
  db.run("DROP TABLE IF EXISTS visits");
  db.run("DROP TABLE IF EXISTS patients");
  db.run("DROP TABLE IF EXISTS pharmacies");
  db.run("DROP TABLE IF EXISTS diagnostic_centers");

  db.run("ALTER TABLE patients_new RENAME TO patients");
  db.run("ALTER TABLE visits_new RENAME TO visits");
  db.run("ALTER TABLE prescriptions_new RENAME TO prescriptions");
  db.run("ALTER TABLE diagnostic_tests_new RENAME TO diagnostic_tests");
  db.run("ALTER TABLE pharmacies_new RENAME TO pharmacies");
  db.run("ALTER TABLE diagnostic_centers_new RENAME TO diagnostic_centers");

  // Re-create indexes
  db.run("CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone)");
  db.run("CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(full_name COLLATE NOCASE)");
  db.run("CREATE INDEX IF NOT EXISTS idx_patients_code ON patients(patient_code)");
  db.run("CREATE INDEX IF NOT EXISTS idx_visits_patient ON visits(patient_id)");
  db.run("CREATE INDEX IF NOT EXISTS idx_visits_date ON visits(visit_date)");
  db.run("CREATE INDEX IF NOT EXISTS idx_rx_visit ON prescriptions(visit_id)");
  db.run("CREATE INDEX IF NOT EXISTS idx_tests_visit ON diagnostic_tests(visit_id)");

  console.log("DocRx: Database migration to version 3 completed successfully!");
}

function runMigrations(db) {
  // Add first_name and last_name if missing (schema update)
  try {
    db.exec("ALTER TABLE settings ADD COLUMN doctor_first_name TEXT DEFAULT ''");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE settings ADD COLUMN doctor_last_name TEXT DEFAULT ''");
  } catch (e) {}
  try {
    db.exec("UPDATE settings SET doctor_first_name = doctor_name WHERE doctor_first_name = ''");
  } catch (e) {}

  try {
    db.exec("ALTER TABLE visits ADD COLUMN fee INTEGER DEFAULT 0");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE visits ADD COLUMN attachment_idb_key TEXT");
  } catch (e) {}

  const row = db.exec("SELECT schema_version FROM settings WHERE id=1");
  if (!row.length || !row[0].values.length) return;
  let version = row[0].values[0][0];
  while (version < SCHEMA_VERSION) {
    version++;
    if (version === 3) {
      try {
        migrateToV3(db);
        db.run(`UPDATE settings SET schema_version=3 WHERE id=1`);
      } catch (e) {
        console.error("Failed to migrate to version 3", e);
      }
    } else if (MIGRATIONS[version]) {
      const statements = MIGRATIONS[version]
        .split(';')
        .map(s => s.trim())
        .filter(Boolean);
      for (const sql of statements) {
        try {
          db.run(sql);
        } catch (e) {
          console.warn(`Migration statement warning (ignored): ${sql}`, e);
        }
      }
      try {
        db.run(`UPDATE settings SET schema_version=${version} WHERE id=1`);
      } catch (e) {}
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
