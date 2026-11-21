"use client";
import { useRef, useState } from "react";
import { wedding } from "@/content/data";
import type { Place } from "@/content/places";
import type { Copy } from "@/content/types";
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
import { Schedule } from "./Schedule";
import { Venue } from "./Venue";

export function Invitation({ t, place }: { t: Copy; place: Place }) {
  const [opened, setOpened] = useState(false);
  const audio = useRef<HTMLAudioElement>(null);
  const toggleHref = pagePath(otherLangOf(t.lang), place.slug);

  // Play inside the click handler: iOS Safari only allows audio started by a user gesture.
  const open = () => {
    audio.current?.play().catch(() => {});
    setOpened(true);
    window.scrollTo(0, 0);
  };

  return (
    <>
      {wedding.musicSrc && <audio ref={audio} src={wedding.musicSrc} loop preload="none" />}
      <LangToggle t={t} href={toggleHref} />
      {!opened ? (
        <Cover t={t} place={place} onOpen={open} />
      ) : (
        <>
          <Music t={t} audioRef={audio} />
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
              <Guestbook t={t} />
              <GiftBox t={t} />
              <footer className="relative z-10 flex flex-col items-center px-6 pb-12 text-center md:px-10 md:pb-14">
                <span className="mx-auto flex flex-col items-center gap-1 whitespace-pre-line text-base md:max-w-[560px] md:text-lg">{t.footer}</span>
              </footer>
            </main>
          </Page>
        </>
      )}
    </>
  );
}
