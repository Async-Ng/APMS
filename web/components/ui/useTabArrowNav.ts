import { useCallback } from "react";

export function useTabArrowNav<T extends string>(
  tabIds: readonly T[],
  onChange: (tab: T) => void,
) {
  return useCallback(
    (e: React.KeyboardEvent, currentId: T) => {
      const idx = tabIds.indexOf(currentId);
      if (idx === -1) return;

      let nextIdx: number | null = null;

      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        nextIdx = (idx + 1) % tabIds.length;
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        nextIdx = (idx - 1 + tabIds.length) % tabIds.length;
      } else if (e.key === "Home") {
        nextIdx = 0;
      } else if (e.key === "End") {
        nextIdx = tabIds.length - 1;
      }

      if (nextIdx === null) return;

      e.preventDefault();
      const nextId = tabIds[nextIdx];
      onChange(nextId);
      requestAnimationFrame(() => {
        document.getElementById(`tab-${nextId}`)?.focus();
      });
    },
    [tabIds, onChange],
  );
}
