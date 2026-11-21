package main

import (
	"database/sql"
	"strings"
	"time"

	"modernc.org/sqlite"
)

// collationName sorts names case- and tone-insensitively ("Ánh" next to "Anh", not after "Zoe"); SQLite's
// built-in NOCASE only folds ASCII.
const collationName = "NAME_FOLD"

var viBase = func() map[rune]rune {
	m := map[rune]rune{}
	for base, forms := range map[rune]string{
		'a': "àáảãạăằắẳẵặâầấẩẫậ", 'e': "èéẻẽẹêềếểễệ", 'i': "ìíỉĩị", 'o': "òóỏõọôồốổỗộơờớởỡợ",
		'u': "ùúủũụưừứửữự", 'y': "ỳýỷỹỵ", 'd': "đ",
	} {
		for _, r := range forms {
			m[r] = base
		}
	}
	return m
}()

func foldName(s string) string {
	return strings.Map(func(r rune) rune {
		if b, ok := viBase[r]; ok {
			return b
		}
		return r
	}, strings.ToLower(s))
}

func init() {
	sqlite.MustRegisterCollationUtf8(collationName, func(a, b string) int { return strings.Compare(foldName(a), foldName(b)) })
}

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

// PublicMessages returns only enabled messages (filtered in SQL, never client-side), newest first. It
// returns up to limit rows, whether more exist, and the total number of enabled messages. Page either by
// cursor (before = id of the oldest row seen; 0 = from the newest) or by position (offset); the guestbook
// list uses offset so it can size its scrollbar from total and jump to any position.
func (s *Store) PublicMessages(before int64, offset, limit int) ([]Message, bool, int, error) {
	if before <= 0 {
		before = 1<<62 - 1
	}
	var total int
	if err := s.db.QueryRow(`SELECT COUNT(*) FROM messages WHERE enabled=1`).Scan(&total); err != nil {
		return nil, false, 0, err
	}
	rows, err := s.db.Query(`SELECT id,name,message,created_at FROM messages WHERE enabled=1 AND id<? ORDER BY id DESC LIMIT ? OFFSET ?`, before, limit+1, offset)
	if err != nil {
		return nil, false, 0, err
	}
	defer rows.Close()
	out := []Message{}
	for rows.Next() {
		var m Message
		if err := rows.Scan(&m.ID, &m.Name, &m.Message, &m.CreatedAt); err != nil {
			return nil, false, 0, err
		}
		out = append(out, m)
	}
	more := len(out) > limit
	if more {
		out = out[:limit]
	}
	return out, more, total, rows.Err()
}

// MessageQuery is the admin wishes list query. Sort is "date", "name" or "status"; Dir is "asc" or "desc";
// Status is "all", "hidden" or "shown". Offset/Limit page the result (the UI will page it for infinite scroll).
type MessageQuery struct {
	Sort, Dir, Status string
	Offset, Limit     int
}

// MessageCounts are over all wishes, whatever the status filter is.
type MessageCounts struct {
	All    int `json:"all"`
	Shown  int `json:"shown"`
	Hidden int `json:"hidden"`
}

// ListMessages returns one page of wishes. The values in q must already be validated (parseMessageQuery);
// they only ever pick a fixed SQL fragment, never get pasted in. Every order ends in a unique id, so paging
// by offset never repeats or skips a row.
func (s *Store) ListMessages(q MessageQuery) ([]AdminMessage, MessageCounts, error) {
	var c MessageCounts
	if err := s.db.QueryRow(`SELECT COUNT(*), COALESCE(SUM(enabled),0) FROM messages`).Scan(&c.All, &c.Shown); err != nil {
		return nil, c, err
	}
	c.Hidden = c.All - c.Shown
	dir := map[string]string{"asc": "ASC", "desc": "DESC"}[q.Dir]
	order := map[string]string{
		"date":   "id " + dir,
		"name":   "name COLLATE " + collationName + " " + dir + ", id DESC",
		"status": "enabled " + dir + ", id DESC", // asc = hidden first
	}[q.Sort]
	where := map[string]string{"all": "", "hidden": "WHERE enabled=0", "shown": "WHERE enabled=1"}[q.Status]
	rows, err := s.db.Query(`SELECT id,name,message,enabled,created_at FROM messages `+where+` ORDER BY `+order+` LIMIT ? OFFSET ?`, q.Limit, q.Offset)
	if err != nil {
		return nil, c, err
	}
	defer rows.Close()
	out := []AdminMessage{}
	for rows.Next() {
		var m AdminMessage
		if err := rows.Scan(&m.ID, &m.Name, &m.Message.Message, &m.Enabled, &m.CreatedAt); err != nil {
			return nil, c, err
		}
		out = append(out, m)
	}
	return out, c, rows.Err()
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
