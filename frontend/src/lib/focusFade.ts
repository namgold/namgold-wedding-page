import { useEffect, type RefObject } from "react";

const FADE_S = 0.75;

// One Web Audio graph per element (createMediaElementSource may only be called once). A gain node is used
// instead of audio.volume because a ramp runs on the audio thread, so it still completes in a background tab
// (timers and rAF are throttled there), and because iOS ignores audio.volume.
type Graph = { ctx: AudioContext; gain: GainNode };
const graphs = new WeakMap<HTMLAudioElement, Graph>();

function graphOf(a: HTMLAudioElement): Graph | null {
  let g = graphs.get(a);
  if (g) return g;
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  try {
    const ctx = new Ctx();
    const gain = ctx.createGain();
    ctx.createMediaElementSource(a).connect(gain).connect(ctx.destination);
    g = { ctx, gain };
    graphs.set(a, g);
    return g;
  } catch {
    return null;
  }
}

function rampTo(g: Graph, to: number, from?: number) {
  const p = g.gain.gain;
  const now = g.ctx.currentTime;
  p.cancelScheduledValues(now);
  p.setValueAtTime(from ?? p.value, now);
  p.linearRampToValueAtTime(to, now + FADE_S);
}

// Pending "pause after the fade-out" per element, so a play (or a second pause) can cancel it.
const pauseTimers = new WeakMap<HTMLAudioElement, ReturnType<typeof setTimeout>>();

/** Fade out over 1 s, then pause. Without Web Audio it pauses at once. */
export function fadePause(a: HTMLAudioElement) {
  clearTimeout(pauseTimers.get(a));
  const g = graphs.get(a);
  if (!g) return a.pause();
  rampTo(g, 0);
  pauseTimers.set(a, setTimeout(() => { pauseTimers.delete(a); a.pause(); }, FADE_S * 1000));
}

/** Play and fade in over 1 s (from the current level if a fade-out is still running). Must be called from a user gesture on iOS. */
export function fadePlay(a: HTMLAudioElement): Promise<void> {
  clearTimeout(pauseTimers.get(a));
  pauseTimers.delete(a);
  const g = graphs.get(a);
  if (g) {
    void g.ctx.resume();
    rampTo(g, 1, a.paused ? 0 : undefined);
  }
  return a.paused ? a.play() : Promise.resolve();
}

// Visible, not focused: a tab that is still on screen (e.g. a second monitor) keeps playing. document.hidden is true
// when the guest switches tab, minimises or covers the browser, switches app, or turns the phone screen off.
const active = () => !document.hidden;

/**
 * Music plays only while the page is visible: when it becomes hidden (tab switch, browser hidden, app switch, screen off)
 * the volume fades to 0 in 1 s and then pauses; when visible again it resumes and fades back in over 1 s. A track the guest paused stays paused.
 */
export function useFocusFade(audioRef: RefObject<HTMLAudioElement | null>) {
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    graphOf(a);
    let resume = false; // was playing when focus was lost
    let wasActive = active();

    const apply = () => {
      const now = active();
      if (now === wasActive) return;
      wasActive = now;
      if (!now) {
        if (a.paused || pauseTimers.has(a)) return; // already paused, or the guest's own pause is fading out
        resume = true;
        fadePause(a);
      } else if (resume) {
        resume = false;
        fadePlay(a).catch(() => {});
      }
    };

    document.addEventListener("visibilitychange", apply);
    return () => {
      document.removeEventListener("visibilitychange", apply);
    };
  }, [audioRef]);
}
