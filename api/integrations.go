package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// Notifier holds the optional outbound integrations. URLs are fields so tests can
// point them at httptest servers.
type Notifier struct {
	cfg          Config
	client       *http.Client
	turnstileURL string
	telegramBase string
}

func NewNotifier(cfg Config) *Notifier {
	return &Notifier{
		cfg:          cfg,
		client:       &http.Client{Timeout: 5 * time.Second},
		turnstileURL: "https://challenges.cloudflare.com/turnstile/v0/siteverify",
		telegramBase: "https://api.telegram.org",
	}
}

func (n *Notifier) TurnstileEnabled() bool { return n.cfg.TurnstileSecret != "" }

// VerifyTurnstile passes when Turnstile is not configured (honeypot and rate limit
// still apply). When configured it fails closed, including on network errors.
func (n *Notifier) VerifyTurnstile(ctx context.Context, token, ip string) bool {
	if !n.TurnstileEnabled() {
		return true
	}
	if token == "" || len(token) > 4096 {
		return false
	}
	form := url.Values{"secret": {n.cfg.TurnstileSecret}, "response": {token}}
	if ip != "" {
		form.Set("remoteip", ip)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, n.turnstileURL, strings.NewReader(form.Encode()))
	if err != nil {
		return false
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	resp, err := n.client.Do(req)
	if err != nil {
		slog.Warn("turnstile_request_failed", "err", unwrap(err))
		return false
	}
	defer resp.Body.Close()
	var out struct {
		Success bool `json:"success"`
	}
	if json.NewDecoder(http.MaxBytesReader(nil, resp.Body, 1<<16)).Decode(&out) != nil {
		return false
	}
	return out.Success
}

// placeNames labels the known place slugs in notifications only. The page served at
// "/" is the "wedding" one. The API accepts any slug shape, so an unknown slug is
// shown as is.
var placeNames = map[string]string{
	"ceremony":   "Tân Hội, Lâm Đồng",
	"invitation": "Nha Trang",
	"wedding":    "Hồ Chí Minh",
}

func wishText(name, msg string) string {
	return "💌 Lời chúc mới\nTên: " + name + "\nLời chúc: " + msg
}

func rsvpText(rv RSVP) string {
	place := rv.Place
	if place == "" {
		place = "không rõ"
	} else if label, ok := placeNames[place]; ok {
		place = label
	}
	attending := "Không thể tham dự"
	if rv.Attending {
		attending = fmt.Sprintf("Có, %d người", rv.Guests)
	}
	side := map[string]string{"bride": "Nhà gái", "groom": "Nhà trai"}[rv.Side]
	if side == "" {
		side = rv.Side
	}
	return "📝 RSVP mới\nTên: " + rv.Name + "\nBên: " + side + "\nĐịa điểm: " + place + "\nTham dự: " + attending
}

// Telegram sends a plain-text notification as the bot with the given token to the
// given chat, in the background. Best effort: any failure is logged (without the
// URL, which contains the bot token) and ignored. An empty token or chat id turns
// it off.
func (n *Notifier) Telegram(token, chatID, text string) {
	if token == "" || chatID == "" {
		return
	}
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		form := url.Values{"chat_id": {chatID}, "text": {text}, "disable_web_page_preview": {"true"}}
		req, err := http.NewRequestWithContext(ctx, http.MethodPost, n.telegramBase+"/bot"+token+"/sendMessage", strings.NewReader(form.Encode()))
		if err != nil {
			return
		}
		req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
		resp, err := n.client.Do(req)
		if err != nil {
			slog.Warn("telegram_request_failed", "err", unwrap(err))
			return
		}
		resp.Body.Close()
		if resp.StatusCode != 200 {
			slog.Warn("telegram_bad_status", "status", resp.StatusCode)
		}
	}()
}

// unwrap strips the *url.Error wrapper so logs never contain the request URL.
func unwrap(err error) error {
	var ue *url.Error
	if errors.As(err, &ue) {
		return ue.Err
	}
	return err
}
