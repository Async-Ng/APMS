import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

interface BrutalButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  loading?: boolean;
  size?: "sm" | "md";
}

function Spinner({ size = "md" }: { size?: "sm" | "md" }) {
  return (
    <svg
      className={cn(
        "animate-spin",
        size === "sm" ? "h-4 w-4" : "h-5 w-5"
      )}
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
  size = "md",
  className,
  disabled,
  type = "button",
  ...props
}: BrutalButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled ?? loading}
      aria-busy={loading}
      className={cn(
        "brutal-btn focus-brutal w-full relative",
        size === "sm" ? "brutal-btn-sm" : "brutal-btn-md",
        variant === "primary" && "brutal-btn-primary",
        variant === "secondary" && "brutal-btn-secondary",
        variant === "ghost" && "brutal-btn-ghost",
        className,
      )}
      {...props}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Spinner size={size} />
        </div>
      )}
      <span className={cn("inline-flex items-center justify-center gap-2", loading && "invisible")}>
        {children}
      </span>
    </button>
  );
}
