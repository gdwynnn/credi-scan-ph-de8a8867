import { useEffect, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { MessageSquarePlus, Trash2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteConversation, listConversations, type ConversationRow } from "@/lib/conversations";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function ConversationSidebar({ refreshKey }: { refreshKey?: number }) {
  const [convs, setConvs] = useState<ConversationRow[]>([]);
  const [signedIn, setSignedIn] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!signedIn) {
      setConvs([]);
      return;
    }
    listConversations().then(setConvs).catch(() => {});
  }, [signedIn, refreshKey, pathname]);

  if (!signedIn) {
    return (
      <aside className="hidden md:flex flex-col w-64 border-r bg-muted/30 p-4">
        <div className="text-sm text-muted-foreground">
          <Link to="/auth" className="underline text-foreground">
            Sign in
          </Link>{" "}
          to save and revisit your investigations.
        </div>
      </aside>
    );
  }

  return (
    <aside className="hidden md:flex flex-col w-64 border-r bg-muted/30">
      <div className="p-3 border-b">
        <Button asChild variant="outline" className="w-full justify-start">
          <Link to="/">
            <MessageSquarePlus className="h-4 w-4" /> New investigation
          </Link>
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {convs.length === 0 && (
          <div className="text-xs text-muted-foreground px-3 py-4 text-center">
            No conversations yet.
          </div>
        )}
        {convs.map((c) => {
          const active = pathname === `/c/${c.id}`;
          return (
            <div
              key={c.id}
              className={`group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted transition-colors ${
                active ? "bg-muted" : ""
              }`}
            >
              <Link
                to="/c/$threadId"
                params={{ threadId: c.id }}
                className="flex-1 min-w-0 flex items-center gap-2"
              >
                <MessageCircle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{c.title}</span>
              </Link>
              <button
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!confirm("Delete this conversation?")) return;
                  try {
                    await deleteConversation(c.id);
                    setConvs((cs) => cs.filter((x) => x.id !== c.id));
                    if (active) navigate({ to: "/" });
                  } catch {
                    toast.error("Failed to delete");
                  }
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                aria-label="Delete conversation"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
