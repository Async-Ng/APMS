"use client";

import { useEffect, useRef, useState } from "react";

/** Brief pulse animation when starred state toggles. */
export function useStarPulse(isStarred: boolean): boolean {
  const [pulse, setPulse] = useState(false);
  const prevRef = useRef(isStarred);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevRef.current = isStarred;
      return;
    }

    if (prevRef.current !== isStarred) {
      prevRef.current = isStarred;
      setPulse(true);
      const timer = window.setTimeout(() => setPulse(false), 450);
      return () => window.clearTimeout(timer);
    }
  }, [isStarred]);

  return pulse;
}
