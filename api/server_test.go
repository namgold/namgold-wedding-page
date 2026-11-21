package main

import (
	"bytes"
	"crypto"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

const team = "test.cloudflareaccess.com"
const aud = "aud-123"

type testEnv struct {
	srv  *Server
	h    http.Handler
	key  *rsa.PrivateKey
	jwks *httptest.Server
}

func b64(b []byte) string { return base64.RawURLEncoding.EncodeToString(b) }

func newEnv(t *testing.T, mutate func(*Config)) *testEnv {
	t.Helper()
	key, _ := rsa.GenerateKey(rand.Reader, 2048)
	jwks := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(map[string]any{"keys": []map[string]string{{
			"kid": "k1", "kty": "RSA",
			"n": b64(key.N.Bytes()), "e": b64([]byte{1, 0, 1}),
		}}})
	}))
	t.Cleanup(jwks.Close)
	cfg := Config{DBPath: filepath.Join(t.TempDir(), "t.db"), AccessTeam: team, AccessAUD: aud}
	if mutate != nil {
		mutate(&cfg)
	}
	st, err := OpenStore(cfg.DBPath)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { st.Close() })
	s := NewServer(cfg, st)
	s.access.certsURL = jwks.URL
	return &testEnv{srv: s, h: s.Routes(), key: key, jwks: jwks}
}

func (e *testEnv) token(claims map[string]any, alg string) string {
	hdr := b64([]byte(`{"alg":"` + alg + `","kid":"k1"}`))
	cb, _ := json.Marshal(claims)
	signing := hdr + "." + b64(cb)
	if alg != "RS256" {
		return signing + "."
	}
	sum := sha256.Sum256([]byte(signing))
	sig, _ := rsa.SignPKCS1v15(rand.Reader, e.key, crypto.SHA256, sum[:])
	return signing + "." + b64(sig)
}

func (e *testEnv) goodClaims() map[string]any {
	return map[string]any{"aud": []string{aud}, "iss": "https://" + team, "exp": time.Now().Add(time.Hour).Unix(), "email": "Owner@example.com"}
}

func (e *testEnv) do(method, path, body string, hdr map[string]string) *httptest.ResponseRecorder {
	r := httptest.NewRequest(method, path, strings.NewReader(body))
	r.Host = "wedding.test"
	for k, v := range hdr {
		r.Header.Set(k, v)
	}
	w := httptest.NewRecorder()
	e.h.ServeHTTP(w, r)
	return w
}

func TestMessagesFlow(t *testing.T) {
	e := newEnv(t, nil)
	w := e.do("POST", "/api/messages", `{"name":"  Nguyễn Văn A  ","message":"Chúc mừng hạnh phúc 💐"}`, nil)
	if w.Code != 200 {
		t.Fatalf("post: %d %s", w.Code, w.Body)
	}
	w = e.do("GET", "/api/messages", "", nil)
	var out struct {
		Messages []Message `json:"messages"`
		HasMore  bool      `json:"hasMore"`
	}
	json.Unmarshal(w.Body.Bytes(), &out)
	if len(out.Messages) != 1 || out.Messages[0].Name != "Nguyễn Văn A" {
		t.Fatalf("list: %s", w.Body)
	}
	// hide it server-side: it must vanish from the public list and not be leaked
	e.srv.store.SetEnabled(out.Messages[0].ID, false)
	w = e.do("GET", "/api/messages", "", nil)
	if strings.Contains(w.Body.String(), "Chúc mừng") {
		t.Fatalf("hidden message leaked: %s", w.Body)
	}
}

func TestMessageValidation(t *testing.T) {
	e := newEnv(t, nil)
	long := strings.Repeat("ệ", 500) // 500 runes, 1500 bytes: must be accepted
	if w := e.do("POST", "/api/messages", `{"name":"A","message":"`+long+`"}`, nil); w.Code != 200 {
		t.Fatalf("500 runes rejected: %d %s", w.Code, w.Body)
	}
	cases := map[string]string{
		`{"name":"","message":"x"}`:                                "name_required",
		`{"name":"A","message":"   "}`:                             "message_required",
		`{"name":"A","message":"` + long + `x"}`:                   "too_long",
		`{"name":"` + strings.Repeat("a", 61) + `","message":"x"}`: "too_long",
		`not json`: "invalid",
	}
	for body, want := range cases {
		w := e.do("POST", "/api/messages", body, nil)
		if w.Code != 400 || !strings.Contains(w.Body.String(), want) {
			t.Errorf("%.40s: got %d %s, want %s", body, w.Code, w.Body, want)
		}
	}
	if w := e.do("POST", "/api/messages", `{"name":"A","message":"`+strings.Repeat("x", 20000)+`"}`, nil); w.Code != 400 {
		t.Errorf("oversize body: %d", w.Code)
	}
}

func TestHoneypotStoresNothing(t *testing.T) {
	e := newEnv(t, nil)
	w := e.do("POST", "/api/messages", `{"name":"bot","message":"spam","website":"http://x"}`, nil)
	if w.Code != 200 {
		t.Fatalf("honeypot: %d", w.Code)
	}
	list, _ := e.srv.store.AllMessages()
	if len(list) != 0 {
		t.Fatalf("honeypot stored a row")
	}
}

func TestRateLimitPerCFIP(t *testing.T) {
	e := newEnv(t, nil)
	post := func(ip string) int {
		return e.do("POST", "/api/messages", `{"name":"A","message":"hi"}`, map[string]string{"CF-Connecting-IP": ip}).Code
	}
	for i := 0; i < 10; i++ {
		if c := post("1.2.3.4"); c != 200 {
			t.Fatalf("req %d: %d", i, c)
		}
	}
	if c := post("1.2.3.4"); c != 429 {
		t.Fatalf("11th: %d, want 429", c)
	}
	if c := post("5.6.7.8"); c != 200 {
		t.Fatalf("other ip blocked: %d", c)
	}
}

func TestRSVP(t *testing.T) {
	e := newEnv(t, nil)
	ok := `{"name":"Lan","side":"bride","attending":true,"guests":3,"dietary":"vegan","message":"yay"}`
	if w := e.do("POST", "/api/rsvp", ok, nil); w.Code != 200 {
		t.Fatalf("%d %s", w.Code, w.Body)
	}
	// declined: guests/dietary are zeroed
	e.do("POST", "/api/rsvp", `{"name":"Bao","side":"groom","attending":false,"guests":5,"dietary":"x"}`, nil)
	list, _ := e.srv.store.AllRSVPs()
	if len(list) != 2 || list[0].Guests != 0 || list[0].Dietary != "" || list[1].Guests != 3 {
		t.Fatalf("rows: %+v", list)
	}
	for _, body := range []string{
		`{"name":"A","side":"nope","attending":true,"guests":1}`,
		`{"name":"A","side":"bride","attending":true,"guests":0}`,
		`{"name":"A","side":"bride","attending":true,"guests":11}`,
	} {
		if w := e.do("POST", "/api/rsvp", body, nil); w.Code != 400 {
			t.Errorf("%s: %d", body, w.Code)
		}
	}
}

func TestTurnstile(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		r.ParseForm()
		json.NewEncoder(w).Encode(map[string]bool{"success": r.Form.Get("response") == "good" && r.Form.Get("secret") == "sek"})
	}))
	defer ts.Close()
	e := newEnv(t, func(c *Config) { c.TurnstileSecret, c.TurnstileSiteKey = "sek", "site" })
	e.srv.notify.turnstileURL = ts.URL
	if w := e.do("POST", "/api/messages", `{"name":"A","message":"x"}`, nil); w.Code != 400 {
		t.Errorf("no token: %d", w.Code)
	}
	if w := e.do("POST", "/api/messages", `{"name":"A","message":"x","turnstileToken":"bad"}`, nil); w.Code != 400 {
		t.Errorf("bad token: %d", w.Code)
	}
	if w := e.do("POST", "/api/messages", `{"name":"A","message":"x","turnstileToken":"good"}`, nil); w.Code != 200 {
		t.Errorf("good token: %d", w.Code)
	}
	if w := e.do("GET", "/api/config", "", nil); !strings.Contains(w.Body.String(), `"site"`) {
		t.Errorf("config: %s", w.Body)
	}
}

func TestAdminFailsClosedWhenUnconfigured(t *testing.T) {
	e := newEnv(t, func(c *Config) { c.AccessTeam, c.AccessAUD = "", "" })
	for _, p := range []string{"/api/admin/me", "/api/admin/messages", "/api/admin/rsvps", "/api/admin/rsvps.csv"} {
		if w := e.do("GET", p, "", map[string]string{"Cf-Access-Jwt-Assertion": "anything"}); w.Code != 503 {
			t.Errorf("%s: %d, want 503", p, w.Code)
		}
	}
}

func TestAdminAuth(t *testing.T) {
	e := newEnv(t, nil)
	get := func(tok string) int {
		return e.do("GET", "/api/admin/me", "", map[string]string{"Cf-Access-Jwt-Assertion": tok}).Code
	}
	if c := get(e.token(e.goodClaims(), "RS256")); c != 200 {
		t.Fatalf("good token: %d", c)
	}
	if c := e.do("GET", "/api/admin/me", "", nil).Code; c != 403 {
		t.Errorf("no jwt: %d", c)
	}
	if c := get(e.token(e.goodClaims(), "none")); c != 403 {
		t.Errorf("alg none: %d", c)
	}
	if c := get(e.token(e.goodClaims(), "HS256")); c != 403 {
		t.Errorf("alg HS256: %d", c)
	}
	mod := func(k string, v any) string {
		c := e.goodClaims()
		c[k] = v
		return e.token(c, "RS256")
	}
	if c := get(mod("aud", []string{"other"})); c != 403 {
		t.Errorf("wrong aud: %d", c)
	}
	if c := get(mod("iss", "https://evil.example")); c != 403 {
		t.Errorf("wrong iss: %d", c)
	}
	if c := get(mod("exp", time.Now().Add(-time.Hour).Unix())); c != 403 {
		t.Errorf("expired: %d", c)
	}
	// tampered payload keeps the old signature
	tok := e.token(e.goodClaims(), "RS256")
	p := strings.Split(tok, ".")
	forged := p[0] + "." + b64([]byte(`{"aud":["`+aud+`"],"iss":"https://`+team+`","exp":9999999999,"email":"evil@x.com"}`)) + "." + p[2]
	if c := get(forged); c != 403 {
		t.Errorf("forged: %d", c)
	}
}

func TestAdminEmailAllowList(t *testing.T) {
	e := newEnv(t, func(c *Config) { c.AdminEmails = []string{"owner@example.com"} })
	h := map[string]string{"Cf-Access-Jwt-Assertion": e.token(e.goodClaims(), "RS256")}
	if c := e.do("GET", "/api/admin/me", "", h).Code; c != 200 {
		t.Errorf("allowed email (case-insensitive): %d", c)
	}
	c := e.goodClaims()
	c["email"] = "stranger@example.com"
	h = map[string]string{"Cf-Access-Jwt-Assertion": e.token(c, "RS256")}
	if code := e.do("GET", "/api/admin/me", "", h).Code; code != 403 {
		t.Errorf("other email: %d", code)
	}
}

func TestAdminModerationAndExports(t *testing.T) {
	e := newEnv(t, nil)
	id, _ := e.srv.store.AddMessage("A", "hello")
	e.srv.store.AddRSVP(RSVP{Name: "=cmd()", Side: "bride", Attending: true, Guests: 2})
	e.srv.store.AddRSVP(RSVP{Name: "B", Side: "groom"})
	e.srv.store.AddRSVP(RSVP{Name: " b ", Side: "groom", Attending: true, Guests: 4}) // replaces the decline above
	h := map[string]string{"Cf-Access-Jwt-Assertion": e.token(e.goodClaims(), "RS256")}

	// PATCH needs a same-origin Origin header
	patch := `{"enabled":false}`
	if c := e.do("PATCH", "/api/admin/messages/1", patch, h).Code; c != 403 {
		t.Errorf("no origin: %d", c)
	}
	h["Origin"] = "https://evil.example"
	if c := e.do("PATCH", "/api/admin/messages/1", patch, h).Code; c != 403 {
		t.Errorf("cross origin: %d", c)
	}
	h["Origin"] = "https://wedding.test"
	if c := e.do("PATCH", "/api/admin/messages/1", patch, h).Code; c != 200 {
		t.Fatalf("patch: %d", c)
	}
	if c := e.do("PATCH", "/api/admin/messages/999", patch, h).Code; c != 404 {
		t.Errorf("missing id: %d", c)
	}
	if c := e.do("PATCH", "/api/admin/messages/1", `{}`, h).Code; c != 400 {
		t.Errorf("no field: %d", c)
	}
	_ = id
	pub := e.do("GET", "/api/messages", "", nil).Body.String()
	if strings.Contains(pub, "hello") {
		t.Errorf("hidden message public: %s", pub)
	}
	adm := e.do("GET", "/api/admin/messages", "", h).Body.String()
	if !strings.Contains(adm, `"enabled":false`) || !strings.Contains(adm, "hello") {
		t.Errorf("admin list: %s", adm)
	}
	sum := e.do("GET", "/api/admin/rsvps", "", h).Body.String()
	if !strings.Contains(sum, `"guests":6`) || !strings.Contains(sum, `"declined":0`) || !strings.Contains(sum, `"responses":2`) || !strings.Contains(sum, `"superseded":true`) {
		t.Errorf("summary: %s", sum)
	}
	csv := e.do("GET", "/api/admin/rsvps.csv", "", h).Body.String()
	if !strings.Contains(csv, "'=cmd()") || strings.Contains(csv, ",=cmd()") {
		t.Errorf("csv injection not neutralised: %s", csv)
	}
}

func TestCleanStripsControlAndBidi(t *testing.T) {
	if got := clean("a‮b\x00c\td", false); got != "abc d" {
		t.Errorf("got %q", got)
	}
	if got := clean("x\r\n\n\n\n\ny", true); got != "x\n\ny" {
		t.Errorf("got %q", got)
	}
}

func TestAdminDelete(t *testing.T) {
	e := newEnv(t, nil)
	mid, _ := e.srv.store.AddMessage("A", "hello")
	rid, _ := e.srv.store.AddRSVP(RSVP{Name: "B", Side: "groom", Attending: true, Guests: 2})
	h := map[string]string{"Cf-Access-Jwt-Assertion": e.token(e.goodClaims(), "RS256")}
	mp, rp := fmt.Sprintf("/api/admin/messages/%d", mid), fmt.Sprintf("/api/admin/rsvps/%d", rid)

	if c := e.do("DELETE", mp, "", nil).Code; c != 403 {
		t.Errorf("no token: %d", c)
	}
	if c := e.do("DELETE", mp, "", h).Code; c != 403 {
		t.Errorf("no origin: %d", c)
	}
	h["Origin"] = "https://wedding.test"
	for _, p := range []string{mp, rp} {
		if c := e.do("DELETE", p, "", h).Code; c != 200 {
			t.Fatalf("delete %s: %d", p, c)
		}
		if c := e.do("DELETE", p, "", h).Code; c != 404 {
			t.Errorf("delete twice %s: %d", p, c)
		}
	}
	if c := e.do("DELETE", "/api/admin/messages/abc", "", h).Code; c != 400 {
		t.Errorf("bad id: %d", c)
	}
	if b := e.do("GET", "/api/admin/messages", "", h).Body.String(); strings.Contains(b, "hello") {
		t.Errorf("message still listed: %s", b)
	}
	if b := e.do("GET", "/api/admin/rsvps", "", h).Body.String(); strings.Contains(b, `"name":"B"`) {
		t.Errorf("rsvp still listed: %s", b)
	}
}

func TestEventsLoggedAsJSONWithoutGuestText(t *testing.T) {
	var buf bytes.Buffer
	old := slog.Default()
	slog.SetDefault(slog.New(slog.NewJSONHandler(&buf, nil)))
	t.Cleanup(func() { slog.SetDefault(old) })

	e := newEnv(t, nil)
	e.do("POST", "/api/messages", `{"name":"SecretName","message":"SecretText"}`, map[string]string{"CF-Connecting-IP": "1.2.3.4"})
	e.do("POST", "/api/messages", `{"name":"bot","message":"x","website":"y"}`, map[string]string{"CF-Connecting-IP": "1.2.3.4"})
	e.do("GET", "/api/admin/me", "", nil)

	var seen = map[string]map[string]any{}
	for _, line := range strings.Split(strings.TrimSpace(buf.String()), "\n") {
		var m map[string]any
		if err := json.Unmarshal([]byte(line), &m); err != nil {
			t.Fatalf("not JSON: %q", line)
		}
		seen[m["msg"].(string)] = m
	}
	if seen["message_created"]["id"] == nil || seen["honeypot_hit"]["ip"] != "1.2.3.4" || seen["admin_denied"]["reason"] != "bad_token" {
		t.Errorf("events: %v", seen)
	}
	if strings.Contains(buf.String(), "SecretName") || strings.Contains(buf.String(), "SecretText") {
		t.Error("guest text leaked into logs")
	}
}

func TestRSVPPlace(t *testing.T) {
	e := newEnv(t, nil)
	post := func(body string) int { return e.do("POST", "/api/rsvp", body, nil).Code }
	if c := post(`{"name":"Lan","side":"bride","place":"nha-trang","attending":true,"guests":2}`); c != 200 {
		t.Fatalf("with place: %d", c)
	}
	if c := post(`{"name":"Lan","side":"bride","attending":true,"guests":2}`); c != 200 { // cached old page: no place
		t.Errorf("without place: %d", c)
	}
	for _, bad := range []string{"Bad Place!", "UPPER", "a/b", strings.Repeat("a", 41)} {
		body, _ := json.Marshal(map[string]any{"name": "X", "side": "bride", "place": bad, "attending": false})
		if c := post(string(body)); c != 400 {
			t.Errorf("place %q accepted: %d", bad, c)
		}
	}
	list, _ := e.srv.store.AllRSVPs()
	if len(list) != 2 || list[1].Place != "nha-trang" || list[0].Place != "" {
		t.Fatalf("rows: %+v", list)
	}
}

func TestSupersedeAndSummaryPerPlace(t *testing.T) {
	e := newEnv(t, nil)
	st := e.srv.store
	st.AddRSVP(RSVP{Name: "Lan", Side: "bride", Place: "nha-trang", Attending: true, Guests: 2}) // replaced below
	st.AddRSVP(RSVP{Name: "Lan", Side: "bride", Place: "sai-gon", Attending: true, Guests: 3})   // other party: kept
	st.AddRSVP(RSVP{Name: " lan ", Side: "bride", Place: "nha-trang", Attending: true, Guests: 4})
	h := map[string]string{"Cf-Access-Jwt-Assertion": e.token(e.goodClaims(), "RS256")}
	body := e.do("GET", "/api/admin/rsvps", "", h).Body.String()
	var out struct {
		Summary struct {
			Responses, Guests int
			ByPlace           map[string]struct{ Responses, Guests int }
		}
	}
	if err := json.Unmarshal([]byte(body), &out); err != nil {
		t.Fatal(err, body)
	}
	s := out.Summary
	if s.Responses != 2 || s.Guests != 7 || s.ByPlace["nha-trang"].Guests != 4 || s.ByPlace["sai-gon"].Guests != 3 || s.ByPlace["nha-trang"].Responses != 1 {
		t.Errorf("summary: %s", body)
	}
	csv := e.do("GET", "/api/admin/rsvps.csv", "", h).Body.String()
	if !strings.Contains(csv, ",name,side,place,attending,") || !strings.Contains(csv, ",bride,sai-gon,true,3,") {
		t.Errorf("csv: %s", csv)
	}
}

// A database created before the place column existed must open, keep its rows, and accept new RSVPs.
func TestMigrationFromOldSchema(t *testing.T) {
	path := filepath.Join(t.TempDir(), "old.db")
	old, err := sql.Open("sqlite", "file:"+path)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := old.Exec(`CREATE TABLE messages (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, message TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 1, created_at INTEGER NOT NULL);
CREATE TABLE rsvps (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, side TEXT NOT NULL, attending INTEGER NOT NULL, guests INTEGER NOT NULL, dietary TEXT NOT NULL DEFAULT '', message TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL);
INSERT INTO rsvps(name,side,attending,guests,created_at) VALUES('Old','groom',1,2,1700000000);`); err != nil {
		t.Fatal(err)
	}
	old.Close()
	for i := 0; i < 2; i++ { // second open: migration must be idempotent
		st, err := OpenStore(path)
		if err != nil {
			t.Fatalf("open %d: %v", i, err)
		}
		if i == 0 {
			if _, err := st.AddRSVP(RSVP{Name: "New", Side: "bride", Place: "lam-dong", Attending: true, Guests: 1}); err != nil {
				t.Fatalf("insert after migration: %v", err)
			}
		}
		list, err := st.AllRSVPs()
		if err != nil || len(list) != 2 || list[0].Place != "lam-dong" || list[1].Name != "Old" || list[1].Place != "" {
			t.Fatalf("open %d rows: %+v err=%v", i, list, err)
		}
		st.Close()
	}
}

func TestTelegramText(t *testing.T) {
	if got, want := wishText("An", "Chúc mừng"), "💌 Lời chúc mới\nTên: An\nLời chúc: Chúc mừng"; got != want {
		t.Errorf("wish: %q", got)
	}
	got := rsvpText(RSVP{Name: "An", Side: "bride", Place: "ceremony", Attending: true, Guests: 3})
	if want := "📝 RSVP mới\nTên: An\nBên: Nhà gái\nĐịa điểm: Tân Hội, Lâm Đồng\nTham dự: Có, 3 người"; got != want {
		t.Errorf("rsvp: %q", got)
	}
	got = rsvpText(RSVP{Name: "B", Side: "groom", Place: "invitation"})
	if want := "📝 RSVP mới\nTên: B\nBên: Nhà trai\nĐịa điểm: Nha Trang\nTham dự: Không thể tham dự"; got != want {
		t.Errorf("rsvp no: %q", got)
	}
	if got := rsvpText(RSVP{Name: "D", Side: "bride", Place: "wedding", Attending: true, Guests: 2}); !strings.Contains(got, "Địa điểm: Hồ Chí Minh\n") {
		t.Errorf("wedding: %q", got)
	}
	if got := rsvpText(RSVP{Name: "C", Side: "bride", Place: "other-x", Attending: true, Guests: 1}); !strings.Contains(got, "Địa điểm: other-x\n") {
		t.Errorf("unknown slug: %q", got)
	}
}

func TestTelegramUsesOneBotPerKind(t *testing.T) {
	type call struct{ path, chat string }
	calls := make(chan call, 4)
	tg := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		r.ParseForm()
		calls <- call{r.URL.Path, r.Form.Get("chat_id")}
	}))
	defer tg.Close()
	e := newEnv(t, func(c *Config) {
		c.TelegramWishToken, c.TelegramWishChatID = "wish", "-1"
		c.TelegramRSVPToken, c.TelegramRSVPChatID = "rsvp", "-2"
	})
	e.srv.notify.telegramBase = tg.URL
	e.do("POST", "/api/messages", `{"name":"A","message":"x"}`, nil)
	e.do("POST", "/api/rsvp", `{"name":"A","side":"bride","attending":true,"guests":1}`, nil)
	got := map[string]string{}
	for i := 0; i < 2; i++ {
		select {
		case c := <-calls:
			got[c.path] = c.chat
		case <-time.After(2 * time.Second):
			t.Fatalf("only %d telegram calls: %v", i, got)
		}
	}
	want := map[string]string{"/botwish/sendMessage": "-1", "/botrsvp/sendMessage": "-2"}
	for p, chat := range want {
		if got[p] != chat {
			t.Errorf("%s: chat %q, want %q (calls %v)", p, got[p], chat, got)
		}
	}

	// A kind without its own token sends nothing.
	e2 := newEnv(t, func(c *Config) { c.TelegramRSVPToken, c.TelegramRSVPChatID = "rsvp", "-2" })
	e2.srv.notify.telegramBase = tg.URL
	e2.do("POST", "/api/messages", `{"name":"A","message":"x"}`, nil)
	select {
	case c := <-calls:
		t.Errorf("wish sent without a wish token: %v", c)
	case <-time.After(300 * time.Millisecond):
	}
}
