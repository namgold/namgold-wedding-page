package main

import (
	"database/sql"
	"time"

	_ "modernc.org/sqlite"
)

type Store struct{ db *sql.DB }

type Message struct {
	ID        int64  `json:"id"`
	Name      string `json:"name"`
	Message   string `json:"message"`
	CreatedAt int64  `json:"createdAt"` // unix seconds, UTC
}

type AdminMessage struct {
	Message
	Enabled bool `json:"enabled"`
}

type RSVP struct {
	ID        int64  `json:"id"`
	Name      string `json:"name"`
	Side      string `json:"side"`  // "groom" | "bride"
	Place     string `json:"place"` // which party page it came from ("" for rows from before places existed)
	Attending bool   `json:"attending"`
	Guests    int    `json:"guests"`
	Dietary   string `json:"dietary"`
	Message   string `json:"message"`
	CreatedAt int64  `json:"createdAt"`
	// Superseded is computed, not stored: a later response from the same name, side and place replaces this one.
	Superseded bool `json:"superseded"`
}

const schema = `
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_enabled_id ON messages(enabled, id DESC);
CREATE TABLE IF NOT EXISTS rsvps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  side TEXT NOT NULL,
  place TEXT NOT NULL DEFAULT '',
  attending INTEGER NOT NULL,
  guests INTEGER NOT NULL,
  dietary TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);`

func OpenStore(path string) (*Store, error) {
	dsn := "file:" + path + "?_pragma=busy_timeout(5000)&_pragma=journal_mode(WAL)&_pragma=synchronous(NORMAL)"
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(1) // single connection: no writer contention on a tiny workload
	if _, err := db.Exec(schema); err != nil {
		db.Close()
		return nil, err
	}
	if err := migrate(db); err != nil {
		db.Close()
		return nil, err
	}
	return &Store{db: db}, nil
}

// migrate upgrades a database created by an older version. CREATE TABLE IF NOT EXISTS does not
// touch an existing table, so columns added later must be added here (non-destructive).
func migrate(db *sql.DB) error {
	rows, err := db.Query(`PRAGMA table_info(rsvps)`)
	if err != nil {
		return err
	}
	hasPlace := false
	for rows.Next() {
		var cid, notnull, pk int
		var name, typ string
		var dflt sql.NullString
		if err := rows.Scan(&cid, &name, &typ, &notnull, &dflt, &pk); err != nil {
			rows.Close()
			return err
		}
		if name == "place" {
			hasPlace = true
		}
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return err
	}
	rows.Close()
	if !hasPlace {
		_, err = db.Exec(`ALTER TABLE rsvps ADD COLUMN place TEXT NOT NULL DEFAULT ''`)
	}
	return err
}

func (s *Store) Close() error { return s.db.Close() }

func (s *Store) AddMessage(name, msg string) (int64, error) {
	r, err := s.db.Exec(`INSERT INTO messages(name,message,created_at) VALUES(?,?,?)`, name, msg, time.Now().Unix())
	if err != nil {
		return 0, err
	}
	return r.LastInsertId()
}

// PublicMessages returns only enabled messages (filtered in SQL, never client-side),
// newest first. before=0 means from the newest. It returns up to limit rows and
// whether more exist.
func (s *Store) PublicMessages(before int64, limit int) ([]Message, bool, error) {
	if before <= 0 {
		before = 1<<62 - 1
	}
	rows, err := s.db.Query(`SELECT id,name,message,created_at FROM messages WHERE enabled=1 AND id<? ORDER BY id DESC LIMIT ?`, before, limit+1)
	if err != nil {
		return nil, false, err
	}
	defer rows.Close()
	out := []Message{}
	for rows.Next() {
		var m Message
		if err := rows.Scan(&m.ID, &m.Name, &m.Message, &m.CreatedAt); err != nil {
			return nil, false, err
		}
		out = append(out, m)
	}
	more := len(out) > limit
	if more {
		out = out[:limit]
	}
	return out, more, rows.Err()
}

func (s *Store) AllMessages() ([]AdminMessage, error) {
	rows, err := s.db.Query(`SELECT id,name,message,enabled,created_at FROM messages ORDER BY id DESC LIMIT 1000`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []AdminMessage{}
	for rows.Next() {
		var m AdminMessage
		if err := rows.Scan(&m.ID, &m.Name, &m.Message.Message, &m.Enabled, &m.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}

// SetEnabled reports whether a row with that id exists.
func (s *Store) SetEnabled(id int64, enabled bool) (bool, error) {
	r, err := s.db.Exec(`UPDATE messages SET enabled=? WHERE id=?`, enabled, id)
	if err != nil {
		return false, err
	}
	n, _ := r.RowsAffected()
	return n > 0, nil
}

// DeleteMessage and DeleteRSVP permanently remove a row and report whether it existed.
func (s *Store) DeleteMessage(id int64) (bool, error) { return s.deleteRow(`messages`, id) }
func (s *Store) DeleteRSVP(id int64) (bool, error)    { return s.deleteRow(`rsvps`, id) }

func (s *Store) deleteRow(table string, id int64) (bool, error) {
	r, err := s.db.Exec(`DELETE FROM `+table+` WHERE id=?`, id)
	if err != nil {
		return false, err
	}
	n, _ := r.RowsAffected()
	return n > 0, nil
}

func (s *Store) AddRSVP(r RSVP) (int64, error) {
	res, err := s.db.Exec(`INSERT INTO rsvps(name,side,place,attending,guests,dietary,message,created_at) VALUES(?,?,?,?,?,?,?,?)`,
		r.Name, r.Side, r.Place, r.Attending, r.Guests, r.Dietary, r.Message, time.Now().Unix())
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func (s *Store) AllRSVPs() ([]RSVP, error) {
	rows, err := s.db.Query(`SELECT id,name,side,place,attending,guests,dietary,message,created_at FROM rsvps ORDER BY id DESC LIMIT 2000`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []RSVP{}
	for rows.Next() {
		var r RSVP
		if err := rows.Scan(&r.ID, &r.Name, &r.Side, &r.Place, &r.Attending, &r.Guests, &r.Dietary, &r.Message, &r.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}
