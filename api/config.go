package main

import (
	"os"
	"strings"
)

// Config comes from environment variables only. Every integration is optional:
// when its variables are unset the feature is skipped (Turnstile, Telegram) or
// fails closed (admin).
type Config struct {
	Addr             string
	DBPath           string
	TurnstileSecret  string
	TurnstileSiteKey string // public; served to the browser via /api/config
	TelegramToken    string
	TelegramChatID   string
	AccessTeam       string // e.g. myteam.cloudflareaccess.com
	AccessAUD        string
	AdminEmails      []string // optional extra allow-list on top of the Access policy
}

func env(k, def string) string {
	if v := strings.TrimSpace(os.Getenv(k)); v != "" {
		return v
	}
	return def
}

func LoadConfig() Config {
	var emails []string
	for _, e := range strings.Split(os.Getenv("ADMIN_EMAILS"), ",") {
		if e = strings.ToLower(strings.TrimSpace(e)); e != "" {
			emails = append(emails, e)
		}
	}
	team := env("CF_ACCESS_TEAM_DOMAIN", "")
	team = strings.TrimPrefix(strings.TrimPrefix(team, "https://"), "http://")
	team = strings.TrimSuffix(team, "/")
	return Config{
		Addr:             env("ADDR", ":8080"),
		DBPath:           env("DB_PATH", "/data/wedding.db"),
		TurnstileSecret:  env("TURNSTILE_SECRET", ""),
		TurnstileSiteKey: env("TURNSTILE_SITE_KEY", ""),
		TelegramToken:    env("TELEGRAM_BOT_TOKEN", ""),
		TelegramChatID:   env("TELEGRAM_CHAT_ID", ""),
		AccessTeam:       team,
		AccessAUD:        env("CF_ACCESS_AUD", ""),
		AdminEmails:      emails,
	}
}
