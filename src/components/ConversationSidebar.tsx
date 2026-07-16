import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  MessageSquarePlus,
  Trash2,
  MessageCircle,
  Download,
  Upload,
  Eraser,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  createThread,
  deleteThread,
  listThreads,
  clearAll,
  exportAll,
  importAll,
  subscribe,
  type ThreadMeta,
} from "@/lib/local-chats";
import { toast } from "sonner";

export function ConversationSidebar() {
  const [threads, setThreads] = useState<ThreadMeta[]>([]);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setThreads(listThreads());
    return subscribe(() => setThreads(listThreads()));
  }, []);

  function handleNew() {
    const t = createThread();
    navigate({ to: "/c/$threadId", params: { threadId: t.id } });
  }

  function handleExport() {
    const bundle = exportAll();
    if (bundle.data.threads.length === 0) {
      toast.info("Nothing to export yet.");
      return;
    }
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `crediscan-chats-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${bundle.data.threads.length} conversation(s).`);
  }

  async function handleImportFile(file: File) {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const result = importAll(parsed);
      setThreads(listThreads());
      toast.success(
        `Imported: +${result.threadsAdded} new, ${result.threadsUpdated} updated, +${result.messagesAdded} messages.`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    }
  }

  function handleClearAll() {
    if (!confirm("Delete ALL saved conversations from this browser? This cannot be undone.")) return;
    clearAll();
    setThreads([]);
    navigate({ to: "/" });
    toast.success("All conversations cleared.");
  }

  return (
    <aside className="hidden md:flex flex-col w-64 border-r bg-muted/30">
      <div className="p-3 border-b space-y-2">
        <Button onClick={handleNew} variant="outline" className="w-full justify-start">
          <MessageSquarePlus className="h-4 w-4" /> New investigation
        </Button>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="flex-1 h-8 px-2 text-xs"
            onClick={handleExport}
            title="Download all chats as JSON"
          >
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="flex-1 h-8 px-2 text-xs"
            onClick={() => fileRef.current?.click()}
            title="Restore from a JSON export"
          >
            <Upload className="h-3.5 w-3.5" /> Import
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImportFile(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {threads.length === 0 && (
          <div className="text-xs text-muted-foreground px-3 py-4 text-center">
            No conversations yet. Start a new investigation to see it here.
          </div>
        )}
        {threads.map((c) => {
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
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!confirm("Delete this conversation?")) return;
                  deleteThread(c.id);
                  setThreads(listThreads());
                  if (active) navigate({ to: "/" });
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
      {threads.length > 0 && (
        <div className="p-2 border-t">
          <Button
            size="sm"
            variant="ghost"
            className="w-full h-8 text-xs text-muted-foreground hover:text-destructive"
            onClick={handleClearAll}
          >
            <Eraser className="h-3.5 w-3.5" /> Clear all
          </Button>
        </div>
      )}
    </aside>
  );
}
