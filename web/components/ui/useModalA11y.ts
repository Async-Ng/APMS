import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

const FIELD_SELECTOR = "textarea, input, select";

interface UseModalA11yOptions {
  /** When true, Escape and backdrop close are blocked */
  preventClose?: boolean;
}

export function useModalA11y(
  open: boolean,
  onClose: () => void,
  dialogRef: RefObject<HTMLElement | null>,
  options?: UseModalA11yOptions,
) {
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const preventCloseRef = useRef(options?.preventClose ?? false);

  onCloseRef.current = onClose;
  preventCloseRef.current = options?.preventClose ?? false;

  // Save trigger focus on open; restore only when modal closes
  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      return;
    }

    const toRestore = previousFocusRef.current;
    if (toRestore?.isConnected) {
      toRestore.focus();
    }
  }, [open]);

  // Trap + Esc — runs once per open, not on parent re-renders
  useEffect(() => {
    if (!open) return;

    const dialog = dialogRef.current;
    if (!dialog) return;

    function getFocusables(): HTMLElement[] {
      return Array.from(
        dialog!.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => !el.hasAttribute("disabled"));
    }

    function getInitialFocusTarget(): HTMLElement | undefined {
      const marked = dialog!.querySelector<HTMLElement>("[data-initial-focus]");
      if (marked) {
        if (
          marked.matches(FIELD_SELECTOR) &&
          !marked.hasAttribute("disabled")
        ) {
          return marked;
        }
        const nested = marked.querySelector<HTMLElement>(FIELD_SELECTOR);
        if (nested && !nested.hasAttribute("disabled")) return nested;
      }

      const fields = dialog!.querySelectorAll<HTMLElement>(FIELD_SELECTOR);
      for (const el of fields) {
        if (!el.hasAttribute("disabled")) return el;
      }

      return getFocusables()[0];
    }

    const raf = requestAnimationFrame(() => {
      getInitialFocusTarget()?.focus();
    });

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !preventCloseRef.current) {
        e.preventDefault();
        onCloseRef.current();
        return;
      }

      if (e.key !== "Tab") return;

      const nodes = getFocusables();
      if (nodes.length === 0) return;

      const first = nodes[0];
      const last = nodes[nodes.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, dialogRef]);
}
