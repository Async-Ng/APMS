import { BrutalCard } from "@/components/ui/BrutalCard";
import { progressDemo } from "@/lib/landing-mock";

export function ProgressDemoCard() {
  return (
    <BrutalCard hover className="p-6 sm:p-8">
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="font-heading text-2xl font-extrabold sm:text-3xl">
            Your study progress
          </h2>
          <p className="text-sm text-brutal-muted">
            Track how many materials are indexed and ready for AI chat.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border-2 border-brutal-ink bg-brutal-secondary px-4 py-3 text-brutal-on-brand shadow-[2px_2px_0_0_#1A1A1A]">
            <p className="text-xs font-bold uppercase opacity-90">Indexed</p>
            <p className="font-heading text-2xl font-extrabold">
              {progressDemo.indexed}/{progressDemo.total}
            </p>
          </div>
          <div className="rounded-xl border-2 border-brutal-ink bg-brutal-accent px-4 py-3 text-brutal-on-brand shadow-[2px_2px_0_0_#1A1A1A]">
            <p className="text-xs font-bold uppercase opacity-90">Completion</p>
            <p className="font-heading text-2xl font-extrabold">{progressDemo.percent}%</p>
          </div>
          <div className="rounded-xl border-2 border-brutal-ink bg-brutal-primary px-4 py-3 text-brutal-on-brand shadow-[2px_2px_0_0_#1A1A1A]">
            <p className="text-xs font-bold uppercase opacity-90">AI chats</p>
            <p className="font-heading text-2xl font-extrabold">{progressDemo.chats}</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm font-bold">
            <span>Materials indexed</span>
            <span>{progressDemo.percent}%</span>
          </div>
          <div className="h-4 overflow-hidden rounded-full border-2 border-brutal-ink bg-brutal-surface shadow-[2px_2px_0_0_#1A1A1A]">
            <div
              className="h-full bg-brutal-accent"
              style={{ width: `${progressDemo.percent}%` }}
            />
          </div>
        </div>
      </div>
    </BrutalCard>
  );
}
