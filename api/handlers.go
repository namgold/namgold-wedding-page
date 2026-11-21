package main

import (
	"context"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

type Server struct {
	cfg     Config
	store   *Store
	notify  *Notifier
	access  *Access
	rsvpLim *Limiter
	wishLim *Limiter
	maxBody int64
}

func NewServer(cfg Config, store *Store) *Server {
	return &Server{
		cfg: cfg, store: store, notify: NewNotifier(cfg), access: NewAccess(cfg),
		rsvpLim: NewLimiter(10, 10*time.Minute), // per IP; generous because guests share venue wifi
		wishLim: NewLimiter(10, 10*time.Minute),
		maxBody: 16 << 10,
	}
}

func (s *Server) Routes() http.Handler {
	m := http.NewServeMux()
	m.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) { writeJSON(w, 200, map[string]bool{"ok": true}) })
	m.HandleFunc("GET /api/config", s.config)
	m.HandleFunc("GET /api/messages", s.listMessages)
	m.HandleFunc("POST /api/messages", s.postMessage)
	m.HandleFunc("POST /api/rsvp", s.postRSVP)

	m.HandleFunc("GET /api/admin/me", s.admin(s.me))
	m.HandleFunc("GET /api/admin/messages", s.admin(s.adminMessages))
	m.HandleFunc("PATCH /api/admin/messages/{id}", s.admin(s.adminSetEnabled))
	m.HandleFunc("GET /api/admin/rsvps", s.admin(s.adminRSVPs))
	m.HandleFunc("GET /api/admin/rsvps.csv", s.admin(s.adminRSVPsCSV))
	return noStore(m)
}

func noStore(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		h.ServeHTTP(w, r)
	})
}

func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(v)
}

func fail(w http.ResponseWriter, code int, errCode string) {
	writeJSON(w, code, map[string]string{"error": errCode})
}

// clientIP: nginx forwards the real client in CF-Connecting-IP (set by Cloudflare).
// The api container publishes no host port, so only nginx can reach it. Without the
// header (local tests) fall back to the socket peer.
func clientIP(r *http.Request) string {
	if v := strings.TrimSpace(r.Header.Get("CF-Connecting-IP")); net.ParseIP(v) != nil {
		return v
	}
	h, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return h
}

func (s *Server) decode(w http.ResponseWriter, r *http.Request, v any) bool {
	r.Body = http.MaxBytesReader(w, r.Body, s.maxBody)
	if err := json.NewDecoder(r.Body).Decode(v); err != nil {
		fail(w, 400, "invalid")
		return false
	}
	return true
}

func (s *Server) config(w http.ResponseWriter, r *http.Request) {
	site := ""
	if s.notify.TurnstileEnabled() {
		site = s.cfg.TurnstileSiteKey
	}
	writeJSON(w, 200, map[string]string{"turnstileSiteKey": site})
}

func (s *Server) listMessages(w http.ResponseWriter, r *http.Request) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit < 1 || limit > 50 {
		limit = 50
	}
	before, _ := strconv.ParseInt(r.URL.Query().Get("before"), 10, 64)
	msgs, more, err := s.store.PublicMessages(before, limit)
	if err != nil {
		slog.Error("db_error", "op", "list_messages", "err", err)
		fail(w, 500, "server")
		return
	}
	writeJSON(w, 200, map[string]any{"messages": msgs, "hasMore": more})
}

type messageIn struct {
	Name           string `json:"name"`
	Message        string `json:"message"`
	Website        string `json:"website"` // honeypot: real users never fill it
	TurnstileToken string `json:"turnstileToken"`
}

func (s *Server) postMessage(w http.ResponseWriter, r *http.Request) {
	ip := clientIP(r)
	var in messageIn
	if !s.decode(w, r, &in) {
		return
	}
	if in.Website != "" { // bot: pretend success, store nothing
		slog.Warn("honeypot_hit", "kind", "message", "ip", ip)
		writeJSON(w, 200, map[string]bool{"ok": true})
		return
	}
	if !s.wishLim.Allow(ip) {
		slog.Warn("rate_limited", "kind", "message", "ip", ip)
		fail(w, 429, "rate_limited")
		return
	}
	name, msg := clean(in.Name, false), clean(in.Message, true)
	switch {
	case name == "":
		fail(w, 400, "name_required")
		return
	case msg == "":
		fail(w, 400, "message_required")
		return
	case tooLong(name, maxName), tooLong(msg, maxMessage):
		fail(w, 400, "too_long")
		return
	}
	if !s.notify.VerifyTurnstile(r.Context(), in.TurnstileToken, ip) {
		slog.Warn("captcha_failed", "kind", "message", "ip", ip)
		fail(w, 400, "captcha_failed")
		return
	}
	id, err := s.store.AddMessage(name, msg)
	if err != nil {
		slog.Error("db_error", "op", "add_message", "err", err)
		fail(w, 500, "server")
		return
	}
	slog.Info("message_created", "id", id) // never log names or message text
	s.notify.Telegram(fmt.Sprintf("💌 New wish from %s:\n%s", name, msg))
	writeJSON(w, 200, map[string]bool{"ok": true})
}

type rsvpIn struct {
	Name           string `json:"name"`
	Side           string `json:"side"`
	Place          string `json:"place"`
	Attending      bool   `json:"attending"`
	Guests         int    `json:"guests"`
	Dietary        string `json:"dietary"`
	Message        string `json:"message"`
	Website        string `json:"website"`
	TurnstileToken string `json:"turnstileToken"`
}

func (s *Server) postRSVP(w http.ResponseWriter, r *http.Request) {
	ip := clientIP(r)
	var in rsvpIn
	if !s.decode(w, r, &in) {
		return
	}
	if in.Website != "" {
		slog.Warn("honeypot_hit", "kind", "rsvp", "ip", ip)
		writeJSON(w, 200, map[string]bool{"ok": true})
		return
	}
	if !s.rsvpLim.Allow(ip) {
		slog.Warn("rate_limited", "kind", "rsvp", "ip", ip)
		fail(w, 429, "rate_limited")
		return
	}
	rv := RSVP{
		Name: clean(in.Name, false), Side: in.Side, Place: in.Place, Attending: in.Attending, Guests: in.Guests,
		Dietary: clean(in.Dietary, false), Message: clean(in.Message, true),
	}
	switch {
	case rv.Name == "":
		fail(w, 400, "name_required")
		return
	case rv.Side != "groom" && rv.Side != "bride":
		fail(w, 400, "invalid")
		return
	case rv.Place != "" && !placeRe.MatchString(rv.Place): // empty = page from before places existed
		fail(w, 400, "invalid")
		return
	case tooLong(rv.Name, maxName), tooLong(rv.Dietary, maxDietary), tooLong(rv.Message, maxMessage):
		fail(w, 400, "too_long")
		return
	}
	if rv.Attending {
		if rv.Guests < 1 || rv.Guests > maxGuests {
			fail(w, 400, "invalid")
			return
		}
	} else {
		rv.Guests, rv.Dietary = 0, ""
	}
	if !s.notify.VerifyTurnstile(r.Context(), in.TurnstileToken, ip) {
		slog.Warn("captcha_failed", "kind", "rsvp", "ip", ip)
		fail(w, 400, "captcha_failed")
		return
	}
	id, err := s.store.AddRSVP(rv)
	if err != nil {
		slog.Error("db_error", "op", "add_rsvp", "err", err)
		fail(w, 500, "server")
		return
	}
	slog.Info("rsvp_created", "id", id, "place", rv.Place, "attending", rv.Attending, "guests", rv.Guests)
	status := "can't come"
	if rv.Attending {
		status = fmt.Sprintf("coming, %d guest(s)", rv.Guests)
	}
	s.notify.Telegram(fmt.Sprintf("📝 RSVP from %s (%s side, %s): %s", rv.Name, rv.Side, rv.Place, status))
	writeJSON(w, 200, map[string]bool{"ok": true})
}

// ---- admin ----

type ctxKey struct{}

// admin wraps a handler with Cloudflare Access verification. Mutating requests must
// also come from the same origin.
func (s *Server) admin(h http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !s.access.Configured() {
			slog.Warn("admin_denied", "reason", "not_configured", "path", r.URL.Path)
			fail(w, 503, "admin_not_configured")
			return
		}
		email, err := s.access.Verify(r.Header.Get("Cf-Access-Jwt-Assertion"))
		if err != nil {
			slog.Warn("admin_denied", "reason", "bad_token", "path", r.URL.Path, "ip", clientIP(r))
			fail(w, 403, "forbidden")
			return
		}
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			u, err := url.Parse(r.Header.Get("Origin"))
			if err != nil || u.Host == "" || u.Host != r.Host {
				slog.Warn("admin_denied", "reason", "bad_origin", "path", r.URL.Path, "admin", email)
				fail(w, 403, "forbidden")
				return
			}
		}
		h(w, r.WithContext(context.WithValue(r.Context(), ctxKey{}, email)))
	}
}

func (s *Server) me(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, 200, map[string]string{"email": r.Context().Value(ctxKey{}).(string)})
}

func (s *Server) adminMessages(w http.ResponseWriter, r *http.Request) {
	msgs, err := s.store.AllMessages()
	if err != nil {
		slog.Error("db_error", "op", "admin_list_messages", "err", err)
		fail(w, 500, "server")
		return
	}
	writeJSON(w, 200, map[string]any{"messages": msgs})
}

func (s *Server) adminSetEnabled(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		fail(w, 400, "invalid")
		return
	}
	var in struct {
		Enabled *bool `json:"enabled"`
	}
	if !s.decode(w, r, &in) {
		return
	}
	if in.Enabled == nil {
		fail(w, 400, "invalid")
		return
	}
	ok, err := s.store.SetEnabled(id, *in.Enabled)
	switch {
	case err != nil:
		slog.Error("db_error", "op", "set_enabled", "err", err)
		fail(w, 500, "server")
	case !ok:
		fail(w, 404, "not_found")
	default:
		slog.Info("message_moderated", "id", id, "enabled", *in.Enabled, "admin", r.Context().Value(ctxKey{}))
		writeJSON(w, 200, map[string]bool{"ok": true})
	}
}

func (s *Server) adminRSVPs(w http.ResponseWriter, r *http.Request) {
	list, err := s.store.AllRSVPs()
	if err != nil {
		slog.Error("db_error", "op", "admin_list_rsvps", "err", err)
		fail(w, 500, "server")
		return
	}
	markSuperseded(list)
	sum := rsvpSummary{ByPlace: map[string]*rsvpSummary{}}
	for _, x := range list {
		if x.Superseded {
			continue
		}
		pl := sum.ByPlace[x.Place]
		if pl == nil {
			pl = &rsvpSummary{}
			sum.ByPlace[x.Place] = pl
		}
		sum.add(x)
		pl.add(x)
	}
	writeJSON(w, 200, map[string]any{"rsvps": list, "summary": sum})
}

type rsvpSummary struct {
	Responses int `json:"responses"`
	Attending int `json:"attending"` // responses saying yes
	Guests    int `json:"guests"`    // total heads
	Declined  int `json:"declined"`
	// ByPlace is only set on the overall summary. The key is the place slug ("" = before places existed).
	ByPlace map[string]*rsvpSummary `json:"byPlace,omitempty"`
}

func (s *rsvpSummary) add(x RSVP) {
	s.Responses++
	if x.Attending {
		s.Attending++
		s.Guests += x.Guests
	} else {
		s.Declined++
	}
}

// markSuperseded implements "latest response per name, side and place wins" (one guest can be invited to
// more than one party, so a response for another place does not replace it). list is newest first.
func markSuperseded(list []RSVP) {
	seen := map[string]bool{}
	for i := range list {
		k := strings.ToLower(strings.Join(strings.Fields(list[i].Name), " ")) + "|" + list[i].Side + "|" + list[i].Place
		list[i].Superseded = seen[k]
		seen[k] = true
	}
}

// csvSafe neutralises spreadsheet formula injection from guest-supplied text.
func csvSafe(s string) string {
	if s != "" && strings.ContainsRune("=+-@\t\r", rune(s[0])) {
		return "'" + s
	}
	return s
}

func (s *Server) adminRSVPsCSV(w http.ResponseWriter, r *http.Request) {
	list, err := s.store.AllRSVPs()
	if err != nil {
		fail(w, 500, "server")
		return
	}
	markSuperseded(list)
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", `attachment; filename="rsvps.csv"`)
	w.Write([]byte("\xef\xbb\xbf")) // BOM so Excel reads UTF-8 (Vietnamese) correctly
	cw := csv.NewWriter(w)
	cw.Write([]string{"id", "created_at_utc", "name", "side", "place", "attending", "guests", "dietary", "message", "superseded"})
	for _, x := range list {
		cw.Write([]string{
			strconv.FormatInt(x.ID, 10), time.Unix(x.CreatedAt, 0).UTC().Format(time.RFC3339),
			csvSafe(x.Name), x.Side, x.Place, strconv.FormatBool(x.Attending), strconv.Itoa(x.Guests),
			csvSafe(x.Dietary), csvSafe(x.Message), strconv.FormatBool(x.Superseded),
		})
	}
	cw.Flush()
}
