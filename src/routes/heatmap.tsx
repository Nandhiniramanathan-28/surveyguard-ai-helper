import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MapPin } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Skeleton } from "@/components/ui/skeleton";
import { RiskBadge } from "@/components/RiskBadge";
import { useStore } from "@/lib/store";
import { byDistrict, riskColor, scoreToLevel, type GroupStat } from "@/lib/analytics";
import { STATES } from "@/lib/mockData";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/heatmap")({
  head: () => ({
    meta: [
      { title: "Geographic Risk Heatmap — SurveyGuard AI" },
      { name: "description", content: "See which Indian states and districts carry the highest survey data risk, shaded from green to red." },
      { property: "og:title", content: "Geographic Risk Heatmap — SurveyGuard AI" },
      { property: "og:description", content: "District-level risk shading with anomaly counts and top contributing issues." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Heatmap,
});

function Heatmap() {
  const { records, ready } = useStore();
  const stats = useMemo(() => byDistrict(records), [records]);
  const [selected, setSelected] = useState<GroupStat | null>(null);

  const byState = useMemo(() => {
    const map = new Map<string, GroupStat[]>();
    for (const s of stats) {
      const key = s.state ?? "Other";
      const arr = map.get(key);
      if (arr) arr.push(s);
      else map.set(key, [s]);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [stats]);

  if (!ready) {
    return (
      <AppShell title="Geographic Risk Heatmap" subtitle="Loading district risk…">
        <Skeleton className="h-[520px] rounded-2xl" />
      </AppShell>
    );
  }

  const panel = selected ?? stats[0] ?? null;

  return (
    <AppShell
      title="Geographic risk heatmap"
      subtitle="Each tile is a district. Darker red means more records need review — click a tile for details."
    >
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <section className="glass-card rounded-2xl p-5">
          <div className="mb-5 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span>Risk scale:</span>
            {(["Low", "Medium", "High", "Critical"] as const).map((l) => (
              <span key={l} className="inline-flex items-center gap-1.5">
                <span className="size-3 rounded" style={{ backgroundColor: riskColor(l) }} />
                {l}
              </span>
            ))}
          </div>

          <div className="space-y-6">
            {byState.map(([state, districts]) => (
              <div key={state}>
                <h3 className="mb-2 text-sm font-semibold">{state}</h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {(STATES[state] ?? districts.map((d) => d.key)).map((name) => {
                    const d = districts.find((x) => x.key === name);
                    const score = d?.riskScore ?? 0;
                    const level = scoreToLevel(score);
                    const isActive = panel?.key === name && panel.state === state;
                    return (
                      <button
                        key={name}
                        onClick={() => d && setSelected(d)}
                        className={cn(
                          "rounded-xl border p-3 text-left transition-all duration-200 hover:-translate-y-0.5",
                          isActive ? "ring-2 ring-primary" : "",
                        )}
                        style={{
                          backgroundColor: `color-mix(in oklab, ${riskColor(level)} ${18 + score * 0.55}%, transparent)`,
                          borderColor: `color-mix(in oklab, ${riskColor(level)} 40%, transparent)`,
                        }}
                      >
                        <span className="block truncate text-sm font-medium">{name}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          Risk {score} · {d?.anomalies ?? 0} flagged
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="glass-card h-fit rounded-2xl p-5 xl:sticky xl:top-28">
          {panel ? (
            <>
              <div className="flex items-center gap-2">
                <MapPin className="size-4 text-primary" />
                <h2 className="text-base font-semibold">{panel.key}</h2>
              </div>
              <p className="text-xs text-muted-foreground">{panel.state}</p>
              <div className="mt-4"><RiskBadge level={scoreToLevel(panel.riskScore)} /></div>
              <dl className="mt-5 space-y-3 text-sm">
                {[
                  ["Total records", panel.records.toLocaleString("en-IN")],
                  ["Flagged records", panel.anomalies.toLocaleString("en-IN")],
                  ["Anomaly rate", `${panel.rate}%`],
                  ["Average risk score", `${panel.riskScore}/100`],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between border-b border-border/60 pb-2">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="font-medium tabular-nums">{v}</dd>
                  </div>
                ))}
              </dl>
              <h3 className="mt-5 text-sm font-semibold">Top contributing issues</h3>
              {panel.topReasons.length ? (
                <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                  {panel.topReasons.map((r) => (
                    <li key={r.reason} className="flex gap-2">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                      <span>{r.reason} <span className="text-xs">({r.count})</span></span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">No issues recorded in this district.</p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Select a district to see its details.</p>
          )}
        </aside>
      </div>
    </AppShell>
  );
}
