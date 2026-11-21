package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

func main() {
	// JSON lines on stdout: the log collector (see ~/devbox/logging) turns fields into searchable columns.
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, nil)))

	cfg := LoadConfig()
	store, err := OpenStore(cfg.DBPath)
	if err != nil {
		slog.Error("open_db_failed", "err", err)
		os.Exit(1)
	}
	defer store.Close()

	s := NewServer(cfg, store)
	if !s.notify.TurnstileEnabled() {
		slog.Warn("turnstile_disabled", "note", "TURNSTILE_SECRET not set; forms rely on honeypot + rate limit only")
	}
	if !s.access.Configured() {
		slog.Warn("admin_disabled", "note", "set CF_ACCESS_TEAM_DOMAIN and CF_ACCESS_AUD")
	}
	if cfg.TelegramWishToken == "" || cfg.TelegramWishChatID == "" {
		slog.Info("telegram_wish_disabled")
	}
	if cfg.TelegramRSVPToken == "" || cfg.TelegramRSVPChatID == "" {
		slog.Info("telegram_rsvp_disabled")
	}

	srv := &http.Server{
		Addr: cfg.Addr, Handler: s.Routes(),
		ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 10 * time.Second,
		WriteTimeout: 15 * time.Second, IdleTimeout: 60 * time.Second,
	}
	go func() {
		slog.Info("listening", "addr", cfg.Addr)
		if err := srv.ListenAndServe(); err != http.ErrServerClosed {
			slog.Error("server_failed", "err", err)
			os.Exit(1)
		}
	}()
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGTERM, syscall.SIGINT)
	<-stop
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	srv.Shutdown(ctx)
}
