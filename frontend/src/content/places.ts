// Per-place data. SERVER ONLY: only the route pages (generateStaticParams) import the list, so the other
// places' details never reach the browser bundle. Each place page must not mention or link to another place.
import type { Lang } from "./data";

type L = Record<Lang, string>;

/** One dress code colour: the circle shown, and its name per language (names are joined with " · " under the heading). */
export type DressColor = { color: string } & L;

const pinkBeigeWhite: DressColor[] = [
  { color: "#ffe6ef", vi: "Hồng", en: "Pink" },
  { color: "#f4ddcd", vi: "Be", en: "Beige" },
  { color: "#ffffff", vi: "Trắng", en: "White" },
];

/** One party. The 3 versions differ only in these fields. The slug is the URL (/<slug> and /en/<slug>): never change it after the QR is printed. */
export type Place = {
  slug: string;
  ceremonyIso?: string; // omit when this place has no separate ceremony
  ceremonyName?: L; // what the ceremony is called here (lowercase in en); omit for the default "Lễ thành hôn" / "wedding ceremony"
  receptionName?: L; // what the reception is called here (lowercase); omit for the default "tiệc cưới" / "wedding reception"
  receptionIso: string;
  receptionDurationMin: number;
  venueName: string;
  venueAddress: string;
  hall?: L; // banquet hall (sảnh tiệc cưới) inside the venue, one text per language
  mapUrl?: string; // optional override; otherwise a Google Maps search link is built from name + address
  mapEmbedUrl?: string; // pinned embed: the src from Google Maps > Share > Embed a map; otherwise a name + address search embed
  // Lunar date is hardcoded on purpose (not computed). Fill in the real one.
  lunar: L;
  // A row with `ceremony: true` takes its text from ceremonyName, so the name is configured once per place.
  schedule: { time: string; label?: L; ceremony?: boolean }[];
  dressCode?: DressColor[]; // swatches in display order; omit to hide the dress code section for this place
};

export const places: Place[] = [
  {
    slug: "ceremony",
    receptionName: { vi: "tiệc cưới", en: "wedding reception" },
    ceremonyName: { vi: "Lễ vu quy", en: "Vu Quy ceremony" },
    ceremonyIso: "2027-03-27T08:00:00+07:00",
    receptionIso: "2027-03-27T11:30:00+07:00",
    receptionDurationMin: 210,
    venueName: "Nhà hàng tiệc cưới Hoàng Long",
    venueAddress: "xã Tân Hội, Đức Trọng, Lâm Đồng",
    mapEmbedUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d7000!2d108.28363481223674!3d11.715924088447979!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3171458713dbc3f1%3A0x8feddf8771301082!2zTmhhzIAgSGHMgG5nIFRpw6rMo2MgQ8awxqHMgWkgSG9hzIBuZyBMb25n!5e0!3m2!1sen!2s!4v1795252716771!5m2!1sen!2s",
    lunar: {vi: "Nhằm ngày 20 tháng 02 năm Đinh Mùi", en: "Lunar date: 20/02/2027"},
    schedule: [
      { time: "08:00", ceremony: true },
      { time: "11:30", label: { vi: "Đón khách", en: "Guest arrival" } },
      { time: "11:45", label: { vi: "Nghi lễ", en: "Wedding rituals" } },
      { time: "12:00", label: { vi: "Khai tiệc", en: "Reception begins" } },
      { time: "14:00", label: { vi: "Kết thúc tiệc", en: "Reception ends" } },
    ],
  },
  {
    slug: "invitation",
    receptionName: { vi: "tiệc cưới", en: "wedding reception" },
    ceremonyName: { vi: "Lễ thành hôn", en: "wedding ceremony" },
    ceremonyIso: "2027-03-28T10:00:00+07:00",
    receptionIso: "2027-03-28T18:00:00+07:00",
    receptionDurationMin: 210,
    venueName: "Nhà hàng Champa Island Nha Trang",
    venueAddress: "304 đường 2/4, phường Tây Nha Trang, tỉnh Khánh Hoà",
    mapEmbedUrl: "https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d7000!2d109.19140260357534!3d12.263785738989837!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3170678bc89ad369%3A0x7c16b00c1dcbfb3f!2sChampa%20Island%20Nha%20Trang%20-%20Resort%20Hotel%20%26%20Spa!5e0!3m2!1sen!2sus!4v1795252696961!5m2!1sen!2sus",
    hall: { vi: "Ganesha", en: "Ganesha" },
    lunar: {vi: "Nhằm ngày 21 tháng 02 năm Đinh Mùi", en: "Lunar date: 21/02/2027"},
    schedule: [
      { time: "10:00", ceremony: true },
      { time: "17:30", label: { vi: "Đón khách", en: "Guest arrival" } },
      { time: "18:30", label: { vi: "Nghi lễ", en: "Wedding rituals" } },
      { time: "19:00", label: { vi: "Khai tiệc", en: "Reception begins" } },
      { time: "21:00", label: { vi: "Kết thúc tiệc", en: "Reception ends" } },
    ],
  },
  {
    slug: "wedding",
    receptionName: { vi: "tiệc báo hỷ", en: "wedding celebration" },
    receptionIso: "2027-04-03T18:00:00+07:00",
    receptionDurationMin: 210,
    venueName: "Grand Palace",
    venueAddress: "63 Mạc Đĩnh Chi, phường Tân Định, thành phố Hồ Chí Minh",
    mapEmbedUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d7000!2d106.69357751222861!3d10.787591789318018!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31752939b6555547%3A0xa87137a6d585594e!2sGrand%20Palace%20Wedding%20And%20Convention!5e0!3m2!1sen!2s!4v1795252734510!5m2!1sen!2s",
    hall: { vi: "Mercury Tầng 4", en: "Mercury 4th Floor" },
    dressCode: pinkBeigeWhite,
    lunar: { vi: "Nhằm ngày 27 tháng 02 năm Đinh Mùi", en: "Lunar date: 27/02/2027" },
    schedule: [
      { time: "18:00", label: { vi: "Đón khách", en: "Guest arrival" } },
      { time: "18:45", label: { vi: "Nghi lễ", en: "Wedding rituals" } },
      { time: "19:00", label: { vi: "Khai tiệc", en: "Reception begins" } },
      { time: "21:00", label: { vi: "After Party", en: "After Party" } },
    ],
  },
];

export const placeBySlug = (slug: string): Place | undefined => places.find((p) => p.slug === slug);
