package main

import (
	"crypto"
	"crypto/rsa"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"math/big"
	"net/http"
	"slices"
	"strings"
	"sync"
	"time"
)

// Access verifies the Cf-Access-Jwt-Assertion header that Cloudflare Access adds
// after the user logged in. It is stdlib only. Admin endpoints fail closed: when the
// team domain or AUD is not configured, nothing is accepted.
type Access struct {
	team, aud string
	emails    []string
	certsURL  string
	client    *http.Client
	now       func() time.Time

	mu      sync.Mutex
	keys    map[string]*rsa.PublicKey
	fetched time.Time
}

func NewAccess(cfg Config) *Access {
	return &Access{
		team:     cfg.AccessTeam,
		aud:      cfg.AccessAUD,
		emails:   cfg.AdminEmails,
		certsURL: "https://" + cfg.AccessTeam + "/cdn-cgi/access/certs",
		client:   &http.Client{Timeout: 5 * time.Second},
		now:      time.Now,
	}
}

func (a *Access) Configured() bool { return a.team != "" && a.aud != "" }

var errUnauthorized = errors.New("unauthorized")

// Verify returns the authenticated email.
func (a *Access) Verify(token string) (string, error) {
	if !a.Configured() {
		return "", errors.New("access not configured")
	}
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return "", errUnauthorized
	}
	var hdr struct{ Alg, Kid string }
	if err := decodeJSON(parts[0], &hdr); err != nil || hdr.Alg != "RS256" || hdr.Kid == "" {
		return "", errUnauthorized // rejects alg=none and anything but RS256
	}
	key, err := a.key(hdr.Kid)
	if err != nil {
		return "", errUnauthorized
	}
	sig, err := base64.RawURLEncoding.DecodeString(parts[2])
	if err != nil {
		return "", errUnauthorized
	}
	sum := sha256.Sum256([]byte(parts[0] + "." + parts[1]))
	if rsa.VerifyPKCS1v15(key, crypto.SHA256, sum[:], sig) != nil {
		return "", errUnauthorized
	}
	var c struct {
		Aud   audList `json:"aud"`
		Iss   string  `json:"iss"`
		Exp   int64   `json:"exp"`
		Nbf   int64   `json:"nbf"`
		Email string  `json:"email"`
	}
	if err := decodeJSON(parts[1], &c); err != nil {
		return "", errUnauthorized
	}
	now := a.now().Unix()
	const leeway = 30
	if c.Exp == 0 || now > c.Exp+leeway || (c.Nbf != 0 && now+leeway < c.Nbf) {
		return "", errUnauthorized
	}
	if c.Iss != "https://"+a.team || !slices.Contains(c.Aud, a.aud) || c.Email == "" {
		return "", errUnauthorized
	}
	email := strings.ToLower(c.Email)
	if len(a.emails) > 0 && !slices.Contains(a.emails, email) {
		return "", errUnauthorized
	}
	return email, nil
}

// audList accepts "aud" as either a string or an array of strings.
type audList []string

func (l *audList) UnmarshalJSON(b []byte) error {
	var s string
	if json.Unmarshal(b, &s) == nil {
		*l = []string{s}
		return nil
	}
	var ss []string
	if err := json.Unmarshal(b, &ss); err != nil {
		return err
	}
	*l = ss
	return nil
}

func decodeJSON(seg string, v any) error {
	b, err := base64.RawURLEncoding.DecodeString(seg)
	if err != nil {
		return err
	}
	return json.Unmarshal(b, v)
}

// key returns the signing key for kid, refreshing the cached JWKS when the kid is
// unknown (at most once a minute) or the cache is older than an hour.
func (a *Access) key(kid string) (*rsa.PublicKey, error) {
	a.mu.Lock()
	defer a.mu.Unlock()
	age := a.now().Sub(a.fetched)
	if k, ok := a.keys[kid]; ok && age < time.Hour {
		return k, nil
	}
	if a.keys == nil || age > time.Minute {
		if err := a.refresh(); err != nil {
			if k, ok := a.keys[kid]; ok {
				return k, nil // stale key beats locking the admin out
			}
			return nil, err
		}
	}
	if k, ok := a.keys[kid]; ok {
		return k, nil
	}
	return nil, errors.New("unknown kid")
}

func (a *Access) refresh() error {
	resp, err := a.client.Get(a.certsURL)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return fmt.Errorf("certs: status %d", resp.StatusCode)
	}
	var jwks struct {
		Keys []struct{ Kid, Kty, N, E string } `json:"keys"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(nil, resp.Body, 1<<20)).Decode(&jwks); err != nil {
		return err
	}
	keys := map[string]*rsa.PublicKey{}
	for _, k := range jwks.Keys {
		if k.Kty != "RSA" {
			continue
		}
		n, err1 := base64.RawURLEncoding.DecodeString(k.N)
		e, err2 := base64.RawURLEncoding.DecodeString(k.E)
		if err1 != nil || err2 != nil {
			continue
		}
		keys[k.Kid] = &rsa.PublicKey{N: new(big.Int).SetBytes(n), E: int(new(big.Int).SetBytes(e).Int64())}
	}
	if len(keys) == 0 {
		return errors.New("certs: no usable keys")
	}
	a.keys, a.fetched = keys, a.now()
	return nil
}
