"use client";

import Link from "next/link";

import { BrutalButton } from "@/components/ui/BrutalButton";
import { BrutalCard } from "@/components/ui/BrutalCard";
import { scrollToSection } from "@/lib/scroll-to-section";

const navLinks = [
  { label: "Features", sectionId: "hero" },
  { label: "Materials", sectionId: "catalog" },
  { label: "Progress", sectionId: "progress" },
  { label: "Reviews", sectionId: "testimonials" },
] as const;

function FptStripe() {
  return (
    <span className="flex items-center gap-0.5" aria-hidden="true">
      <span className="h-5 w-3 rounded-sm border-2 border-brutal-ink bg-brutal-secondary" />
      <span className="h-5 w-3 rounded-sm border-2 border-brutal-ink bg-brutal-primary" />
      <span className="h-5 w-3 rounded-sm border-2 border-brutal-ink bg-brutal-accent" />
    </span>
  );
}

function NavLink({
  label,
  sectionId,
}: {
  label: string;
  sectionId: string;
}) {
  return (
    <button
      type="button"
      onClick={() => scrollToSection(sectionId)}
      className="focus-brutal shrink-0 font-heading text-sm font-bold text-brutal-ink underline-offset-4 hover:underline"
    >
      {label}
    </button>
  );
}

interface LoginNavbarProps {
  user: { displayName: string } | null;
  isAuthLoading: boolean;
  onSignOut: () => void;
}

export function LoginNavbar({ user, isAuthLoading, onSignOut }: LoginNavbarProps) {
  const firstName = user?.displayName.split(" ")[0] ?? "there";

  return (
    <BrutalCard className="!p-4 sm:!p-5" hover>
      <nav className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/login"
            className="focus-brutal flex items-center gap-3"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection("hero");
            }}
          >
            <FptStripe />
            <span className="font-heading text-xl font-extrabold text-brutal-ink sm:text-2xl">
              APMS
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-2">
            {isAuthLoading ? (
              <span className="text-sm text-brutal-muted">...</span>
            ) : user ? (
              <>
                <span className="hidden rounded-lg border-2 border-brutal-ink bg-brutal-secondary px-3 py-1.5 text-sm font-bold text-brutal-on-brand shadow-[2px_2px_0_0_#1A1A1A] sm:inline">
                  Hi, {firstName}
                </span>
                <BrutalButton
                  variant="ghost"
                  className="!w-auto !min-h-10 px-3 py-2 text-sm"
                  onClick={onSignOut}
                >
                  Sign out
                </BrutalButton>
              </>
            ) : (
              <BrutalButton
                variant="primary"
                className="!w-auto !min-h-10 px-4 py-2 text-sm"
                onClick={() => scrollToSection("hero")}
              >
                Sign in
              </BrutalButton>
            )}
          </div>
        </div>

        <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-1 md:mx-0 md:justify-center md:overflow-visible md:pb-0">
          {navLinks.map((link) => (
            <NavLink key={link.sectionId} {...link} />
          ))}
        </div>
      </nav>
    </BrutalCard>
  );
}
