import { supabase } from "@/integrations/supabase/client";
import type { AnalysisResult } from "./analysis-types";
import type { AssistantArticle } from "./openai-client";

export interface ConversationRow {
  id: string;
  user_id: string;
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

export async function listConversations(): Promise<ConversationRow[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ConversationRow[];
}

export async function createConversation(userId: string, title = "New conversation"): Promise<ConversationRow> {
  const { data, error } = await supabase
    .from("conversations")
    .insert({ user_id: userId, title })
    .select("*")
    .single();
  if (error) throw error;
  return data as ConversationRow;
}

export async function renameConversation(id: string, title: string) {
  await supabase.from("conversations").update({ title }).eq("id", id);
}

export async function deleteConversation(id: string) {
  await supabase.from("conversations").delete().eq("id", id);
}

export async function loadMessages(conversationId: string): Promise<MessageRow[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as MessageRow[];
}

export async function appendUserMessage(conversationId: string, content: string): Promise<MessageRow> {
  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, role: "user", content })
    .select("*")
    .single();
  if (error) throw error;
  await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
  return data as unknown as MessageRow;
}

export async function appendAssistantMessage(
  conversationId: string,
  content: string,
  payload: MessagePayload,
): Promise<MessageRow> {
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      role: "assistant",
      content,
      analysis: payload as never,
    })
    .select("*")
    .single();
  if (error) throw error;
  await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
  return data as unknown as MessageRow;
}
