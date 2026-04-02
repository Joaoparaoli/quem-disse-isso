"use client";
import { useCallback, useRef } from "react";

type SoundName = "join" | "whoosh" | "tick" | "drumroll" | "fanfare" | "trombone" | "levelup";

export function useSound() {
  const cacheRef = useRef<Record<string, HTMLAudioElement>>({});

  const play = useCallback((name: SoundName) => {
    try {
      if (!cacheRef.current[name]) {
        cacheRef.current[name] = new Audio(`/sounds/${name}.mp3`);
      }
      const audio = cacheRef.current[name];
      audio.currentTime = 0;
      audio.play().catch(() => {});
    } catch {
      // Sound is non-critical
    }
  }, []);

  return { play };
}
