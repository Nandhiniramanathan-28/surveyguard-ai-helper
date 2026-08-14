import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Download, Printer, FileText } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RiskBadge } from "@/components/RiskBadge";
import { useStore } from "@/lib/store";
import { byDistrict, byEnumerator, isAnomaly, peerAverage, summarize } from "@/lib/analytics";
import { RISK_LEVELS } from "@/lib/mockData";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports & Export — SurveyGuard AI" },
      { name: "description", content: "Generate a supervisor-ready summary of survey data quality and export flagged records as CSV or PDF." },
      { property: "og:title", content: "Reports & Export — SurveyGuard AI" },
      { property: "og:description", content: "A clean, printable summary of data quality with one-click CSV export." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Reports,
});

function Reports() {
  const { records, ready, fileName, session } = useStore();
  const s = useMemo(() => summarize(records), [records]);
  const districts = useMemo(() => byDistrict(records).slice(0, 8), [records]);
  const enums = useMemo(() => byEnumerator(records), [records]);
  const avg = peerAverage(enums);

  if (!ready) {
    return (
      <AppShell title="Reports" subtitle="Preparing your summary…">
        <Skeleton className="h-[520px] rounded-2xl" />
      </AppShell>
    );
  }

  const exportCsv = () => {
    const flagged = records.filter(isAnomaly);
    const header = [
      "Record ID","State","District","Cluster","Household","Enumerator","Period","Age","Gender",
      "Household Size","Employment","Income","Working Hours","Area","Risk Score","Risk Level","Reasons",
    ];
    const rows = flagged.map((r) =>
      [r.id, r.state, r.district, r.clusterId, r.householdId, r.enumeratorId, r.period, r.age, r.gender,
        r.householdSize, r.employment, r.income, r.workingHours, r.area, r.riskScore, r.riskLevel,
        r.reasons.join(" | ")]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "surveyguard-flagged-records.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell
      title="Summary report"
      subtitle="A shareable overview of this file's data quality"
      actions={
        <>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="size-4" /> Print / PDF
          </Button>
          <Button onClick={exportCsv}>
            <Download className="size-4" /> Export CSV
          </Button>
        </>
      }
    >
      <article className="glass-card mx-auto max-w-4xl rounded-2xl p-6 sm:p-10">
        <header className="flex items-start gap-3 border-b border-border pb-6">
          <FileText className="mt-1 size-5 text-primary" />
          <div>
            <h2 className="text-xl font-semibold tracking-tight">PLFS data quality report</h2>
            <p className="text-sm text-muted-foreground">
              File: {fileName} · Prepared for {session?.name ?? "Supervisor"} ({session?.role ?? "Supervisor"})
            </p>
          </div>
        </header>

        <section className="mt-6">
          <h3 className="text-sm font-semibold">Headline findings</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {s.total.toLocaleString("en-IN")} survey records were checked. {s.anomalies.toLocaleString("en-IN")} records
            ({s.rate.toFixed(1)}%) carry signals that require review, of which {s.critical} are critical and should be
            re-verified before the data is finalised. The peer-group average anomaly rate across {enums.length}{" "}
            enumerators is {avg}%.
          </p>
        </section>

        <section className="mt-6">
          <h3 className="text-sm font-semibold">Records by risk level</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            {RISK_LEVELS.map((l) => (
              <div key={l} className="rounded-xl border border-border p-4">
                <RiskBadge level={l} />
                <p className="mt-2 text-2xl font-semibold tabular-nums">{s.counts[l].toLocaleString("en-IN")}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6">
          <h3 className="text-sm font-semibold">Districts needing the most attention</h3>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 font-medium">District</th>
                <th className="py-2 font-medium">State</th>
                <th className="py-2 font-medium">Records</th>
                <th className="py-2 font-medium">Flagged</th>
                <th className="py-2 font-medium">Risk score</th>
              </tr>
            </thead>
            <tbody>
              {districts.map((d) => (
                <tr key={`${d.state}-${d.key}`} className="border-b border-border/60 last:border-0">
                  <td className="py-2 font-medium">{d.key}</td>
                  <td className="py-2 text-muted-foreground">{d.state}</td>
                  <td className="py-2 tabular-nums">{d.records}</td>
                  <td className="py-2 tabular-nums">{d.anomalies} ({d.rate}%)</td>
                  <td className="py-2 tabular-nums">{d.riskScore}/100</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mt-6">
          <h3 className="text-sm font-semibold">Enumerators above the peer average</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {enums.slice(0, 5).map((e) => (
              <li key={e.key} className="flex gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                Enumerator {e.key} — {e.rate}% anomaly rate across {e.records} records
                ({(e.rate - avg).toFixed(1)} points vs peers). Recommended: routine review of recent submissions.
              </li>
            ))}
          </ul>
        </section>

        <footer className="mt-8 border-t border-border pt-4 text-xs text-muted-foreground">
          All findings are statistical signals that require review and are not evidence of wrongdoing. Data shown in this
          demo is synthetic.
        </footer>
      </article>
    </AppShell>
  );
}
