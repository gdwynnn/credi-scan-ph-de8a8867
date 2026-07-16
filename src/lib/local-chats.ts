// Local-only chat storage (no accounts, no DB). Everything lives in
// window.localStorage under a single key. Mirrors the shape ChatView used to
// get from Supabase so the rest of the UI can stay almost identical.

import type { AnalysisResult } from "./analysis-types";
import type { AssistantArticle } from "./openai-client";

const STORAGE_KEY = "crediscan.threads.v1";

export interface ThreadMeta {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface MessagePayload {
  assistant_message?: string;
  article?: AssistantArticle | null;
  analysis?: AnalysisResult | null;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  analysis: MessagePayload | null;
  created_at: string;
}

interface Store {
  threads: ThreadMeta[];
  messages: Record<string, MessageRow[]>;
}

// ---------------------------------------------------------------------------

function emptyStore(): Store {
  return { threads: [], messages: {} };
}

function read(): Store {
  if (typeof window === "undefined") return emptyStore();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as Store;
    if (!parsed || !Array.isArray(parsed.threads) || typeof parsed.messages !== "object") {
      return emptyStore();
    }
    return parsed;
  } catch {
    return emptyStore();
  }
}

function write(store: Store) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  // Notify listeners in this tab (storage event only fires across tabs)
  window.dispatchEvent(new CustomEvent("crediscan:chats-changed"));
}

function uid(prefix = "") {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}${Date.now().toString(36)}-${rand}`;
}

function nowIso() {
  return new Date().toISOString();
}

// ---------------------------------------------------------------------------
// Public API

export function listThreads(): ThreadMeta[] {
  return [...read().threads].sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
}

export function getThread(id: string): ThreadMeta | undefined {
  return read().threads.find((t) => t.id === id);
}

export function createThread(title = "New investigation"): ThreadMeta {
  const store = read();
  const t: ThreadMeta = { id: uid("t_"), title, created_at: nowIso(), updated_at: nowIso() };
  store.threads.unshift(t);
  store.messages[t.id] = [];
  write(store);
  return t;
}

export function ensureThread(id: string): ThreadMeta {
  const store = read();
  const existing = store.threads.find((t) => t.id === id);
  if (existing) return existing;
  const t: ThreadMeta = { id, title: "New investigation", created_at: nowIso(), updated_at: nowIso() };
  store.threads.unshift(t);
  store.messages[id] = store.messages[id] ?? [];
  write(store);
  return t;
}

export function renameThread(id: string, title: string) {
  const store = read();
  const t = store.threads.find((x) => x.id === id);
  if (!t) return;
  t.title = title.slice(0, 120);
  t.updated_at = nowIso();
  write(store);
}

export function deleteThread(id: string) {
  const store = read();
  store.threads = store.threads.filter((t) => t.id !== id);
  delete store.messages[id];
  write(store);
}

export function clearAll() {
  write(emptyStore());
}

export function loadMessages(threadId: string): MessageRow[] {
  return read().messages[threadId] ?? [];
}

export function appendUserMessage(threadId: string, content: string): MessageRow {
  const store = read();
  const t = store.threads.find((x) => x.id === threadId);
  if (!t) throw new Error("Thread not found");
  const msg: MessageRow = {
    id: uid("m_"),
    conversation_id: threadId,
    role: "user",
    content,
    analysis: null,
    created_at: nowIso(),
  };
  store.messages[threadId] = [...(store.messages[threadId] ?? []), msg];
  t.updated_at = msg.created_at;
  // Auto-title from first user message
  if (!t.title || t.title === "New investigation") {
    t.title = content.slice(0, 60);
  }
  write(store);
  return msg;
}

export function appendAssistantMessage(
  threadId: string,
  content: string,
  payload: MessagePayload,
): MessageRow {
  const store = read();
  const t = store.threads.find((x) => x.id === threadId);
  if (!t) throw new Error("Thread not found");
  const msg: MessageRow = {
    id: uid("m_"),
    conversation_id: threadId,
    role: "assistant",
    content,
    analysis: payload,
    created_at: nowIso(),
  };
  store.messages[threadId] = [...(store.messages[threadId] ?? []), msg];
  t.updated_at = msg.created_at;
  // If article headline is better than the first-message title, upgrade it
  if (payload.article?.headline && t.title.length < 20) {
    t.title = payload.article.headline.slice(0, 80);
  }
  write(store);
  return msg;
}

// ---------------------------------------------------------------------------
// Export / import

export interface ExportBundle {
  format: "crediscan.chats";
  version: 1;
  exported_at: string;
  data: Store;
}

export function exportAll(): ExportBundle {
  return {
    format: "crediscan.chats",
    version: 1,
    exported_at: nowIso(),
    data: read(),
  };
}

export interface ImportResult {
  threadsAdded: number;
  threadsUpdated: number;
  messagesAdded: number;
}

export function importAll(bundle: unknown): ImportResult {
  if (!bundle || typeof bundle !== "object") throw new Error("Invalid file");
  const b = bundle as Partial<ExportBundle>;
  if (b.format !== "crediscan.chats" || !b.data) throw new Error("Not a CrediScan export file");
  const incoming = b.data as Store;
  if (!Array.isArray(incoming.threads) || typeof incoming.messages !== "object") {
    throw new Error("Corrupt export file");
  }

  const store = read();
  const byId = new Map(store.threads.map((t) => [t.id, t] as const));
  let added = 0;
  let updated = 0;
  let msgsAdded = 0;

  for (const t of incoming.threads) {
    const existing = byId.get(t.id);
    if (!existing) {
      store.threads.unshift(t);
      store.messages[t.id] = incoming.messages[t.id] ?? [];
      msgsAdded += store.messages[t.id].length;
      added++;
    } else if (new Date(t.updated_at) > new Date(existing.updated_at)) {
      existing.title = t.title;
      existing.updated_at = t.updated_at;
      const incomingMsgs = incoming.messages[t.id] ?? [];
      const existingIds = new Set((store.messages[t.id] ?? []).map((m) => m.id));
      const merged = [...(store.messages[t.id] ?? [])];
      for (const m of incomingMsgs) {
        if (!existingIds.has(m.id)) {
          merged.push(m);
          msgsAdded++;
        }
      }
      merged.sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
      store.messages[t.id] = merged;
      updated++;
    }
  }

  write(store);
  return { threadsAdded: added, threadsUpdated: updated, messagesAdded: msgsAdded };
}

export function subscribe(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onChange = () => listener();
  window.addEventListener("crediscan:chats-changed", onChange);
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) onChange();
  });
  return () => {
    window.removeEventListener("crediscan:chats-changed", onChange);
  };
}
