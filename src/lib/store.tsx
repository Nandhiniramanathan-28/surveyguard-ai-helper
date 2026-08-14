import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { generateDataset, type SurveyRecord } from "./mockData";

interface Session {
  name: string;
  role: string;
}

interface StoreValue {
  records: SurveyRecord[];
  ready: boolean;
  session: Session | null;
  signIn: (s: Session) => void;
  signOut: () => void;
  regenerate: (fileName?: string) => void;
  fileName: string;
  theme: "dark" | "light";
  toggleTheme: () => void;
}

const Ctx = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<SurveyRecord[]>([]);
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [fileName, setFileName] = useState("plfs_q2_2026_sample.csv");
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const t = window.setTimeout(() => {
      setRecords(generateDataset(20260814));
      setReady(true);
    }, 350);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const regenerate = useCallback((name?: string) => {
    if (name) setFileName(name);
    setRecords(generateDataset(Math.floor(Math.random() * 100000)));
    setReady(true);
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      records,
      ready,
      session,
      signIn: setSession,
      signOut: () => setSession(null),
      regenerate,
      fileName,
      theme,
      toggleTheme: () => setTheme((t) => (t === "dark" ? "light" : "dark")),
    }),
    [records, ready, session, regenerate, fileName, theme],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
