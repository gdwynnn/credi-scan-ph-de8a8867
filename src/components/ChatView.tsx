import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, Send, Sparkles, ShieldCheck, FileText, Newspaper, Download, Shuffle, Lightbulb, ArrowRight } from "lucide-react";
import { downloadReportPdf } from "@/lib/report-pdf";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AnalysisResultView } from "@/components/AnalysisResultView";
import { MissingKeyBanner } from "@/components/MissingKeyBanner";
import { InvestigationStepper } from "@/components/InvestigationStepper";
import { hasOpenAIKey, runAssistant, type ChatTurn } from "@/lib/openai-client";
import {
  appendAssistantMessage,
  appendUserMessage,
  createThread,
  ensureThread,
  loadMessages,
  type MessageRow,
} from "@/lib/local-chats";

interface Props {
  threadId: string | null;
}

const STARTER_POOL = [
  "Totoo bang inaprubahan ni Marcos ang four-day work week?",
  "Did DepEd really remove Mathematics from the curriculum?",
  "Is it true that classes are suspended nationwide tomorrow?",
  "May Facebook post na sabi ₱10,000 ang matatanggap ng bawat estudyante. Totoo ba?",
  "Tataas ba talaga ang pamasahe sa MRT ngayong buwan?",
  "Is PhilHealth really giving free annual check-ups to all members?",
  "Totoo bang may bagong holiday na idineklara ng Malacañang?",
  "Did the LTO announce that old driver's licenses are no longer valid?",
  "May lumabas na balita na libre na ang tuition sa lahat ng SUCs. Totoo ba?",
  "Is PAGASA warning about a super typhoon hitting Luzon this week?",
  "Totoo bang ibabalik ang mandatory ROTC sa college?",
  "Did the BSP really release a new ₱1,000 polymer bill design?",
  "Is it true that SIM cards not registered will be deactivated again?",
  "May viral post na sabi may ayuda ang DSWD para sa lahat ng senior citizens. Totoo ba?",
];

function pickStarters(n = 4) {
  const a = [...STARTER_POOL];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

export function ChatView({ threadId }: Props) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [starters, setStarters] = useState<string[]>(() => STARTER_POOL.slice(0, 4));
  const [shuffleSpin, setShuffleSpin] = useState(0);
  const [attention, setAttention] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Randomize on the client only (avoids hydration mismatch)
  useEffect(() => {
    setStarters(pickStarters());
  }, [threadId]);

  // Sidebar asks us to nudge the user when "New investigation" is pressed on an empty canvas
  useEffect(() => {
    function onNudge() {
      setAttention(true);
      taRef.current?.focus();
      window.setTimeout(() => setAttention(false), 1600);
    }
    window.addEventListener("crediscan:nudge-input", onNudge);
    return () => window.removeEventListener("crediscan:nudge-input", onNudge);
  }, []);
  const endRef = useRef<HTMLDivElement>(null);

  // Load messages when thread changes
  useEffect(() => {
    if (threadId) {
      ensureThread(threadId);
      setMessages(loadMessages(threadId));
    } else {
      setMessages([]);
    }
  }, [threadId]);

  useEffect(() => {
    taRef.current?.focus();
  }, [threadId, sending]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, sending]);

  async function handleSend(textOverride?: string) {
    const text = (textOverride ?? input).trim();
    if (!text || sending) return;
    if (!hasOpenAIKey()) {
      toast.error("The AI key is not configured.");
      return;
    }

    setSending(true);
    setInput("");

    try {
      // Ensure a thread exists — create one on first send from the home page
      let tId = threadId;
      let created = false;
      if (!tId) {
        const t = createThread(text.slice(0, 60));
        tId = t.id;
        created = true;
      }

      // Optimistic + persist user message
      const savedUser = appendUserMessage(tId, text);
      setMessages((m) => [...m, savedUser]);

      // Build history from the messages we had before this send
      const history: ChatTurn[] = messages.map((m) => {
        if (m.role !== "assistant") return { role: m.role, content: m.content };
        const art = m.analysis?.article;
        const an = m.analysis?.analysis;
        let content = m.content;
        if (art || an) {
          content += `\n\n[Previous result]`;
          if (art) content += `\nArticle: ${art.headline} — ${art.source}${art.published ? ` (${art.published})` : ""}\n${art.body.slice(0, 1500)}`;
          if (an) {
            content += `\nVerdict: ${an.verdict} (${an.confidence}%)\nSummary: ${an.summary}`;
            const links = (an.verification_links ?? []).slice(0, 5).map((l) => `${l.label}: ${l.url}`).join("\n");
            if (links) content += `\nSources:\n${links}`;
          }
        }
        return { role: m.role, content: content.slice(0, 6000) };
      });

      const turn = await runAssistant(history, text);

      const savedA = appendAssistantMessage(tId, turn.assistant_message, {
        assistant_message: turn.assistant_message,
        article: turn.article,
        analysis: turn.analysis,
        needs_clarification: turn.needs_clarification,
        specificity_tip: turn.specificity_tip,
        clarification_suggestions: turn.clarification_suggestions,
      });
      setMessages((m) => [...m, savedA]);

      if (created) {
        navigate({ to: "/c/$threadId", params: { threadId: tId }, replace: true });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Assistant failed");
    } finally {
      setSending(false);
    }
  }

  const empty = messages.length === 0;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {!hasOpenAIKey() && (
        <div className="px-6 pt-6">
          <MissingKeyBanner />
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-6 py-8 space-y-6">
          {empty && (
            <div className="text-center py-10">
              <div className="relative h-14 w-14 mx-auto mb-4 animate-float">
                <span className="absolute inset-0 rounded-full bg-accent/40 animate-ping-slow" />
                <div className="relative h-14 w-14 rounded-full bg-foreground text-background grid place-items-center shadow-lg">
                  <ShieldCheck className="h-7 w-7" />
                </div>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight animate-enter-up text-gradient-ink">
                What news would you like me to investigate today?
              </h1>
              <p
                className="text-sm text-muted-foreground mt-2 max-w-md mx-auto animate-enter-up"
                style={{ animationDelay: "80ms" }}
              >
                Just ask in plain English or Tagalog. I'll find the most likely article, then run it
                through the credibility pipeline.
              </p>
              <div className="flex items-center justify-between mt-8 mb-2 text-xs text-muted-foreground">
                <span className="uppercase tracking-widest">Quick checks</span>
                <button
                  onClick={() => {
                    setShuffleSpin((n) => n + 1);
                    setStarters(pickStarters());
                  }}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-muted hover:text-foreground transition-colors"
                >
                  <Shuffle
                    key={shuffleSpin}
                    className="h-3.5 w-3.5 animate-spin-once"
                  />
                  Shuffle
                </button>
              </div>
              <div className="grid sm:grid-cols-2 gap-2 text-left">
                {starters.map((s, i) => (
                  <button
                    key={`${shuffleSpin}-${s}`}
                    onClick={() => handleSend(s)}
                    style={{ animationDelay: `${120 + i * 70}ms` }}
                    className="starter-card group text-sm rounded-lg border bg-card p-4 animate-enter-up"
                  >
                    <Sparkles className="h-4 w-4 mb-2 text-muted-foreground group-hover:text-accent transition-colors group-hover:rotate-12 duration-300" />
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <div key={m.id} className="animate-enter-up">
              <MessageBubble
                message={m}
                disabled={sending}
                onPick={m.id === messages[messages.length - 1]?.id ? (s) => handleSend(s) : undefined}
              />
            </div>
          ))}

          {sending && <InvestigationStepper />}

          <div ref={endRef} />

        </div>
      </div>

      <div className="border-t bg-background">
        <div className="mx-auto max-w-3xl px-6 py-4">
          <div className={`relative rounded-md transition-shadow ${attention ? "attention-glow" : ""}`}>
            <Textarea
              ref={taRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask me to verify a news claim…"
              rows={2}
              className="resize-none pr-14 bg-muted border-0 leading-relaxed"
              disabled={sending}
            />
            <Button
              size="icon"
              onClick={() => handleSend()}
              disabled={sending || !input.trim()}
              className="absolute right-2 bottom-2 h-9 w-9"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            SURI is a decision-support tool. Always cross-check with primary sources.
          </p>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  onPick,
  disabled,
}: {
  message: MessageRow;
  onPick?: (s: string) => void;
  disabled?: boolean;
}) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
    );
  }

  const payload = message.analysis;
  const article = payload?.article;
  const analysis = payload?.analysis;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 rounded-md bg-foreground text-background grid place-items-center shrink-0">
          <ShieldCheck className="h-4 w-4" />
        </div>
        <div className="flex-1 text-sm leading-relaxed whitespace-pre-wrap pt-1">
          {message.content}
        </div>
      </div>

      {!analysis && (payload?.clarification_suggestions?.length ?? 0) > 0 && (
        <div className="ml-11 space-y-3 animate-enter-up">
          <div className="flex items-start gap-2 rounded-lg border border-dashed bg-muted/40 px-4 py-3 text-sm">
            <Lightbulb className="h-4 w-4 mt-0.5 shrink-0 text-accent" />
            <span>
              <span className="font-semibold">Be more specific: </span>
              {payload?.specificity_tip ||
                "Include the agency or office, place, date, amount, or the exact headline/post so I can check the right claim."}
            </span>
          </div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            Or pick one of these closest claims
          </div>
          <div className="grid gap-2">
            {payload!.clarification_suggestions!.map((s, i) => (
              <button
                key={s}
                disabled={!onPick || disabled}
                onClick={() => onPick?.(s)}
                style={{ animationDelay: `${i * 70}ms` }}
                className="starter-card group flex items-center gap-3 text-left text-sm rounded-lg border bg-card px-4 py-3 animate-enter-up disabled:opacity-60"
              >
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold">
                  {i + 1}
                </span>
                <span className="flex-1">{s}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </button>
            ))}
          </div>
        </div>
      )}


      {article && (
        <Card className="p-4 ml-11">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Newspaper className="h-3.5 w-3.5" />
            <span className="font-medium">{article.source}</span>
            {article.published && (
              <>
                <span>·</span>
                <span>{article.published}</span>
              </>
            )}
            <Badge variant="outline" className="ml-auto text-[10px]">
              Closest match (AI-reconstructed)
            </Badge>
          </div>
          <h3 className="font-bold text-base leading-snug mb-2 flex items-start gap-2">
            <FileText className="h-4 w-4 mt-1 shrink-0 text-muted-foreground" />
            {article.headline}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{article.body}</p>
        </Card>
      )}

      {analysis && (
        <div className="ml-11 space-y-4">
          <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/40 px-4 py-3">
            <div className="text-xs text-muted-foreground">
              Export this classification result and credibility scorecard.
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-2 shrink-0"
              onClick={() => {
                try {
                  downloadReportPdf(analysis, article ?? null, message.content);
                  toast.success("Report downloaded");
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Could not generate PDF");
                }
              }}
            >
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
          </div>
          <AnalysisResultView result={analysis} />
        </div>
      )}
    </div>
  );
}
