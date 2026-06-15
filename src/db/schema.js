// ============================================================
// DocRx — Database Schema & DDL
// ============================================================

export const SCHEMA_VERSION = 2;

export const CREATE_TABLES_SQL = `
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

-- ── settings (single-row config) ────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  id                    INTEGER PRIMARY KEY CHECK (id = 1),
  doctor_name           TEXT    NOT NULL DEFAULT '',
  doctor_qualification  TEXT,
  doctor_reg_number     TEXT    NOT NULL DEFAULT '',
  clinic_name           TEXT,
  clinic_address        TEXT    NOT NULL DEFAULT '',
  clinic_phone          TEXT    NOT NULL DEFAULT '',
  schema_version        INTEGER NOT NULL DEFAULT 1,
  last_backup_at        DATETIME,
  password_hash         TEXT    NOT NULL DEFAULT '',
  password_salt         TEXT    NOT NULL DEFAULT '',
  print_footer_message  TEXT    NOT NULL DEFAULT 'Wishing you a swift and complete recovery. Please take your medications as prescribed.'
);

-- ── patients ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patients (
  id                      INTEGER  PRIMARY KEY AUTOINCREMENT,
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
  created_at              DATETIME NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
CREATE INDEX IF NOT EXISTS idx_patients_name  ON patients(full_name COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_patients_code  ON patients(patient_code);

-- ── visits ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS visits (
  id              INTEGER  PRIMARY KEY AUTOINCREMENT,
  patient_id      INTEGER  NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
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
  updated_at      DATETIME NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_visits_patient  ON visits(patient_id);
CREATE INDEX IF NOT EXISTS idx_visits_date     ON visits(visit_date);

-- ── prescriptions ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prescriptions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  visit_id      INTEGER NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  medicine_name TEXT    NOT NULL,
  dosage        TEXT,
  frequency     TEXT,
  route         TEXT,
  duration      TEXT,
  instructions  TEXT,
  sort_order    INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_rx_visit ON prescriptions(visit_id);

-- ── diagnostic_tests ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS diagnostic_tests (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  visit_id      INTEGER NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  test_name     TEXT    NOT NULL,
  instructions  TEXT,
  urgency       TEXT    DEFAULT 'Routine' CHECK (urgency IN ('Routine','Urgent')),
  result_notes  TEXT,
  result_date   DATE
);
CREATE INDEX IF NOT EXISTS idx_tests_visit ON diagnostic_tests(visit_id);

-- ── medicines (suggestion library) ───────────────────────────
CREATE TABLE IF NOT EXISTS medicines (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  name                  TEXT    UNIQUE NOT NULL,
  default_dosage        TEXT,
  default_frequency     TEXT,
  default_instructions  TEXT,
  default_route         TEXT    DEFAULT 'Oral',
  use_count             INTEGER DEFAULT 0,
  last_used_at          DATETIME,
  is_active             INTEGER DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_medicines_name ON medicines(name COLLATE NOCASE);

-- ── test_catalog ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS test_catalog (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  name                  TEXT    UNIQUE NOT NULL,
  default_instructions  TEXT,
  use_count             INTEGER DEFAULT 0
);

-- ── diagnosis_suggestions ────────────────────────────────────
CREATE TABLE IF NOT EXISTS diagnosis_suggestions (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  name      TEXT    UNIQUE NOT NULL,
  use_count INTEGER DEFAULT 0
);

-- ── pharmacies ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pharmacies (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  address       TEXT,
  phone         TEXT,
  is_default    INTEGER DEFAULT 0
);

-- ── diagnostic_centers ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS diagnostic_centers (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  address       TEXT,
  phone         TEXT,
  is_default    INTEGER DEFAULT 0
);
`;

export const MIGRATIONS = {
  2: `
    ALTER TABLE settings ADD COLUMN print_footer_message TEXT NOT NULL DEFAULT 'Wishing you a swift and complete recovery. Please take your medications as prescribed.';
    
    CREATE TABLE IF NOT EXISTS pharmacies (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT NOT NULL,
      address       TEXT,
      phone         TEXT,
      is_default    INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS diagnostic_centers (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT NOT NULL,
      address       TEXT,
      phone         TEXT,
      is_default    INTEGER DEFAULT 0
    );
  `
};
