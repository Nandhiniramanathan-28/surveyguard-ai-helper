import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldCheck, Sparkles, Map, Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SurveyGuard AI — Survey Data Validation for Supervisors" },
      {
        name: "description",
        content:
          "SurveyGuard AI flags suspicious or unusual PLFS survey records and explains why, so supervisors know exactly what to review first.",
      },
      { property: "og:title", content: "SurveyGuard AI — Survey Data Validation" },
      {
        property: "og:description",
        content: "An AI assistant that reviews survey data, flags unusual records and explains every decision in plain language.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: Sparkles, title: "Explains every flag", text: "Each flagged record comes with plain-language reasons — never just a score." },
  { icon: Map, title: "See risk on the map", text: "Spot districts that need attention before the data is finalised." },
  { icon: Users, title: "Compare field staff", text: "Understand which enumerators differ from their peer group, and why." },
];

function Landing() {
  const { signIn } = useStore();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [role, setRole] = useState("Supervisor");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-6">
        <span className="grid size-9 place-items-center rounded-xl bg-primary/15 text-primary">
          <ShieldCheck className="size-5" />
        </span>
        <span className="text-base font-semibold tracking-tight">SurveyGuard AI</span>
      </header>

      <main className="mx-auto grid max-w-6xl gap-12 px-6 pb-20 pt-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div className="animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-[var(--risk-low)]" />
            Built for PLFS survey supervisors
          </span>
          <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            An AI system that flags suspicious or unusual survey records — and explains why.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">
            Upload your survey file and SurveyGuard AI checks every record against validation rules, statistical
            patterns and past periods. You get a clear, ranked list of what to review first.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="glass-card rounded-2xl p-4">
                <f.icon className="size-5 text-primary" />
                <p className="mt-3 text-sm font-medium">{f.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{f.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card animate-fade-up rounded-3xl p-6 sm:p-8">
          <h2 className="text-xl font-semibold tracking-tight">Sign in to continue</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            No password needed for this demo — just tell us who you are.
          </p>
          <form
            className="mt-6 space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              signIn({ name: name.trim() || "Supervisor", role });
              void navigate({ to: "/upload" });
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="name">Your name</Label>
              <Input id="name" placeholder="e.g. A. Ramesh" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Your role</Label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option>Supervisor</option>
                <option>Senior Supervisor</option>
                <option>District Officer</option>
                <option>State Coordinator</option>
              </select>
            </div>
            <Button type="submit" className="w-full" size="lg">
              Enter SurveyGuard AI
              <ArrowRight className="size-4" />
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              {"\n"}
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
