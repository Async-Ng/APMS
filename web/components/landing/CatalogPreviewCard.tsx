import { FileText } from "lucide-react";

import { cn } from "@/lib/cn";

interface CatalogPreviewCardProps {
  title: string;
  tag: string;
  progress: number;
  variant: "primary" | "secondary" | "accent";
}

const variantStyles = {
  primary: "bg-brutal-primary text-brutal-on-brand",
  secondary: "bg-brutal-secondary text-brutal-on-brand",
  accent: "bg-brutal-accent text-brutal-on-brand",
};

export function CatalogPreviewCard({
  title,
  tag,
  progress,
  variant,
}: CatalogPreviewCardProps) {
  return (
    <article
      className={cn(
        "brutal-card brutal-card-hover flex flex-col gap-3 p-5",
        variantStyles[variant],
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <FileText className="h-6 w-6 shrink-0" aria-hidden="true" />
        <span className="rounded-full border-2 border-brutal-ink bg-brutal-surface px-2 py-0.5 text-xs font-bold text-brutal-ink">
          {tag}
        </span>
      </div>
      <h3 className="font-heading text-lg font-extrabold">{title}</h3>
      <div className="space-y-1">
        <div className="flex justify-between text-xs font-bold opacity-90">
          <span>Indexed</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full border-2 border-brutal-ink bg-brutal-surface/30">
          <div
            className="h-full rounded-full bg-brutal-surface"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </article>
  );
}
