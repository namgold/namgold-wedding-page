"use client";
import { useEffect, useState } from "react";

const KEY = "guestName";

/** The guest's name, kept in localStorage so the wish and RSVP forms are prefilled on every visit. */
export function useGuestName() {
  const [name, setName] = useState("");
  // Read after mount so server and client markup match; storage can throw (private mode, blocked).
  useEffect(() => {
    try {
      setName(localStorage.getItem(KEY) ?? "");
    } catch {}
  }, []);
  const update = (value: string) => {
    setName(value);
    try {
      localStorage.setItem(KEY, value);
    } catch {}
  };
  return [name, update] as const;
}
