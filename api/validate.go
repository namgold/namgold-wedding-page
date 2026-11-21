package main

import (
	"regexp"
	"strings"
	"unicode"
	"unicode/utf8"
)

const (
	maxName    = 60
	maxMessage = 500
	maxDietary = 200
	maxGuests  = 10
)

// clean normalises user text: trims, drops control characters (keeping newlines
// when multiline), and collapses runs of blank lines. Lengths are counted in
// runes, so Vietnamese diacritics are not penalised.
func clean(s string, multiline bool) string {
	s = strings.ReplaceAll(s, "\r\n", "\n")
	var b strings.Builder
	for _, r := range s {
		switch {
		case r == '\n' && multiline:
			b.WriteRune('\n')
		case r == '\n' || r == '\t':
			b.WriteRune(' ')
		case unicode.IsControl(r) || r == '‎' || r == '‏' || r == '‮' || r == '⁦' || r == '⁧' || r == '⁨' || r == '⁩':
			// drop (includes bidi override characters)
		default:
			b.WriteRune(r)
		}
	}
	out := strings.TrimSpace(b.String())
	for strings.Contains(out, "\n\n\n") {
		out = strings.ReplaceAll(out, "\n\n\n", "\n\n")
	}
	return out
}

// placeRe is the shape of a place slug (the page URL segment). Shape only, not an allow-list: slugs live in
// the frontend, and an allow-list that drifted from it would silently reject real RSVPs.
var placeRe = regexp.MustCompile(`^[a-z0-9-]{1,40}$`)

func tooLong(s string, max int) bool { return utf8.RuneCountInString(s) > max }
