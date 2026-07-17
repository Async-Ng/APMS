"use client";

import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";

import { filterBySearch } from "@/lib/admin/client-table";
import { cn } from "@/lib/cn";

export interface SubjectOption {
  id: string;
  code: string;
  name: string;
}

interface SubjectSearchSelectProps {
  subjects: SubjectOption[];
  value: string;
  onChange: (subjectId: string) => void;
  disabled?: boolean;
  id?: string;
}

export function SubjectSearchSelect({
  subjects,
  value,
  onChange,
  disabled = false,
  id = "subject-search-select",
}: SubjectSearchSelectProps) {
  const [query, setQuery] = useState("");
  const selected = subjects.find((s) => s.id === value) ?? null;

  const filtered = useMemo(
    () => filterBySearch(subjects, query, ["code", "name"]),
    [subjects, query],
  );

  return (
    <div className="space-y-2">
      {selected && (
        <div className="flex items-center gap-2 rounded-xl border-2 border-brutal-ink bg-brutal-bg px-3 py-2">
          <span className="shrink-0 font-mono text-xs font-bold">{selected.code}</span>
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{selected.name}</span>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange("")}
            className="focus-brutal shrink-0 rounded-lg p-1 hover:bg-brutal-surface disabled:opacity-50"
            aria-label="Bỏ chọn môn"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brutal-muted"
          aria-hidden="true"
        />
        <input
          id={id}
          type="search"
          value={query}
          disabled={disabled}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm mã hoặc tên môn…"
          className="focus-brutal w-full rounded-xl border-2 border-brutal-ink bg-brutal-surface py-2.5 pl-9 pr-3 text-sm outline-none disabled:opacity-50"
          aria-label="Tìm môn học"
          autoComplete="off"
        />
      </div>

      <div
        role="listbox"
        aria-label="Danh sách môn học"
        className="max-h-56 overflow-y-auto rounded-xl border-2 border-brutal-ink bg-brutal-surface"
      >
        {filtered.length === 0 ? (
          <p className="px-3 py-4 text-sm text-brutal-muted">Không tìm thấy môn.</p>
        ) : (
          <ul className="divide-y divide-brutal-ink/10">
            {filtered.map((s) => {
              const isSelected = s.id === value;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={disabled}
                    onClick={() => {
                      onChange(s.id);
                      setQuery("");
                    }}
                    className={cn(
                      "focus-brutal flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm transition-colors",
                      "hover:bg-brutal-bg disabled:opacity-50",
                      isSelected && "bg-brutal-accent/20 font-semibold",
                    )}
                  >
                    <span className="shrink-0 font-mono text-xs font-bold">{s.code}</span>
                    <span className="min-w-0 flex-1 leading-snug">{s.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
