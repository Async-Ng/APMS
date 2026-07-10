import { useEffect, useState } from "react";

/** Ticking elapsed-seconds counter since `startIso`, updated every second. */
export function useElapsedSeconds(startIso: string): number {
  const [elapsed, setElapsed] = useState(() =>
    Math.max(0, Math.floor((Date.now() - new Date(startIso).getTime()) / 1000)),
  );

  useEffect(() => {
    setElapsed(Math.max(0, Math.floor((Date.now() - new Date(startIso).getTime()) / 1000)));
    const interval = setInterval(() => {
      setElapsed(Math.max(0, Math.floor((Date.now() - new Date(startIso).getTime()) / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, [startIso]);

  return elapsed;
}

/** Format a seconds count as "Ns" or "Mp Ns" for display. */
export function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}p ${rest}s`;
}
