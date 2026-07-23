"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { AdminStats } from "@/lib/queries/admin";
import { cn } from "@/lib/cn";

const BRUTAL = {
  ink: "#1a1a1a",
  muted: "#334155",
  primary: "#f37021",
  secondary: "#2b8fd4",
  accent: "#33b04a",
  danger: "#e53e3e",
  surface: "#ffffff",
  bg: "#fff8f4",
} as const;

const STATUS_COLORS: Record<string, string> = {
  pending: BRUTAL.muted,
  processing: BRUTAL.secondary,
  ready: BRUTAL.accent,
  failed: BRUTAL.danger,
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Chờ xử lý",
  processing: "Đang xử lý",
  ready: "Sẵn sàng",
  failed: "Lỗi",
};

function formatBytes(bytes: number): string {
  if (bytes >= 1_073_741_824)
    return `${(bytes / 1_073_741_824).toFixed(2)} GB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

function formatDayLabel(isoDate: string): string {
  const [, month, day] = isoDate.split("-");
  return `${day}/${month}`;
}

function ChartCard({
  title,
  children,
  className,
  empty,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  empty?: boolean;
}) {
  return (
    <div className={cn("brutal-card flex min-h-[280px] flex-col p-5", className)}>
      <h3 className="mb-3 font-heading text-xs font-bold uppercase tracking-widest text-brutal-muted">
        {title}
      </h3>
      {empty ? (
        <p className="m-auto text-sm text-brutal-muted">Chưa có dữ liệu</p>
      ) : (
        <div className="min-h-0 flex-1">{children}</div>
      )}
    </div>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
  valueFormatter,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number | string; color?: string }>;
  label?: string | number;
  valueFormatter?: (value: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border-2 border-brutal-ink bg-brutal-surface px-3 py-2 text-xs shadow-brutal-sm">
      {label !== undefined && label !== "" && (
        <p className="mb-1 font-bold text-brutal-ink">{label}</p>
      )}
      {payload.map((entry, i) => (
        <p key={i} className="text-brutal-muted">
          <span style={{ color: entry.color }} className="font-bold">
            {entry.name}
          </span>
          {": "}
          {typeof entry.value === "number" && valueFormatter
            ? valueFormatter(entry.value)
            : entry.value}
        </p>
      ))}
    </div>
  );
}

export function AdminOverviewCharts({ data }: { data: AdminStats }) {
  const statusData = (
    ["pending", "processing", "ready", "failed"] as const
  ).map((key) => ({
    key,
    name: STATUS_LABELS[key],
    value: data.documentsByStatus[key] ?? 0,
    color: STATUS_COLORS[key],
  }));
  const statusTotal = statusData.reduce((sum, d) => sum + d.value, 0);

  const visibilityData = [
    {
      name: "Riêng tư",
      value: data.documentsByVisibility.private,
      fill: BRUTAL.secondary,
    },
    {
      name: "Công khai",
      value: data.documentsByVisibility.public,
      fill: BRUTAL.primary,
    },
  ];
  const visibilityTotal = visibilityData.reduce((sum, d) => sum + d.value, 0);

  const storageData = data.topUsersByStorage.map((u) => ({
    id: u.id,
    name:
      u.displayName.length > 14
        ? `${u.displayName.slice(0, 12)}…`
        : u.displayName,
    fullName: u.displayName,
    email: u.email,
    bytes: u.storageUsedBytes,
  }));

  const aiLineData = data.aiTurnsLast7Days.map((d) => ({
    date: d.date,
    label: formatDayLabel(d.date),
    turns: d.turns,
  }));
  const aiLineTotal = aiLineData.reduce((sum, d) => sum + d.turns, 0);

  const subjectData = data.topSubjectsByDocuments.map((s) => ({
    id: s.subjectId,
    name: s.code,
    fullLabel: `${s.code} — ${s.name}`,
    count: s.documentCount,
  }));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Tài liệu theo trạng thái" empty={statusTotal === 0}>
          <div
            className="flex h-full min-h-[220px] flex-col items-center"
            role="img"
            aria-label="Biểu đồ tròn tài liệu theo trạng thái xử lý"
          >
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={78}
                  paddingAngle={2}
                  stroke={BRUTAL.ink}
                  strokeWidth={2}
                >
                  {statusData.map((entry) => (
                    <Cell key={entry.key} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <ul className="mt-1 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs font-bold text-brutal-ink">
              {statusData.map((d) => (
                <li key={d.key} className="inline-flex items-center gap-1.5">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-sm border border-brutal-ink"
                    style={{ backgroundColor: d.color }}
                    aria-hidden
                  />
                  {d.name}: {d.value}
                </li>
              ))}
            </ul>
          </div>
        </ChartCard>

        <ChartCard
          title="Tài liệu theo chế độ hiển thị"
          empty={visibilityTotal === 0}
        >
          <div
            className="h-full min-h-[220px]"
            role="img"
            aria-label="Biểu đồ cột tài liệu private và public"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={visibilityData}
                layout="vertical"
                margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" allowDecimals={false} tick={{ fill: BRUTAL.muted, fontSize: 12 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={72}
                  tick={{ fill: BRUTAL.ink, fontSize: 12, fontWeight: 700 }}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="value" name="Số tài liệu" radius={[0, 6, 6, 0]} stroke={BRUTAL.ink} strokeWidth={1.5}>
                  {visibilityData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title="Top 5 dung lượng người dùng"
          empty={storageData.length === 0 || storageData.every((u) => u.bytes === 0)}
        >
          <div
            className="h-full min-h-[220px]"
            role="img"
            aria-label="Biểu đồ cột top người dùng theo dung lượng"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={storageData}
                layout="vertical"
                margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  type="number"
                  tickFormatter={(v: number) => formatBytes(v)}
                  tick={{ fill: BRUTAL.muted, fontSize: 11 }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={88}
                  tick={{ fill: BRUTAL.ink, fontSize: 11, fontWeight: 700 }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const row = payload[0]?.payload as {
                      fullName?: string;
                      email?: string;
                      bytes?: number;
                    };
                    return (
                      <div className="rounded-lg border-2 border-brutal-ink bg-brutal-surface px-3 py-2 text-xs shadow-brutal-sm">
                        <p className="font-bold text-brutal-ink">{row.fullName}</p>
                        <p className="text-brutal-muted">{row.email}</p>
                        <p className="mt-1 font-bold tabular-nums text-brutal-ink">
                          {formatBytes(row.bytes ?? 0)}
                        </p>
                      </div>
                    );
                  }}
                />
                <Bar
                  dataKey="bytes"
                  name="Dung lượng"
                  fill={BRUTAL.primary}
                  radius={[0, 6, 6, 0]}
                  stroke={BRUTAL.ink}
                  strokeWidth={1.5}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Lượt chat AI 7 ngày (UTC)" empty={aiLineTotal === 0}>
          <div
            className="h-full min-h-[220px]"
            role="img"
            aria-label="Biểu đồ đường lượt chat AI bảy ngày gần nhất"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={aiLineData}
                margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: BRUTAL.muted, fontSize: 12 }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: BRUTAL.muted, fontSize: 12 }}
                  width={36}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const row = payload[0]?.payload as { date?: string; turns?: number };
                    return (
                      <div className="rounded-lg border-2 border-brutal-ink bg-brutal-surface px-3 py-2 text-xs shadow-brutal-sm">
                        <p className="font-bold text-brutal-ink">{row.date}</p>
                        <p className="text-brutal-muted">
                          Lượt hỏi:{" "}
                          <span className="font-bold tabular-nums text-brutal-ink">
                            {row.turns ?? 0}
                          </span>
                        </p>
                      </div>
                    );
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="turns"
                  name="Lượt hỏi"
                  stroke={BRUTAL.secondary}
                  strokeWidth={3}
                  dot={{ r: 4, fill: BRUTAL.secondary, stroke: BRUTAL.ink, strokeWidth: 1.5 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <ChartCard
        title="Top môn có nhiều tài liệu nhất"
        empty={subjectData.length === 0}
        className="min-h-0"
      >
        {subjectData.length === 0 ? null : (
          <div
            className="min-h-[200px]"
            role="img"
            aria-label="Biểu đồ xếp hạng môn theo số tài liệu"
          >
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={subjectData}
                layout="vertical"
                margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" allowDecimals={false} tick={{ fill: BRUTAL.muted, fontSize: 12 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={72}
                  tick={{ fill: BRUTAL.ink, fontSize: 12, fontWeight: 700 }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const row = payload[0]?.payload as {
                      fullLabel?: string;
                      count?: number;
                    };
                    return (
                      <div className="rounded-lg border-2 border-brutal-ink bg-brutal-surface px-3 py-2 text-xs shadow-brutal-sm">
                        <p className="font-bold text-brutal-ink">{row.fullLabel}</p>
                        <p className="text-brutal-muted">
                          Tài liệu:{" "}
                          <span className="font-bold tabular-nums text-brutal-ink">
                            {row.count ?? 0}
                          </span>
                        </p>
                      </div>
                    );
                  }}
                />
                <Bar
                  dataKey="count"
                  name="Tài liệu"
                  fill={BRUTAL.accent}
                  radius={[0, 6, 6, 0]}
                  stroke={BRUTAL.ink}
                  strokeWidth={1.5}
                />
              </BarChart>
            </ResponsiveContainer>
            <ol className="mt-2 space-y-1 text-xs text-brutal-muted">
              {data.topSubjectsByDocuments.map((s, i) => (
                <li key={s.subjectId}>
                  <span className="font-bold text-brutal-ink">{i + 1}. {s.code}</span>
                  {" — "}
                  {s.name}
                  {" · "}
                  <span className="tabular-nums font-bold">{s.documentCount}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </ChartCard>
    </div>
  );
}
