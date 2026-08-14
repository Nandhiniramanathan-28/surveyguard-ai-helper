import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { TrendingUp, AlertTriangle } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { AppShell } from "@/components/AppShell";
import { Skeleton } from "@/components/ui/skeleton";
import { useStore } from "@/lib/store";
import { periodTrend } from "@/lib/analytics";
import { inr } from "@/lib/mockData";

export const Route = createFileRoute("/trends")({
  head: () => ({
    meta: [
      { title: "Historical Trends — SurveyGuard AI" },
      { name: "description", content: "Compare the current survey period against previous quarters and see when significant temporal drift is detected." },
      { property: "og:title", content: "Historical Trends — SurveyGuard AI" },
      { property: "og:description", content: "Quarter-on-quarter comparison of anomaly rates, income and working hours." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Trends,
});

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  color: "var(--popover-foreground)",
};

function Trends() {
  const { records, ready } = useStore();
  const trend = useMemo(() => periodTrend(records), [records]);

  if (!ready) {
    return (
      <AppShell title="Historical Trends" subtitle="Loading past periods…">
        <Skeleton className="h-[520px] rounded-2xl" />
      </AppShell>
    );
  }

  const current = trend[trend.length - 1];
  const previous = trend[trend.length - 2];
  const drift = current && previous ? current.rate - previous.rate : 0;
  const significant = Math.abs(drift) >= 2;

  return (
    <AppShell
      title="Historical trends"
      subtitle="How this period compares with previous survey rounds"
    >
      {significant && current && previous && (
        <div className="glass-card mb-6 flex items-start gap-3 rounded-2xl border-l-4 p-5" style={{ borderLeftColor: "var(--risk-high)" }}>
          <AlertTriangle className="mt-0.5 size-5" style={{ color: "var(--risk-high)" }} />
          <div>
            <p className="text-sm font-semibold">Significant temporal drift detected</p>
            <p className="mt-1 text-sm text-muted-foreground">
              The anomaly rate moved from {previous.rate}% in {previous.period} to {current.rate}% in {current.period}
              {" "}({drift > 0 ? "+" : ""}{drift.toFixed(1)} points). It is worth checking whether field procedures or
              enumerator assignments changed between these rounds.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="glass-card rounded-2xl p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <TrendingUp className="size-4 text-primary" /> Anomaly rate by period
          </h2>
          <div className="mt-2 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 16, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="rateFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--risk-high)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--risk-high)" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="period" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}%`, "Anomaly rate"]} />
                <Area type="monotone" dataKey="rate" stroke="var(--risk-high)" strokeWidth={2.5} fill="url(#rateFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="glass-card rounded-2xl p-5">
          <h2 className="text-sm font-semibold">Average reported income by period</h2>
          <div className="mt-2 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 16, right: 8, left: 6, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="period" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={70} tickFormatter={(v: number) => `₹${Math.round(v / 1000)}k`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [inr(v), "Average income"]} />
                <Line type="monotone" dataKey="avgIncome" stroke="var(--chart-5)" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="glass-card rounded-2xl p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold">Period-by-period summary</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-3 font-medium">Period</th>
                  <th className="py-3 font-medium">Records</th>
                  <th className="py-3 font-medium">Flagged</th>
                  <th className="py-3 font-medium">Anomaly rate</th>
                  <th className="py-3 font-medium">Avg income</th>
                  <th className="py-3 font-medium">Avg hours/week</th>
                </tr>
              </thead>
              <tbody>
                {trend.map((t) => (
                  <tr key={t.period} className="border-b border-border/60 last:border-0">
                    <td className="py-3 font-medium">{t.period}</td>
                    <td className="py-3 tabular-nums">{t.records}</td>
                    <td className="py-3 tabular-nums">{t.anomalies}</td>
                    <td className="py-3 tabular-nums">{t.rate}%</td>
                    <td className="py-3 tabular-nums">{inr(t.avgIncome)}</td>
                    <td className="py-3 tabular-nums">{t.avgHours}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
