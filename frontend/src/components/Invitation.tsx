"use client";
import { useRef, useState } from "react";
import { wedding, type Lang } from "@/content/data";
import { en } from "@/content/en";
import type { Place } from "@/content/places";
import { vi } from "@/content/vi";
import { otherLangOf, pagePath } from "@/lib/routes";
import { Album } from "./Album";
import { Announcement } from "./Announcement";
import { Cover } from "./Cover";
import { Families } from "./Families";
import { Page, PageFloral } from "./Floral";
import { GiftBox } from "./GiftBox";
import { Guestbook } from "./Guestbook";
import { Hero } from "./Hero";
import { LangToggle } from "./LangToggle";
import { Music } from "./Music";
import { Reception } from "./Reception";
import { RsvpButton } from "./RsvpButton";
import { Schedule } from "./Schedule";
import { Venue } from "./Venue";

export function Invitation({ initialLang, place }: { initialLang: Lang; place: Place }) {
  const [opened, setOpened] = useState(false);
  const [lang, setLang] = useState(initialLang);
  const audio = useRef<HTMLAudioElement>(null);
  const t = lang === "vi" ? vi : en;
  const toggleHref = pagePath(otherLangOf(lang), place.slug);

  // Switch language in place (no reload): swap the copy, then bring the document and URL in line.
  const switchLang = () => {
    const next = otherLangOf(lang);
    const c = next === "vi" ? vi : en;
    setLang(next);
    document.documentElement.lang = c.htmlLang;
    document.title = c.meta.title;
    document.querySelector('meta[name="description"]')?.setAttribute("content", c.meta.description);
    history.replaceState(null, "", pagePath(next, place.slug)); // a refresh or shared link keeps the language
  };

  // Play inside the click handler: iOS Safari only allows audio started by a user gesture.
  const open = () => {
    audio.current?.play().catch(() => {});
  };
  // Called when the cover's opening animation ends.
  const done = () => {
    setOpened(true);
    window.scrollTo(0, 0);
  };

  return (
    <>
      {wedding.musicSrc && <audio ref={audio} src={wedding.musicSrc} loop preload="none" />}
      <LangToggle t={t} href={toggleHref} onSwitch={switchLang} />
      {!opened && <Cover t={t} place={place} onOpen={open} onDone={done} />}
      {opened && <Music t={t} audioRef={audio} />}
      {/* The page is always rendered so its images, fonts and guestbook load while the cover is up. Until opened it is
          inert (no focus, hidden from screen readers) and clipped to the viewport (nothing scrolls behind the cover).
          Do not use display:none here: FitText and the guestbook virtualizer need real layout, and fonts and lazy
          images would not load. */}
      <div inert={!opened} className={opened ? undefined : "h-dvh overflow-hidden"}>
        <Page>
          <main>
            <Hero t={t} />
            <PageFloral />
            <Families t={t} />
            <Announcement t={t} place={place} />
            <Album t={t} />
            <Reception t={t} place={place} />
            <Venue t={t} place={place} />
            <Schedule t={t} place={place} />
            <RsvpButton t={t} place={place} />
            <Guestbook t={t} />
            <GiftBox t={t} />
            <footer className="relative z-10 flex flex-col items-center px-6 pb-12 text-center md:px-10 md:pb-14">
              <span className="mx-auto flex flex-col items-center gap-1 whitespace-pre-line text-base md:max-w-[560px] md:text-lg">{t.footer}</span>
            </footer>
          </main>
        </Page>
      </div>
    </>
  );
}
