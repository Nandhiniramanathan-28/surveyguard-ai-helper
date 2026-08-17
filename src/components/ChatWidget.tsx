import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Bot, Send, X, Sparkles, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store";
import { answerQuestion, SUGGESTIONS, type ChatAnswer } from "@/lib/chatEngine";
import { cn } from "@/lib/utils";

interface Message {
  id: number;
  role: "user" | "assistant";
  text: string;
  link?: ChatAnswer["link"];
}

const WELCOME: Message = {
  id: 0,
  role: "assistant",
  text: "Hi, I'm your SurveyGuard AI assistant. Ask me about any record, enumerator or district, or how the platform works — I'll answer from the data currently loaded.",
};

export function ChatWidget() {
  const { records } = useStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [nudge, setNudge] = useState(true);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking, open]);

  const ask = (text: string) => {
    const q = text.trim();
    if (!q || thinking) return;
    setInput("");
    setMessages((m) => [...m, { id: Date.now(), role: "user", text: q }]);
    setThinking(true);
    const answer = answerQuestion(q, records);
    const t = window.setTimeout(
      () => {
        setThinking(false);
        setMessages((m) => [...m, { id: Date.now() + 1, role: "assistant", text: answer.text, link: answer.link }]);
      },
      700 + Math.min(900, answer.text.length * 2),
    );
    timers.current.push(t);
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => {
            setOpen(true);
            setNudge(false);
          }}
          aria-label="Ask SurveyGuard AI"
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {nudge && (
            <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-primary/40" aria-hidden />
          )}
          <Bot className="size-5" />
          <span className="hidden sm:inline">Ask SurveyGuard AI</span>
        </button>
      )}

      {open && (
        <div className="glass-card animate-fade-up fixed bottom-5 right-5 z-50 flex h-[min(560px,80vh)] w-[min(380px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-3xl">
          <header className="flex items-center gap-3 border-b border-border px-4 py-3">
            <span className="grid size-9 place-items-center rounded-xl bg-primary/15 text-primary">
              <Sparkles className="size-4.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Ask SurveyGuard AI</p>
              <p className="text-[11px] text-muted-foreground">
                Grounded in the {records.length.toLocaleString("en-IN")} records loaded now
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close assistant">
              <X className="size-4" />
            </Button>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((m) => (
              <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                    m.role === "user"
                      ? "rounded-br-sm bg-primary text-primary-foreground"
                      : "rounded-bl-sm bg-muted text-foreground",
                  )}
                >
                  {m.text}
                  {m.link && (
                    <div>
                    <button
                      onClick={() => {
                        void navigate({ to: m.link!.to, search: m.link!.search ?? {} });
                        setOpen(false);
                      }}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                    >
                      {m.link.label} <ArrowUpRight className="size-3.5" />
                    </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {thinking && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm bg-muted px-4 py-3">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="size-1.5 animate-bounce rounded-full bg-muted-foreground/70"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            )}

            {messages.length === 1 && !thinking && (
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGGESTIONS.map((sug) => (
                  <button
                    key={sug}
                    onClick={() => ask(sug)}
                    className="rounded-full border border-border bg-background/60 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form
            className="flex items-center gap-2 border-t border-border p-3"
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about a record, district or term…"
              aria-label="Your question"
            />
            <Button type="submit" size="icon" disabled={!input.trim() || thinking} aria-label="Send question">
              <Send className="size-4" />
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
