-- 0002_fts.sql
-- External-content FTS5. Entry passwords and entry_history are not columns here.
CREATE VIRTUAL TABLE entries_fts USING fts5(
  title,
  username,
  url,
  content='entries',
  content_rowid='rowid'
);

CREATE TRIGGER entries_fts_insert AFTER INSERT ON entries BEGIN
  INSERT INTO entries_fts(rowid, title, username, url)
  VALUES (new.rowid, new.title, new.username, new.url);
END;
CREATE TRIGGER entries_fts_delete AFTER DELETE ON entries BEGIN
  INSERT INTO entries_fts(entries_fts, rowid, title, username, url)
  VALUES ('delete', old.rowid, old.title, old.username, old.url);
END;
CREATE TRIGGER entries_fts_update AFTER UPDATE ON entries BEGIN
  INSERT INTO entries_fts(entries_fts, rowid, title, username, url)
  VALUES ('delete', old.rowid, old.title, old.username, old.url);
  INSERT INTO entries_fts(rowid, title, username, url)
  VALUES (new.rowid, new.title, new.username, new.url);
END;

CREATE VIRTUAL TABLE notes_fts USING fts5(
  title,
  body_md,
  content='notes',
  content_rowid='rowid'
);

CREATE TRIGGER notes_fts_insert AFTER INSERT ON notes BEGIN
  INSERT INTO notes_fts(rowid, title, body_md)
  VALUES (new.rowid, new.title, new.body_md);
END;
CREATE TRIGGER notes_fts_delete AFTER DELETE ON notes BEGIN
  INSERT INTO notes_fts(notes_fts, rowid, title, body_md)
  VALUES ('delete', old.rowid, old.title, old.body_md);
END;
CREATE TRIGGER notes_fts_update AFTER UPDATE ON notes BEGIN
  INSERT INTO notes_fts(notes_fts, rowid, title, body_md)
  VALUES ('delete', old.rowid, old.title, old.body_md);
  INSERT INTO notes_fts(rowid, title, body_md)
  VALUES (new.rowid, new.title, new.body_md);
END;

CREATE VIRTUAL TABLE tasks_fts USING fts5(
  title,
  description,
  content='tasks',
  content_rowid='rowid'
);

CREATE TRIGGER tasks_fts_insert AFTER INSERT ON tasks BEGIN
  INSERT INTO tasks_fts(rowid, title, description)
  VALUES (new.rowid, new.title, new.description);
END;
CREATE TRIGGER tasks_fts_delete AFTER DELETE ON tasks BEGIN
  INSERT INTO tasks_fts(tasks_fts, rowid, title, description)
  VALUES ('delete', old.rowid, old.title, old.description);
END;
CREATE TRIGGER tasks_fts_update AFTER UPDATE ON tasks BEGIN
  INSERT INTO tasks_fts(tasks_fts, rowid, title, description)
  VALUES ('delete', old.rowid, old.title, old.description);
  INSERT INTO tasks_fts(rowid, title, description)
  VALUES (new.rowid, new.title, new.description);
END;

CREATE VIRTUAL TABLE income_fts USING fts5(
  client,
  description,
  content='income',
  content_rowid='rowid'
);

CREATE TRIGGER income_fts_insert AFTER INSERT ON income BEGIN
  INSERT INTO income_fts(rowid, client, description)
  VALUES (new.rowid, new.client, new.description);
END;
CREATE TRIGGER income_fts_delete AFTER DELETE ON income BEGIN
  INSERT INTO income_fts(income_fts, rowid, client, description)
  VALUES ('delete', old.rowid, old.client, old.description);
END;
CREATE TRIGGER income_fts_update AFTER UPDATE ON income BEGIN
  INSERT INTO income_fts(income_fts, rowid, client, description)
  VALUES ('delete', old.rowid, old.client, old.description);
  INSERT INTO income_fts(rowid, client, description)
  VALUES (new.rowid, new.client, new.description);
END;

INSERT INTO entries_fts(entries_fts) VALUES ('rebuild');
INSERT INTO notes_fts(notes_fts) VALUES ('rebuild');
INSERT INTO tasks_fts(tasks_fts) VALUES ('rebuild');
INSERT INTO income_fts(income_fts) VALUES ('rebuild');
