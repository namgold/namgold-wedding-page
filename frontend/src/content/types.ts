export type Copy = {
  lang: "vi" | "en";
  htmlLang: string;
  otherLang: { label: string };
  meta: { title: string; description: string };
  eventTitle: string;
  cover: { invite: string; open: string };
  families: { heading: string; parents: string; groomSide: string; brideSide: string };
  hero: { groom: string; bride: string }; // labels above the short names at the top of the page
  announce: {
    kicker: string;
    sub: string;
    ceremony: string; // default name of the ceremony, replaces {ceremony} below unless the place sets its own
    ceremonyAt: string;
    place: string;
    at: string;
    groomRole: string;
    brideRole: string;
  };
  album: { heading: string; alt: string; close: string; prev: string; next: string };
  reception: {
    name: string; // default name of the reception, replaces {reception} in the strings below and in eventTitle
    heading: string;
    startsAt: string;
    opening: string;
    addToCalendar: string;
    rsvp: string;
    calendarTitle: string;
  };
  venue: { heading: string; heldAt: string; hall: string; address: string; directions: string };
  dress: { heading: string; swatchLabel: string };
  schedule: { heading: string };
  guestbook: {
    heading: string;
    send: string;
    loading: string;
    empty: string;
    loadError: string;
    retry: string;
    loadMore: string;
    form: { name: string; message: string; sending: string; thanks: string };
  };
  rsvp: {
    heading: string;
    intro: string;
    name: string;
    side: string;
    groomSide: string;
    brideSide: string;
    attending: string;
    yes: string;
    no: string;
    guests: string;
    dietary: string;
    dietaryHint: string;
    message: string;
    submit: string;
    sending: string;
    thanksYes: string;
    thanksNo: string;
    again: string;
    close: string;
  };
  errors: {
    name_required: string;
    message_required: string;
    too_long: string;
    rate_limited: string;
    captcha_failed: string;
    network: string;
    generic: string;
  };
  gift: {
    heading: string;
    tap: string;
    close: string;
    groom: string;
    bride: string;
    qrNote: string;
  };
  footer: string;
  music: { on: string; off: string };
  weekdaysShort: string[]; // Monday first
  weekdaysLong: string[]; // Monday first
  dateText: string; // date wording next to the weekday: {d} day (2 digits), {day} day, {m} month number, {month} month name, {y} year
  monthsLong: string[]; // January first
};
