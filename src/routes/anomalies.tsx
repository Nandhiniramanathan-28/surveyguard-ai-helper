import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, Inbox } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { RiskBadge, ScorePill } from "@/components/RiskBadge";
import { InvestigationDialog } from "@/components/InvestigationDialog";
import { useStore } from "@/lib/store";
import { isAnomaly } from "@/lib/analytics";
import { PERIODS, RISK_LEVELS, STATES, type AnomalyType, type RiskLevel, type SurveyRecord } from "@/lib/mockData";

export const Route = createFileRoute("/anomalies")({
  head: () => ({
    meta: [
      { title: "Anomaly Explorer — SurveyGuard AI" },
      { name: "description", content: "Search, filter and sort every flagged survey record, then open an AI investigation to see exactly why it was flagged." },
      { property: "og:title", content: "Anomaly Explorer — SurveyGuard AI" },
      { property: "og:description", content: "A ranked, filterable list of survey records that need a supervisor's review." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Explorer,
});

const TYPES: { value: AnomalyType; label: string }[] = [
  { value: "rule", label: "Rule violation" },
  { value: "statistical", label: "Statistical deviation" },
  { value: "ml", label: "ML anomaly" },
  { value: "enumerator", label: "Enumerator pattern" },
  { value: "cluster", label: "Cluster pattern" },
  { value: "historical", label: "Historical drift" },
];

const PAGE_SIZE = 12;
const selectCls =
  "h-9 w-full rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

function Explorer() {
  const { records, ready } = useStore();
  const [q, setQ] = useState("");
  const [state, setState] = useState("all");
  const [district, setDistrict] = useState("all");
  const [enumerator, setEnumerator] = useState("all");
  const [level, setLevel] = useState("all");
  const [period, setPeriod] = useState("all");
  const [type, setType] = useState("all");
  const [sort, setSort] = useState<"score" | "id" | "district">("score");
  const [page, setPage] = useState(0);
  const [active, setActive] = useState<SurveyRecord | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const enumerators = useMemo(
    () => [...new Set(records.map((r) => r.enumeratorId))].sort(),
    [records],
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const rows = records.filter((r) => {
      if (!isAnomaly(r)) return false;
      if (state !== "all" && r.state !== state) return false;
      if (district !== "all" && r.district !== district) return false;
      if (enumerator !== "all" && r.enumeratorId !== enumerator) return false;
      if (level !== "all" && r.riskLevel !== level) return false;
      if (period !== "all" && r.period !== period) return false;
      if (type !== "all" && !r.types.includes(type as AnomalyType)) return false;
      if (term) {
        const hay = `${r.id} ${r.state} ${r.district} ${r.enumeratorId} ${r.reasons.join(" ")}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
    rows.sort((a, b) =>
      sort === "score" ? b.riskScore - a.riskScore : sort === "id" ? a.id.localeCompare(b.id) : a.district.localeCompare(b.district),
    );
    return rows;
  }, [records, q, state, district, enumerator, level, period, type, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const rows = filtered.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);
  const districts = state === "all" ? [] : (STATES[state] ?? []);

  const reset = () => {
    setQ("");
    setState("all");
    setDistrict("all");
    setEnumerator("all");
    setLevel("all");
    setPeriod("all");
    setType("all");
    setPage(0);
  };

  if (!ready) {
    return (
      <AppShell title="Anomaly Explorer" subtitle="Loading flagged records…">
        <Skeleton className="h-[520px] rounded-2xl" />
      </AppShell>
    );
  }

  const filters = (
    <div className="glass-card space-y-4 rounded-2xl p-5">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <SlidersHorizontal className="size-4 text-primary" /> Filters
      </div>
      <div className="space-y-1.5">
        <Label>State</Label>
        <select className={selectCls} value={state} onChange={(e) => { setState(e.target.value); setDistrict("all"); setPage(0); }}>
          <option value="all">All states</option>
          {Object.keys(STATES).map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label>District</Label>
        <select className={selectCls} value={district} disabled={state === "all"} onChange={(e) => { setDistrict(e.target.value); setPage(0); }}>
          <option value="all">{state === "all" ? "Choose a state first" : "All districts"}</option>
          {districts.map((d) => <option key={d}>{d}</option>)}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label>Enumerator</Label>
        <select className={selectCls} value={enumerator} onChange={(e) => { setEnumerator(e.target.value); setPage(0); }}>
          <option value="all">All enumerators</option>
          {enumerators.map((e) => <option key={e}>{e}</option>)}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label>Risk level</Label>
        <select className={selectCls} value={level} onChange={(e) => { setLevel(e.target.value); setPage(0); }}>
          <option value="all">All levels</option>
          {RISK_LEVELS.map((l) => <option key={l}>{l}</option>)}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label>Survey period</Label>
        <select className={selectCls} value={period} onChange={(e) => { setPeriod(e.target.value); setPage(0); }}>
          <option value="all">All periods</option>
          {PERIODS.map((p) => <option key={p}>{p}</option>)}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label>Type of signal</Label>
        <select className={selectCls} value={type} onChange={(e) => { setType(e.target.value); setPage(0); }}>
          <option value="all">All types</option>
          {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>
      <Button variant="outline" className="w-full" onClick={reset}>Clear all filters</Button>
    </div>
  );

  return (
    <AppShell
      title="Anomaly Explorer"
      subtitle={`${filtered.length.toLocaleString("en-IN")} records match your filters — highest risk first`}
      actions={
        <Button variant="outline" className="lg:hidden" onClick={() => setShowFilters((v) => !v)}>
          <SlidersHorizontal className="size-4" /> Filters
        </Button>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className={showFilters ? "block" : "hidden lg:block"}>{filters}</div>

        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="relative min-w-56 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => { setQ(e.target.value); setPage(0); }}
                placeholder="Search by record ID, district, enumerator or reason"
                className="pl-9"
              />
            </div>
            <select className={`${selectCls} w-auto`} value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
              <option value="score">Sort: risk score</option>
              <option value="id">Sort: record ID</option>
              <option value="district">Sort: district</option>
            </select>
          </div>

          {rows.length === 0 ? (
            <div className="glass-card flex flex-col items-center rounded-2xl px-6 py-16 text-center">
              <Inbox className="size-8 text-muted-foreground" />
              <p className="mt-4 text-sm font-medium">No records match these filters</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                That is good news — nothing here needs review. Try clearing a filter to widen the search.
              </p>
              <Button variant="outline" className="mt-5" onClick={reset}>Clear all filters</Button>
            </div>
          ) : (
            <div className="glass-card overflow-hidden rounded-2xl">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Record</th>
                      <th className="px-4 py-3 font-medium">Location</th>
                      <th className="px-4 py-3 font-medium">Enumerator</th>
                      <th className="px-4 py-3 font-medium">Risk score</th>
                      <th className="px-4 py-3 font-medium">Level</th>
                      <th className="px-4 py-3 font-medium">Main reason</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id} className="border-b border-border/60 transition-colors last:border-0 hover:bg-accent/40">
                        <td className="px-4 py-3 font-medium">{r.id}</td>
                        <td className="px-4 py-3">
                          <span className="block">{r.district}</span>
                          <span className="text-xs text-muted-foreground">{r.state} · {r.period}</span>
                        </td>
                        <td className="px-4 py-3">{r.enumeratorId}</td>
                        <td className="px-4 py-3"><ScorePill score={r.riskScore} /></td>
                        <td className="px-4 py-3"><RiskBadge level={r.riskLevel as RiskLevel} /></td>
                        <td className="max-w-72 px-4 py-3 text-muted-foreground">
                          <span className="line-clamp-2">{r.reasons[0] ?? "Statistical review threshold exceeded"}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button size="sm" variant="outline" onClick={() => setActive(r)}>Investigate</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm">
                <span className="text-muted-foreground">Page {current + 1} of {pages}</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={current === 0} onClick={() => setPage(current - 1)}>Previous</Button>
                  <Button size="sm" variant="outline" disabled={current >= pages - 1} onClick={() => setPage(current + 1)}>Next</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <InvestigationDialog record={active} onClose={() => setActive(null)} />
    </AppShell>
  );
}
