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
  component: Enumerators;
});

function Enumerators() {
  return null;
}
