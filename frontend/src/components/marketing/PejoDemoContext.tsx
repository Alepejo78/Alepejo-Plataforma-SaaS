"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const PejoDemoContext = createContext<{
  playing: boolean;
  setPlaying: (playing: boolean) => void;
}>({ playing: false, setPlaying: () => {} });

export function PejoDemoProvider({ children }: { children: ReactNode }) {
  const [playing, setPlaying] = useState(false);
  return (
    <PejoDemoContext.Provider value={{ playing, setPlaying }}>
      {children}
    </PejoDemoContext.Provider>
  );
}

export function usePejoDemo() {
  return useContext(PejoDemoContext).playing;
}

/** Playback, pause, completion and unmount all update the floating mascot. */
export function usePejoDemoPlayback(playing: boolean) {
  const { setPlaying } = useContext(PejoDemoContext);
  useEffect(() => {
    setPlaying(playing);
    return () => setPlaying(false);
  }, [playing, setPlaying]);
}
