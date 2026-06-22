"use client";

import { Search } from "lucide-react";
import { useEffect, useState } from "react";

interface AdminSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  className?: string;
  id?: string;
}

export function AdminSearchBar({
  value,
  onChange,
  placeholder = "Tìm kiếm…",
  debounceMs = 300,
  className = "max-w-sm",
  id = "admin-search",
}: AdminSearchBarProps) {
  const [local, setLocal] = useState(value);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (local !== value) onChange(local);
    }, debounceMs);
    return () => window.clearTimeout(timer);
  }, [local, value, onChange, debounceMs]);

  return (
    <div className={`relative ${className}`}>
      <Search
        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brutal-muted"
        aria-hidden="true"
      />
      <input
        id={id}
        type="search"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder={placeholder}
        className="focus-brutal w-full rounded-xl border-2 border-brutal-ink bg-brutal-surface py-2.5 pl-9 pr-4 text-sm outline-none shadow-brutal-sm"
        aria-label={placeholder}
      />
    </div>
  );
}
