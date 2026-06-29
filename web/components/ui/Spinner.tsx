import { cn } from "@/lib/cn";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
}

const sizeClasses = {
  sm: "h-4 w-4 border",
  md: "h-8 w-8 border-2",
  lg: "h-10 w-10 border-2",
} as const;

export function Spinner({ size = "md", className, label }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label={label ?? "Đang tải"}
      className={cn(
        "animate-spin rounded-full border-brutal-ink border-t-brutal-primary",
        sizeClasses[size],
        className,
      )}
    />
  );
}

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = "Đang tải..." }: LoadingScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <Spinner />
      <p className="text-sm font-medium text-brutal-muted">{message}</p>
    </div>
  );
}
