import { BrutalCard } from "@/components/ui/BrutalCard";

interface TestimonialCardProps {
  name: string;
  role: string;
  quote: string;
}

export function TestimonialCard({ name, role, quote }: TestimonialCardProps) {
  return (
    <BrutalCard hover className="flex h-full flex-col gap-4 p-5">
      <p className="flex-1 text-sm font-medium leading-relaxed text-brutal-ink">
        &ldquo;{quote}&rdquo;
      </p>
      <div className="border-t-2 border-brutal-ink pt-3">
        <p className="font-heading font-extrabold">{name}</p>
        <p className="text-xs text-brutal-muted">{role}</p>
      </div>
    </BrutalCard>
  );
}
