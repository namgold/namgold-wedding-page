# Wedding page: spec

Design reference: the boho-floral-pink invitation template saved in `temp/origin/index.html` (the owner asked on 2026-11-16 for the frontend to match it: fonts, backgrounds, layout, motion).
The component code and copy are written here; **the floral art (`public/images/floral/`) and gift-box images (`public/images/giftbox/`) are the template vendor's files** (licence unverified, see `DECISIONS.md`). Album and hero photos are still placeholder SVGs.

## Scope
In: Next.js static export frontend, bilingual (VI and EN), 3 place versions, placeholder content, nginx + multi-stage Docker build.
Backend added in a second pass (Go API, SQLite, Turnstile, Telegram, admin page, real RSVP/guestbook submission); see `DECISIONS.md` and `progress.md`. The sections below describe the v1 frontend; RSVP and guestbook are now live forms, not stubs.

## Requirements (owner, 2026-11-16)
Status (2026-11-16): items 1, 3 and 4 are built (item 1 partly, item 4 bank QR only); item 2 is measured but its budget is not met. Decisions and open questions are in `DECISIONS.md`.

1. **UX first, for every age.** The page must be easy to use for anyone, young or elderly. Large readable text, high contrast, big tap targets, simple forms, no hidden gestures. Done: base font 18px; body colour darkened to 5.2:1 on the page background (was 4.2:1, below WCAG AA 4.5:1); small labels are `text-sm` with no opacity fade; lightbox buttons 48px; language toggle 44px or more. Not done: screen-reader pass, real-user check with an older guest, contrast of text over the gradient blobs, the admin page (owner only) still uses small faded text.
2. **Fast on slow networks.** Keep the JS bundle, fonts and images as small as possible. Design for mobile first (about 90% of guests), and also work on desktop. Target network: 3G.
   - Measured 2026-11-16 (first load of `out/wedding.html`): about 751 KB raw, about 314 KB compressed (gzip for text, woff2 as-is; an estimate, not measured on a real link). JS about 587 KB raw / 180 KB gzipped; fonts about 126 KB (3 families); CSS about 26 KB raw. nginx now sets `gzip on` itself, so compression no longer depends on the CDN.
   - Budget: not set yet, so nothing is checked against it (see `DECISIONS.md` open items). Fonts, JS and the music file were not reduced.
   - Real photos must be compressed to webp/avif by hand before they are added (`images.unoptimized` on static export).
   - The 5 MB music file is `preload="none"`, so it does not load until a guest taps play.
3. **Three versions, one per party place.** There are 3 parties: the groom's hometown, the bride's hometown, and where the couple lives. The 3 versions differ only in party info: date, venue, map link and timeline. Everything else is shared: names, families, album, wishes (guestbook), gift box, copy. Each version has its own URL: `/<slug>` (Vietnamese) and `/en/<slug>` (English), chosen by the owner: `/invitation` = groom's family, Nha Trang; `/ceremony` = bride's family, Tan Hoi, Lam Dong; `/wedding` = Ho Chi Minh City. **No central page:** `/` serves the `/wedding` page (owner, 2026-11-21; nginx serves `wedding.html`, the URL stays `/`), `/en` and `/index.html` return 404, and no page links to or mentions another place, so a guest who receives one URL never learns the others exist. Built: per-place data lives in `places` in `src/content/places.ts` (server-only, so other places' details are not in the browser bundle) (date, optional ceremony, venue, address, optional map link, lunar date, timeline per language); everything else is in the shared `wedding` object and the copy files.
4. **Two kinds of QR, not to be mixed up:**
   - **Site QR** (printed on the invitation): opens this website. Make 3 variations, one per place, each pointing to that place's URL (`/invitation`, `/ceremony`, `/wedding` under `https://linhhy.namgold.com`). The QR images are not generated yet.
   - **Bank QR** (in the gift box): optional, **off/on by one switch** the owner can flip: `showBankQr` in `src/content/data.ts` (default `false`, a rebuild flips it). The QR image itself is still the non-scannable placeholder in `components/Qr.tsx`; real QR images are not added yet.

## Decisions for this slice
- Languages: Vietnamese (default) and English. A small toggle switches between them. Vietnamese is at `/<slug>`, English at `/en/<slug>`; `/` serves the wedding page and there is no page at `/en`. Every place has both languages (3 × 2 pages).
- Stack: Next.js (`output: 'export'`, `images.unoptimized`), TypeScript, Tailwind, CSS keyframes, rAF scroll parallax via a `--s` CSS variable. No Framer Motion.
- Page column: centred, max 480px below 768px and 900px from 768px (one CSS variable `--col` in `globals.css`). The area around it is the same blush `#FFFAF7`, with no border (invitation pages only; `/admin` stays white). The EN/VI button (top-left, scrolls away) and the music button (bottom-right, fixed) sit 16px inside the column at every width (`.in-col-left` / `.in-col-right`). Floral art is clipped at the column edge, but where there are side areas (viewport wider than the column) it fades to transparent over the last 40px (`.floral-layer` mask in `globals.css`, width `clamp(0px, (100vw - var(--col))/2, 40px)`; no mask on phones). Fade only, no blur.
- All copy and data live in `src/content/` (typed). Components contain no hardcoded strings.
- Fonts via `next/font/google` (self-hosted at build): Playfair Display, EB Garamond, Ms Madi.
- Lunar date is a hardcoded string in the content file, not computed.
- No countdown and no scroll-reveal (the original template has neither). Parallax is client-only (`--s` set in `components/Floral.tsx`).
- Fonts and colours follow the original: body Baskerville / Times New Roman, section titles Times New Roman bold uppercase, rose `#9D6D63` on `#FFFAF7`.
- Motion honors `prefers-reduced-motion`.

## Per-place config (`src/content/places.ts`, server-only)
Each `Place` has: `slug`, `ceremonyIso?`, `ceremonyName?`, `receptionIso`, `receptionName?`, `receptionDurationMin`, `venueName`, `venueAddress`, `hall?`, `mapUrl?`, `dressCode?`, `lunar`, `schedule`. `L` = `{ vi, en }`.
- `ceremonyName` (lowercase in English; default "Lễ thành hôn" / "wedding ceremony"): currently "Lễ thành hôn" for `/invitation` and `/wedding`, "Lễ vu quy" / "Vu Quy ceremony" for `/ceremony`. Copy strings use the placeholder `{ceremony}` (`announce.sub`, `announce.ceremonyAt`).
- `receptionName` (default "tiệc cưới" / "wedding reception"): "tiệc cưới" for `/invitation` and `/ceremony`, "tiệc báo hỷ" / "wedding celebration" for `/wedding`. Copy strings use `{reception}` (`reception.heading`, `reception.startsAt`, `venue.heldAt`, `eventTitle`); `lib/fill.ts` `withReception()` fills it and capitalises it at the start of a string. Copy objects cross the server/client boundary, so they stay plain strings (no functions).
- `hall` (optional `L`): `/invitation` "Ganesha", `/wedding` "Mercury Tầng 4" / "Mercury 4th Floor"; `/ceremony` has none.
- `dressCode` (optional list of `{ color, vi, en }`, `DressColor`): the swatches and the names joined with " · " under the heading. Omit it to hide the section. Currently all 3 places share `pinkBeigeWhite` (`#ffe6ef`, `#f4ddcd`, `#ffffff`).

## Sections (in order)
1. **Cover:** dark gradient backdrop, falling petals, card with couple names, date, "Open invitation" button (no place label: nothing on the page may hint that other versions exist). Opening reveals the invitation.
2. **Hero** (top of the page): labels "Chú rể" / "Cô dâu" (`hero` in the copy; "Groom" / "Bride" in English) above the short names (`groomShort`, `brideShort` in `data.ts`, placeholders), two tilted polaroid photos (placeholders), floral art behind with parallax.
3. **Families:** two columns, parents' names (`FitText`, shrinks to fit) and address (14px, 16px on desktop).
4. **Announcement:** groom and bride names (EB Garamond, `FitText`) with birth-order labels ("Trưởng nam" / "Trưởng nữ", 14px, 16px on desktop); then, only if the place has a ceremony, ceremony place, time, the date line and the lunar line. Ceremony wording comes from the place's `ceremonyName`.
5. **Album:** coverflow carousel (autoplay 1.4 s while on screen, paused on touch or hover and for guests with reduced motion, swipe, dots, arrows on desktop), lightbox with counter and thumbnails (placeholders).
6. **Reception** (per place): heading, "starts at" line and venue line use the place's `receptionName`; time, the date line, the lunar line, month calendar, "Add to calendar" (.ics, title uses `receptionName`), RSVP button opening a form (`POST /api/rsvp`; the page sends its place slug, the guest does not pick it).
7. **Venue** (per place): venue name (large, bold), optional hall (`Sảnh` / `Hall` + name), address (`Địa chỉ:` / `Address:`), keyless Google Maps embed and a "Directions" link.
   **Dress code** (per place, optional) and **Schedule** (per place and language): timeline; a row marked `ceremony: true` takes its text from the place's `ceremonyName`.
   **Date line** (`components/DateLine.tsx`, used in Announcement and Reception): `CHỦ NHẬT | NGÀY 28 THÁNG 03 NĂM 2027`, bold, one line, 22px shrinking to fit (about 17px at 390px). Wording per language is `dateText` in the copy (`{d}`, `{day}`, `{m}`, `{month}`, `{y}`); English is `SUNDAY | MARCH 28, 2027`. The lunar line below uses the same size, no bold.
8. **Guestbook:** public wishes loaded from `GET /api/messages` (enabled only) + a "Send wishes" form.
9. **Gift box:** open-on-tap, two bank cards (bank, number, holder). The bank QR on each card is optional and shown only when the switch is on (requirement 4). Assumption: switching it off hides the QR images only; the account text stays.
10. **Footer** thank-you line. Floating CD-style music button, shown when `musicSrc` in `src/content/data.ts` is set (currently `/50-nam-ve-sau.mp3`); the cover's Open click starts the music. Music plays only while the page is visible (document.hidden: tab switch, browser hidden, app switch, screen off; a visible but unfocused window keeps playing): when hidden it fades to 0 over 0.5 s and pauses, when visible again it resumes and fades in over 0.5 s (a track the guest paused stays paused; `src/lib/focusFade.ts`, Web Audio gain node so it also works in background tabs and on iOS).

## Acceptance criteria
- `next build` succeeds and produces `out/` with `<slug>.html` and `en/<slug>.html` for each place (nginx maps `/x` to `x.html`; a trailing slash redirects to the page without it).
- Page renders correctly at 390px width, and is usable at desktop width.
- Cover → open → all sections visible; no console errors; no hydration warnings.
- Language toggle works both ways; album carousel and lightbox open and close; the date line stays on one line at 360 to 1280px.
- `prefers-reduced-motion` disables petals, parallax, carousel autoplay and gift-box animations.
- Checked 2026-11-16 (Playwright, 390px, throwaway containers): all 6 place pages return 200 and `/en`, `/index.html` and unknown slugs return 404 (`/` returned 404 then; since 2026-11-21 it serves `/wedding`); each place shows only its own venue and timeline, and its details appear in no other place's files or in the shared JS (grep of the build output); no page links to another place; a place with no ceremony hides the ceremony block; the language toggle keeps the place; RSVP stores its place; the guestbook is shared across places; the gift box has no QR and no QR note with the switch off; no console errors, no horizontal overflow.
- Not checked: initial load against a budget on throttled 3G (no budget yet); the switch turned on; a real phone; screen readers.
- Production image serves all pages from nginx with HTTP 200 on a throwaway container before the live stack is touched.

## Safety
The live `namgold-wedding-frontend` container is public via the tunnel. Verify with a throwaway container/port. Do not recreate the live stack or commit without being asked.
