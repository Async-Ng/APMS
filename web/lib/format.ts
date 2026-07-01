export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** i;
  return `${value < 10 && i > 0 ? value.toFixed(1) : Math.round(value)} ${units[i]}`;
}

export function formatRelativeDaysUntil(
  deletedAt: string | Date,
  retentionDays: number,
): number {
  const deleted = new Date(deletedAt);
  const purgeAt = new Date(deleted);
  purgeAt.setDate(purgeAt.getDate() + retentionDays);
  const msLeft = purgeAt.getTime() - Date.now();
  return Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
}

export function formatDaysUntil(targetDate: string | Date): number {
  const target = new Date(targetDate);
  const msLeft = target.getTime() - Date.now();
  return Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
}

export function formatTrashPurgeLabel(item: {
  permanentDeleteAt?: string | null;
  deletedAt?: string | null;
}): string {
  if (item.permanentDeleteAt) {
    const days = formatDaysUntil(item.permanentDeleteAt);
    return days > 0
      ? `Còn ${days} ngày trước khi xóa vĩnh viễn`
      : "Sắp bị xóa vĩnh viễn";
  }
  if (item.deletedAt) {
    return `Còn ${formatRelativeDaysUntil(item.deletedAt, 30)} ngày trước khi xóa vĩnh viễn`;
  }
  return "Tự xóa sau 30 ngày";
}
