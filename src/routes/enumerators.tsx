import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Users } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  LineChart,
  Line,
  Cell,
} from "recharts";
import { AppShell } from "@/components/AppShell";
import { Skeleton } from "@/components/ui/skeleton";
import { RiskBadge } from "@/components/RiskBadge";
import { useStore } from "@/lib/store";
import { byEnumerator, isAnomaly, peerAverage, riskColor, scoreToLevel } from "@/lib/analytics";
import { PERIODS } from "@/lib/mockData";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/enumerators")({
  head: () => ({
    meta: [
      { title: "Enumerator Analytics — SurveyGuard AI" },
      { name: "description", content: "Compare field enumerators against their peer-group average anomaly rate and review individual trends over time." },
      { property: "og:title", content: "Enumerator Analytics — SurveyGuard AI" },
      { property: "og:description", content: "A ranked leaderboard of enumerators with anomaly rates and peer comparison." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EnumeratorsPage,
});

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  color: "var(--popover-foreground)",
};

function EnumeratorsPage() {
  const { records, ready } = useStore();
  const stats = useMemo(() => byEnumerator(records), [records]);
  const avg = useMemo(() => peerAverage(stats), [stats]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = stats.find((s) => s.key === selectedId) ?? stats[0] ?? null;

  const trend = useMemo(() => {
    if (!selected) return [];
    const mine = records.filter((r) => r.enumeratorId === selected.key);
    return PERIODS.map((period) => {
      const rs = mine.filter((r) => r.period === period);
      const an = rs.filter(isAnomaly).length;
      return {
        period,
        rate: rs.length ? +((an / rs.length) * 100).toFixed(1) : 0,
        records: rs.length,
      };
    });
  }, [records, selected]);

  if (!ready) {
    return (
      <AppShell title="Enumerator Analytics" subtitle="Loading field staff data…">
        <Skeleton className="h-[520px] rounded-2xl" />
      </AppShell>
    );
  }

  const chartData = stats.slice(0, 15).map((s) => ({ name: s.key, rate: s.rate }));

  return (
    <AppShell
      title="Enumerator analytics"
      subtitle={`Peer-group average anomaly rate is ${avg}% — enumerators far above it may need support or supervision`}
    >
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <section className="glass-card overflow-hidden rounded-2xl">
          <div className="border-b border-border px-5 py-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Users className="size-4 text-primary" /> Enumerator leaderboard
            </h2>
            <p className="text-xs text-muted-foreground">Sorted by anomaly rate, highest first. Click a row for details.</p>
          </div>
          <div className="max-h-[440px] overflow-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Enumerator</th>
                  <th className="px-5 py-3 font-medium">Records</th>
                  <th className="px-5 py-3 font-medium">Anomaly rate</th>
                  <th className="px-5 py-3 font-medium">Risk</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((s) => (
                  <tr
                    key={s.key}
                    onClick={() => setSelectedId(s.key)}
                    className={cn(
                      "cursor-pointer border-b border-border/60 transition-colors last:border-0 hover:bg-accent/40",
                      selected?.key === s.key && "bg-accent/50",
                    )}
                  >
                    <td className="px-5 py-3 font-medium">{s.key}</td>
                    <td className="px-5 py-3 tabular-nums">{s.records}</td>
                    <td className="px-5 py-3 tabular-nums">
                      {s.rate}%{" "}
                      <span className="text-xs text-muted-foreground">
                        ({s.rate >= avg ? "+" : ""}{(s.rate - avg).toFixed(1)} vs peers)
                      </span>
                    </td>
                    <td className="px-5 py-3"><RiskBadge level={scoreToLevel(s.riskScore)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="glass-card rounded-2xl p-5">
            <h2 className="text-sm font-semibold">Top 15 vs peer average</h2>
            <p className="text-xs text-muted-foreground">Dashed line shows the peer-group average of {avg}%</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 16, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={10} interval={0} angle={-45} textAnchor="end" height={50} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}%`, "Anomaly rate"]} />
                  <ReferenceLine y={avg} stroke="var(--chart-5)" strokeDasharray="4 4" />
                  <Bar dataKey="rate" radius={[6, 6, 0, 0]}>
                    {chartData.map((d) => (
                      <Cell key={d.name} fill={riskColor(scoreToLevel(Math.min(100, d.rate * 3)))} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {selected && (
            <div className="glass-card rounded-2xl p-5">
              <h2 className="text-sm font-semibold">Enumerator {selected.key}</h2>
              <p className="text-xs text-muted-foreground">
                {selected.records} records · {selected.anomalies} flagged · {selected.rate}% anomaly rate
              </p>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend} margin={{ top: 20, right: 8, left: -22, bottom: 0 }}>
                    <CartesianGrid stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="period" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}%`, "Anomaly rate"]} />
                    <Line type="monotone" dataKey="rate" stroke="var(--risk-high)" strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {selected.topReasons.length > 0 && (
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {selected.topReasons.slice(0, 3).map((r) => (
                    <li key={r.reason} className="flex gap-2">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                      {r.reason}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </aside>
      </div>
    </AppShell>
  );
}
