import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, Send, Sparkles, ShieldCheck, FileText, Newspaper } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AnalysisResultView } from "@/components/AnalysisResultView";
import { MissingKeyBanner } from "@/components/MissingKeyBanner";
import { hasOpenAIKey, runAssistant, type ChatTurn } from "@/lib/openai-client";
import {
  appendAssistantMessage,
  appendUserMessage,
  createConversation,
  loadMessages,
  renameConversation,
  type MessageRow,
} from "@/lib/conversations";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  threadId: string | null;
  userId: string | null;
  onThreadCreated?: (id: string) => void;
}

const STARTERS = [
  "Totoo bang inaprubahan ni Marcos ang four-day work week?",
  "Did DepEd really remove Mathematics from the curriculum?",
  "Is it true that classes are suspended nationwide tomorrow?",
  "May Facebook post na sabi ₱10,000 ang matatanggap ng bawat estudyante. Totoo ba?",
];

export function ChatView({ threadId, userId, onThreadCreated }: Props) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Reset + load when thread changes
  useEffect(() => {
    setMessages([]);
    if (threadId) {
      setLoadingHistory(true);
      loadMessages(threadId)
        .then(setMessages)
        .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load conversation"))
        .finally(() => setLoadingHistory(false));
    }
  }, [threadId]);

  // Focus textarea on mount & after sending
  useEffect(() => {
    taRef.current?.focus();
  }, [threadId, sending]);

  // Scroll to bottom on new messages
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, sending]);

  async function handleSend(textOverride?: string) {
    const text = (textOverride ?? input).trim();
    if (!text || sending) return;
    if (!hasOpenAIKey()) {
      toast.error("Set VITE_GROQ_API_KEY in your .env file first.");
      return;
    }

    setSending(true);
    setInput("");

    try {
      // Ensure a thread exists (auth required for persistence)
      let tId = threadId;
      let created = false;
      if (!tId) {
        if (!userId) {
          // Local-only single message — push to UI but no DB persistence
          await runEphemeral(text);
          return;
        }
        const conv = await createConversation(userId, text.slice(0, 60));
        tId = conv.id;
        created = true;
        onThreadCreated?.(tId);
      }

      // Optimistic user message
      const optimisticUser: MessageRow = {
        id: `tmp-${Date.now()}`,
        conversation_id: tId,
        role: "user",
        content: text,
        analysis: null,
        created_at: new Date().toISOString(),
      };
      setMessages((m) => [...m, optimisticUser]);

      // Persist user message
      let savedUser: MessageRow | null = null;
      try {
        savedUser = await appendUserMessage(tId, text);
        setMessages((m) => m.map((x) => (x.id === optimisticUser.id ? savedUser! : x)));
      } catch (e) {
        console.error("Failed to save user message", e);
      }

      // Build history from existing messages (excluding optimistic)
      const history: ChatTurn[] = messages
        .filter((m) => !m.id.startsWith("tmp-"))
        .map((m) => ({ role: m.role, content: m.content }));

      const turn = await runAssistant(history, text);

      const optimisticAsst: MessageRow = {
        id: `tmp-a-${Date.now()}`,
        conversation_id: tId,
        role: "assistant",
        content: turn.assistant_message,
        analysis: {
          assistant_message: turn.assistant_message,
          article: turn.article,
          analysis: turn.analysis,
        },
        created_at: new Date().toISOString(),
      };
      setMessages((m) => [...m, optimisticAsst]);

      try {
        const savedA = await appendAssistantMessage(tId, turn.assistant_message, {
          assistant_message: turn.assistant_message,
          article: turn.article,
          analysis: turn.analysis,
        });
        setMessages((m) => m.map((x) => (x.id === optimisticAsst.id ? savedA : x)));
      } catch (e) {
        console.error("Failed to save assistant message", e);
      }

      // Rename newly created conversation based on the article headline if available
      if (created && turn.article?.headline) {
        const title = turn.article.headline.slice(0, 80);
        renameConversation(tId, title).catch(() => {});
      }

      if (created) {
        navigate({ to: "/c/$threadId", params: { threadId: tId }, replace: true });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Assistant failed");
    } finally {
      setSending(false);
    }
  }

  // Fallback when user is not signed in: run a single turn without persistence.
  async function runEphemeral(text: string) {
    const userMsg: MessageRow = {
      id: `eph-u-${Date.now()}`,
      conversation_id: "ephemeral",
      role: "user",
      content: text,
      analysis: null,
      created_at: new Date().toISOString(),
    };
    setMessages((m) => [...m, userMsg]);
    const turn = await runAssistant([], text);
    setMessages((m) => [
      ...m,
      {
        id: `eph-a-${Date.now()}`,
        conversation_id: "ephemeral",
        role: "assistant",
        content: turn.assistant_message,
        analysis: {
          assistant_message: turn.assistant_message,
          article: turn.article,
          analysis: turn.analysis,
        },
        created_at: new Date().toISOString(),
      },
    ]);
    toast.info("Sign in to save this conversation to your history.");
  }

  const empty = messages.length === 0 && !loadingHistory;

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
              <div className="h-14 w-14 rounded-full bg-foreground text-background grid place-items-center mx-auto mb-4">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                What news would you like me to investigate today?
              </h1>
              <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                Just ask in plain English or Tagalog. I'll find the most likely article, then run it
                through the credibility pipeline.
              </p>
              <div className="grid sm:grid-cols-2 gap-2 mt-8 text-left">
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSend(s)}
                    className="text-sm rounded-lg border bg-card p-4 hover:border-foreground transition-colors"
                  >
                    <Sparkles className="h-4 w-4 mb-2 text-muted-foreground" />
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {loadingHistory && (
            <div className="text-center text-sm text-muted-foreground py-8">
              <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Loading conversation…
            </div>
          )}

          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}

          {sending && (
            <div className="flex gap-3 items-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Investigating…
            </div>
          )}

          <div ref={endRef} />
        </div>
      </div>

      <div className="border-t bg-background">
        <div className="mx-auto max-w-3xl px-6 py-4">
          <div className="relative">
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
            CrediScan is a decision-support tool. Always cross-check with primary sources.
          </p>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: MessageRow }) {
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
        <div className="ml-11">
          <AnalysisResultView result={analysis} />
        </div>
      )}
    </div>
  );
}

// Keep import used elsewhere
export const _supabase = supabase;
