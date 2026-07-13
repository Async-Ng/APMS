import { useEffect, useState } from "react";

/** Ticking elapsed-seconds counter since `startIso`, updated every second. */
export function useElapsedSeconds(startIso: string): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  return Math.max(0, Math.floor((now - new Date(startIso).getTime()) / 1000));
}

/** Format a seconds count as "Ns" or "Mp Ns" for display. */
export function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}p ${rest}s`;
}
