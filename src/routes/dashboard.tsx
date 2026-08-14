import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Database,
  ShieldCheck,
  AlertTriangle,
  Flame,
  Activity,
  Percent,
  Search,
  Map,
  Users,
  Sparkles,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import { AppShell } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useStore } from "@/lib/store";
import { periodTrend, riskColor, riskDistribution, summarize } from "@/lib/analytics";
import type { RiskLevel } from "@/lib/mockData";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — SurveyGuard AI" },
      { name: "description", content: "See the overall health of your survey data: valid records, warnings, critical anomalies and trends over recent periods." },
      { property: "og:title", content: "Dashboard — SurveyGuard AI" },
      { property: "og:description", content: "Overall survey data health at a glance, with anomaly trends by period." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const QUICK = [
  { to: "/anomalies", icon: Search, title: "Anomaly Explorer", text: "Work through flagged records one by one." },
  { to: "/heatmap", icon: Map, title: "Geographic Heatmap", text: "See which districts need attention." },
  { to: "/enumerators", icon: Users, title: "Enumerator Analytics", text: "Compare field staff with their peers." },
  { to: "/reports", icon: Sparkles, title: "Reports & Export", text: "Share a summary with your team." },
] as const;

function Dashboard() {
  const { records, ready, fileName } = useStore();
  const s = summarize(records);
  const dist = riskDistribution(records);
  const trend = periodTrend(records);

  if (!ready) {
    return (
      <AppShell title="Dashboard" subtitle="Loading your survey data…">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="mt-6 h-80 rounded-2xl" />
      </AppShell>
    );
  }

  return (
    <AppShell title="Data health overview" subtitle={`Analysis of ${fileName} — ${s.total.toLocaleString("en-IN")} survey records`}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Total records" value={s.total} icon={Database} help="Rows checked in this file" />
        <StatCard label="Valid records" value={s.valid} icon={ShieldCheck} accent="var(--risk-low)" help="No meaningful signals found" />
        <StatCard label="Needs a look" value={s.warning} icon={AlertTriangle} accent="var(--risk-medium)" help="Medium and high risk records" />
        <StatCard label="Critical records" value={s.critical} icon={Flame} accent="var(--risk-critical)" help="Review these first" />
        <StatCard label="Total anomalies" value={s.anomalies} icon={Activity} help="Records above the review threshold" />
        <StatCard label="Anomaly rate" value={s.rate} suffix="%" decimals={1} icon={Percent} help="Share of records needing review" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="glass-card rounded-2xl p-5">
          <h2 className="text-sm font-semibold">Risk distribution</h2>
          <p className="text-xs text-muted-foreground">How your records are spread across risk levels</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={dist} dataKey="value" nameKey="level" innerRadius={65} outerRadius={100} paddingAngle={3} stroke="none">
                  {dist.map((d) => (
                    <Cell key={d.level} fill={riskColor(d.level as RiskLevel)} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--popover-foreground)" }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="glass-card rounded-2xl p-5">
          <h2 className="text-sm font-semibold">Anomalies over recent survey periods</h2>
          <p className="text-xs text-muted-foreground">Number of flagged records and the anomaly rate per quarter</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 20, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="period" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--popover-foreground)" }}
                />
                <Legend />
                <Line type="monotone" dataKey="anomalies" name="Flagged records" stroke="var(--risk-high)" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="rate" name="Anomaly rate (%)" stroke="var(--chart-5)" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {QUICK.map((q) => (
          <Link
            key={q.to}
            to={q.to}
            className="glass-card group rounded-2xl p-5 transition-transform duration-300 hover:-translate-y-0.5"
          >
            <q.icon className="size-5 text-primary" />
            <p className="mt-3 text-sm font-semibold">{q.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{q.text}</p>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
