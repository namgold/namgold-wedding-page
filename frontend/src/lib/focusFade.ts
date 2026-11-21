import { useEffect, type RefObject } from "react";

const FADE_S = 0.5;

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

function rampTo(g: Graph, to: number) {
  const p = g.gain.gain;
  const now = g.ctx.currentTime;
  p.cancelScheduledValues(now);
  p.setValueAtTime(p.value, now);
  p.linearRampToValueAtTime(to, now + FADE_S);
}

/** Back to full volume right away (used when the guest presses the music button). */
export function restoreVolume(a: HTMLAudioElement) {
  const g = graphs.get(a);
  if (!g) return;
  g.gain.gain.cancelScheduledValues(g.ctx.currentTime);
  g.gain.gain.value = 1;
  void g.ctx.resume();
}

// Visible, not focused: a tab that is still on screen (e.g. a second monitor) keeps playing. document.hidden is true
// when the guest switches tab, minimises or covers the browser, switches app, or turns the phone screen off.
const active = () => !document.hidden;

/**
 * Music plays only while the page is visible: when it becomes hidden (tab switch, browser hidden, app switch, screen off)
 * the volume fades to 0 in 0.5 s and then pauses; when visible again it resumes and fades back in over 0.5 s. A track the guest paused stays paused.
 */
export function useFocusFade(audioRef: RefObject<HTMLAudioElement | null>) {
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const g = graphOf(a);
    let resume = false; // was playing when focus was lost
    let timer: ReturnType<typeof setTimeout> | undefined;
    let wasActive = active();

    const apply = () => {
      const now = active();
      if (now === wasActive) return;
      wasActive = now;
      clearTimeout(timer);
      if (!now) {
        if (a.paused) return;
        resume = true;
        if (g) rampTo(g, 0);
        timer = setTimeout(() => a.pause(), g ? FADE_S * 1000 : 0);
      } else if (resume) {
        resume = false;
        if (g) {
          void g.ctx.resume();
          if (a.paused) g.gain.gain.setValueAtTime(0, g.ctx.currentTime);
          rampTo(g, 1);
        }
        if (a.paused) a.play().catch(() => {});
      }
    };

    document.addEventListener("visibilitychange", apply);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", apply);
    };
  }, [audioRef]);
}
