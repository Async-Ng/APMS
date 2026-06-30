import type { Pagination } from "@/lib/queries/admin";

export const DEFAULT_CLIENT_PAGE_LIMIT = 15;

export function normalizeSearchTerm(term: string): string {
  return term.trim().toLowerCase();
}

export function filterBySearch<T>(
  items: T[],
  search: string,
  keys: (keyof T)[],
): T[] {
  const q = normalizeSearchTerm(search);
  if (!q) return items;
  return items.filter((item) =>
    keys.some((key) => {
      const val = item[key];
      if (val == null) return false;
      return String(val).toLowerCase().includes(q);
    }),
  );
}

export function filterBySearchFn<T>(
  items: T[],
  search: string,
  getSearchable: (item: T) => (string | null | undefined)[],
): T[] {
  const q = normalizeSearchTerm(search);
  if (!q) return items;
  return items.filter((item) =>
    getSearchable(item).some((val) => val != null && val.toLowerCase().includes(q)),
  );
}

export function paginateItems<T>(
  items: T[],
  page: number,
  limit: number = DEFAULT_CLIENT_PAGE_LIMIT,
): { items: T[]; pagination: Pagination } {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * limit;
  return {
    items: items.slice(start, start + limit),
    pagination: { page: safePage, limit, total, totalPages },
  };
}
