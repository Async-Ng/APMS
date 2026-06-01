import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

interface BrutalButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  loading?: boolean;
}

function Spinner() {
  return (
    <svg
      className="h-5 w-5 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export function BrutalButton({
  children,
  variant = "primary",
  loading = false,
  className,
  disabled,
  type = "button",
  ...props
}: BrutalButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled ?? loading}
      className={cn(
        "brutal-btn focus-brutal w-full",
        variant === "primary" && "brutal-btn-primary",
        variant === "secondary" && "brutal-btn-secondary",
        variant === "ghost" && "brutal-btn-ghost",
        className,
      )}
      {...props}
    >
      {loading ? <Spinner /> : children}
    </button>
  );
}
