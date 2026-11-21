// Language-independent wedding data. All values are PLACEHOLDERS: replace with the real ones.

export type Lang = "vi" | "en";

/** Shared by every place version. */
export const wedding = {
  groom: "Nguyễn Hoàng Nam",
  bride: "Hy Phạm Ngọc Linh",
  // Short names for the hero (top of the page), and its two polaroid photos (placeholders: replace with real portraits, 2:3).
  groomShort: "Hoàng Nam",
  brideShort: "Ngọc Linh",
  heroPhotos: { groom: "/images/album/p1.svg", bride: "/images/album/p2.svg" },
  groomParents: ["Nguyễn Trần Thoại", "Lê Thị Hoàng Ngọc"],
  brideParents: ["Hy Quang On", "Phạm Thị Mới"],
  groomAddress: "Nha Trang, Khánh Hoà",
  brideAddress: "Tân Hội, Đức Trọng, Lâm Đồng",
  tz: "Asia/Ho_Chi_Minh",
  gifts: [
    { role: "groom", bank: "MBBank", number: "0931637301", holder: "NGUYEN HOANG NAM" },
    { role: "bride", bank: "Vietcombank", number: "linhhy", holder: "HY PHAM NGOC LINH" },
  ],
  // Bank QR switch. false hides the QR images and their note; bank name, number and holder stay.
  // Off by default: components/Qr.tsx is a non-scannable placeholder, do not show it to real guests.
  showBankQr: false,
  // Optional background music. Leave empty to hide the music button.
  musicSrc: "/50-nam-ve-sau.mp3",
  albumCount: 6,
} as const;
