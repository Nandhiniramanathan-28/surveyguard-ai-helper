import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { UploadCloud, FileSpreadsheet, Check, Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/upload")({
  head: () => ({
    meta: [
      { title: "Upload Survey Data — SurveyGuard AI" },
      { name: "description", content: "Upload a PLFS survey file and watch SurveyGuard AI validate, profile and risk-score every record." },
      { property: "og:title", content: "Upload Survey Data — SurveyGuard AI" },
      { property: "og:description", content: "Drag in a survey file and get a ranked list of records that need review." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UploadPage,
});

const STEPS = [
  "Profiling the file",
  "Preprocessing & cleaning",
  "Rule validation",
  "Statistical analysis",
  "ML anomaly detection",
  "Historical comparison",
  "Risk scoring",
  "Done",
];

function UploadPage() {
  const { regenerate } = useStore();
  const navigate = useNavigate();
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<string | null>(null);
  const [step, setStep] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step < 0) return;
    if (step >= STEPS.length) {
      const t = window.setTimeout(() => void navigate({ to: "/dashboard" }), 700);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => setStep((s) => s + 1), 600);
    return () => window.clearTimeout(t);
  }, [step, navigate]);

  const start = (name: string) => {
    setFile(name);
    regenerate(name);
    setStep(0);
  };

  const progress = step < 0 ? 0 : Math.min(100, Math.round((step / STEPS.length) * 100));

  return (
    <AppShell
      title="Upload survey data"
      subtitle="Step 1 of 2 — add the file you want SurveyGuard AI to check"
    >
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files?.[0];
            start(f?.name ?? "plfs_sample.csv");
          }}
          className={cn(
            "glass-card flex flex-col items-center justify-center rounded-3xl border-2 border-dashed p-10 text-center transition-colors",
            dragging ? "border-primary bg-primary/8" : "border-border",
          )}
        >
          <span className="grid size-16 place-items-center rounded-2xl bg-primary/12 text-primary">
            <UploadCloud className="size-8" />
          </span>
          <h2 className="mt-5 text-lg font-semibold">Drag your survey file here</h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Accepted formats: CSV or Excel (.xlsx). One row per surveyed person. Nothing leaves your browser.
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => start(e.target.files?.[0]?.name ?? "plfs_sample.csv")}
          />
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button onClick={() => inputRef.current?.click()}>Choose a file</Button>
            <Button variant="outline" onClick={() => start("plfs_q2_2026_sample.csv")}>
              Use the sample PLFS file
            </Button>
          </div>
        </section>

        <section className="glass-card rounded-3xl p-6">
          {file ? (
            <>
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="size-5 text-primary" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{file}</p>
                  <p className="text-xs text-muted-foreground">Analysing your records</p>
                </div>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <ol className="mt-6 space-y-3">
                {STEPS.map((label, i) => {
                  const state = step > i ? "done" : step === i ? "active" : "idle";
                  return (
                    <li key={label} className="flex items-center gap-3 text-sm">
                      <span
                        className={cn(
                          "grid size-6 place-items-center rounded-full border text-[11px] transition-colors",
                          state === "done" && "border-[var(--risk-low)] bg-[color-mix(in_oklab,var(--risk-low)_18%,transparent)] text-[var(--risk-low)]",
                          state === "active" && "border-primary text-primary",
                          state === "idle" && "border-border text-muted-foreground",
                        )}
                      >
                        {state === "done" ? <Check className="size-3.5" /> : state === "active" ? <Loader2 className="size-3.5 animate-spin" /> : i + 1}
                      </span>
                      <span className={state === "idle" ? "text-muted-foreground" : "font-medium"}>{label}</span>
                    </li>
                  );
                })}
              </ol>
            </>
          ) : (
            <div className="flex h-full flex-col justify-center">
              <h3 className="text-sm font-semibold">What happens next?</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Once your file is added, SurveyGuard AI runs eight checks — from simple validation rules to
                statistical and machine-learning models — and gives every record a risk score out of 100.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                You will then be taken to your dashboard, where the records that most need your attention appear
                at the top.
              </p>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
