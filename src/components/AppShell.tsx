import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Upload,
  Search,
  Map,
  Users,
  LineChart,
  FileText,
  ShieldCheck,
  Moon,
  Sun,
  Menu,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, hint: "Overall data health" },
  { to: "/upload", label: "Upload Data", icon: Upload, hint: "Add a new survey file" },
  { to: "/anomalies", label: "Anomaly Explorer", icon: Search, hint: "Records to review" },
  { to: "/heatmap", label: "Geographic Heatmap", icon: Map, hint: "Risk by district" },
  { to: "/enumerators", label: "Enumerators", icon: Users, hint: "Field staff patterns" },
  { to: "/trends", label: "Historical Trends", icon: LineChart, hint: "Change over time" },
  { to: "/reports", label: "Reports", icon: FileText, hint: "Summaries & export" },
] as const;

export function AppShell({
  title,
  subtitle,
  children,
  actions,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  const { session, theme, toggleTheme } = useStore();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  const nav = (
    <nav className="flex flex-col gap-1 p-3">
      {NAV.map((item) => {
        const active = path === item.to;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={() => setOpen(false)}
            className={cn(
              "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
            )}
          >
            <item.icon className="size-4.5 shrink-0" />
            <span className="flex flex-col">
              {item.label}
              <span className="text-[11px] font-normal text-muted-foreground/80">{item.hint}</span>
            </span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <Link to="/" className="flex items-center gap-3 px-5 py-6">
          <span className="grid size-9 place-items-center rounded-xl bg-primary/15 text-primary">
            <ShieldCheck className="size-5" />
          </span>
          <span>
            <span className="block text-base font-semibold tracking-tight">SurveyGuard AI</span>
            <span className="block text-[11px] text-muted-foreground">PLFS data assurance</span>
          </span>
        </Link>
        {nav}
        <div className="mt-auto border-t border-sidebar-border p-4 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">{session?.name ?? "Guest supervisor"}</p>
          <p>{session?.role ?? "Supervisor"}</p>
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 border-r border-sidebar-border bg-sidebar">
            <div className="flex items-center justify-between px-5 py-5">
              <span className="text-base font-semibold">SurveyGuard AI</span>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close menu">
                <X className="size-4" />
              </Button>
            </div>
            {nav}
          </div>
        </div>
      )}

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-border bg-background/80 px-4 py-4 backdrop-blur-xl sm:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold tracking-tight sm:text-xl">{title}</h1>
            {subtitle && <p className="truncate text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2">
            {actions}
            <Button variant="outline" size="icon" onClick={toggleTheme} aria-label="Toggle colour theme">
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
          </div>
        </header>
        <main className="animate-fade-up px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
