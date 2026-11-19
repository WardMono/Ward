-- 0001_init.sql
CREATE TABLE folders (
  id           TEXT PRIMARY KEY,
  parent_id    TEXT REFERENCES folders(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  color        TEXT,              -- token name, e.g. 'indigo'
  icon         TEXT,              -- lucide icon name
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);

CREATE TABLE entries (            -- password vault items
  id                   TEXT PRIMARY KEY,
  folder_id            TEXT REFERENCES folders(id) ON DELETE SET NULL,
  title                TEXT NOT NULL,
  username             TEXT,
  password             TEXT,
  url                  TEXT,
  notes                TEXT,
  favorite             INTEGER NOT NULL DEFAULT 0,
  password_changed_at  TEXT,
  last_used_at         TEXT,
  created_at           TEXT NOT NULL,
  updated_at           TEXT NOT NULL,
  deleted_at           TEXT
);
CREATE INDEX idx_entries_folder ON entries(folder_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_entries_fav ON entries(favorite) WHERE deleted_at IS NULL;

CREATE TABLE entry_history (      -- previous passwords, max 10 per entry
  id          TEXT PRIMARY KEY,
  entry_id    TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  password    TEXT NOT NULL,
  changed_at  TEXT NOT NULL
);

CREATE TABLE notes (
  id          TEXT PRIMARY KEY,
  folder_id   TEXT REFERENCES folders(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  body_md     TEXT NOT NULL DEFAULT '',
  pinned      INTEGER NOT NULL DEFAULT 0,
  favorite    INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  deleted_at  TEXT
);

CREATE TABLE tasks (
  id            TEXT PRIMARY KEY,
  folder_id     TEXT REFERENCES folders(id) ON DELETE SET NULL,
  parent_id     TEXT REFERENCES tasks(id) ON DELETE CASCADE,  -- subtasks, one level only
  title         TEXT NOT NULL,
  description   TEXT,
  status        TEXT NOT NULL CHECK (status IN ('todo','doing','done')) DEFAULT 'todo',
  priority      TEXT NOT NULL CHECK (priority IN ('low','medium','high')) DEFAULT 'medium',
  due_at        TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  favorite      INTEGER NOT NULL DEFAULT 0,
  completed_at  TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  deleted_at    TEXT
);

CREATE TABLE income (
  id            TEXT PRIMARY KEY,
  folder_id     TEXT REFERENCES folders(id) ON DELETE SET NULL,
  received_on   TEXT NOT NULL,             -- YYYY-MM-DD
  client        TEXT NOT NULL,
  description   TEXT,
  amount_minor  INTEGER NOT NULL CHECK (amount_minor >= 0),
  currency      TEXT NOT NULL DEFAULT 'PHP',
  category      TEXT,
  status        TEXT NOT NULL CHECK (status IN ('pending','paid')) DEFAULT 'paid',
  reference     TEXT,
  notes         TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  deleted_at    TEXT
);
CREATE INDEX idx_income_date ON income(received_on) WHERE deleted_at IS NULL;

CREATE TABLE settings (
  key    TEXT PRIMARY KEY,
  value  TEXT NOT NULL            -- JSON-encoded
);
