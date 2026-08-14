import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RiskBadge } from "@/components/RiskBadge";
import { Sparkles, AlertTriangle, CheckCircle2 } from "lucide-react";
import { inr, recommendation, type SurveyRecord } from "@/lib/mockData";
import { riskColor } from "@/lib/analytics";

function useReveal(items: string[], active: boolean) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!active) {
      setCount(0);
      return;
    }
    setCount(0);
    const id = window.setInterval(() => {
      setCount((c) => {
        if (c >= items.length) {
          window.clearInterval(id);
          return c;
        }
        return c + 1;
      });
    }, 550);
    return () => window.clearInterval(id);
  }, [active, items.length]);
  return count;
}

export function InvestigationDialog({
  record,
  onClose,
}: {
  record: SurveyRecord | null;
  onClose: () => void;
}) {
  const open = !!record;
  const reasons = record?.reasons.length
    ? record.reasons
    : ["No rule, statistical or model signal exceeded its review threshold for this record."];
  const shown = useReveal(reasons, open);
  const done = shown >= reasons.length;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        {record && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-left">
                <Sparkles className="size-5 text-primary" />
                AI Investigation — {record.id}
              </DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="glass-card rounded-xl p-4">
                <p className="text-xs text-muted-foreground">Risk score</p>
                <p className="text-3xl font-semibold tabular-nums" style={{ color: riskColor(record.riskLevel) }}>
                  {record.riskScore}
                </p>
                <div className="mt-2">
                  <RiskBadge level={record.riskLevel} />
                </div>
              </div>
              <div className="glass-card rounded-xl p-4 sm:col-span-2">
                <p className="text-xs text-muted-foreground">Record details</p>
                <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <div><dt className="inline text-muted-foreground">Location: </dt><dd className="inline">{record.district}, {record.state}</dd></div>
                  <div><dt className="inline text-muted-foreground">Enumerator: </dt><dd className="inline">{record.enumeratorId}</dd></div>
                  <div><dt className="inline text-muted-foreground">Period: </dt><dd className="inline">{record.period}</dd></div>
                  <div><dt className="inline text-muted-foreground">Area: </dt><dd className="inline">{record.area}</dd></div>
                  <div><dt className="inline text-muted-foreground">Age: </dt><dd className="inline">{record.age}</dd></div>
                  <div><dt className="inline text-muted-foreground">Household: </dt><dd className="inline">{record.householdSize} members</dd></div>
                  <div><dt className="inline text-muted-foreground">Status: </dt><dd className="inline">{record.employment}</dd></div>
                  <div><dt className="inline text-muted-foreground">Income: </dt><dd className="inline">{inr(record.income)}</dd></div>
                  <div><dt className="inline text-muted-foreground">Hours/week: </dt><dd className="inline">{record.workingHours}</dd></div>
                  <div><dt className="inline text-muted-foreground">Cluster: </dt><dd className="inline">{record.clusterId}</dd></div>
                </dl>
              </div>
            </div>

            <section className="glass-card rounded-xl p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <AlertTriangle className="size-4 text-primary" />
                Why was this flagged?
              </h3>
              <ul className="mt-3 space-y-2.5">
                {reasons.slice(0, shown).map((r) => (
                  <li key={r} className="animate-fade-up flex gap-2.5 text-sm leading-relaxed">
                    <span
                      className="mt-1.5 size-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: riskColor(record.riskLevel) }}
                    />
                    {r}
                  </li>
                ))}
              </ul>
              {!done && (
                <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex gap-1">
                    <span className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.2s]" />
                    <span className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.1s]" />
                    <span className="size-1.5 animate-bounce rounded-full bg-primary" />
                  </span>
                  Reviewing signals for this record…
                </p>
              )}
            </section>

            {done && (
              <section className="animate-fade-up rounded-xl border border-primary/30 bg-primary/8 p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <CheckCircle2 className="size-4 text-primary" />
                  Recommended investigation
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{recommendation(record)}</p>
                <p className="mt-3 text-xs text-muted-foreground/80">
                  These are statistical signals that require review — they are not proof of any wrongdoing.
                </p>
              </section>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
