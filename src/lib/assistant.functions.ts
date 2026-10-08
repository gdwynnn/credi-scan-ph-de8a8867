import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { SYSTEM_PROMPT, SCHEMA } from "./assistant-prompt";

interface LinkCheck {
  url: string;
  status: "reachable" | "login_required" | "private_or_blocked" | "not_found" | "unreachable";
  http_status?: number;
  final_url?: string;
  title?: string;
  excerpt?: string;
}

const LOGIN_MARKERS = /(log ?in to (continue|see|view)|sign in to (continue|view)|you must log in|create an account to|join to view|this content isn't available|login required)/i;

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

async function checkLink(url: string): Promise<LinkCheck> {
  try {
    const r = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; CrediScanBot/1.0; +fact-check)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    const base = { url, http_status: r.status, final_url: r.url };
    if (r.status === 401) return { ...base, status: "login_required" };
    if (r.status === 403 || r.status === 451) return { ...base, status: "private_or_blocked" };
    if (r.status === 404 || r.status === 410) return { ...base, status: "not_found" };
    if (!r.ok) return { ...base, status: "unreachable" };
    const html = (await r.text()).slice(0, 400_000);
    const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim();
    const ogDesc = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)/i)?.[1];
    const text = stripHtml(html);
    const loginWall = /\/(login|signin|accounts\/login)/i.test(r.url) || (text.length < 1500 && LOGIN_MARKERS.test(text));
    return {
      ...base,
      status: loginWall ? "login_required" : "reachable",
      title,
      excerpt: [ogDesc, text].filter(Boolean).join(" — ").slice(0, 6000),
    };
  } catch {
    return { url, status: "unreachable" };
  }
}

const InputSchema = z.object({
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(20000) }))
    .max(40),
  query: z.string().min(1).max(20000),
});

export const runAssistantServer = createServerFn({ method: "POST" })
  .inputValidator((d) => InputSchema.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env["OPENAI_API_KEY"];
    if (!apiKey) throw new Error("The AI key is not configured on the server.");
    const model = process.env["OPENAI_MODEL"] || "gpt-4.1";

    // Evidence step 1: directly open every link the user pasted.
    const urls = Array.from(new Set(data.query.match(/https?:\/\/[^\s<>"')]+/gi) ?? [])).slice(0, 4);
    const checks = await Promise.all(urls.map(checkLink));
    const linkEvidence = checks.length
      ? `\n\nLINK ACCESS REPORT (fetched by the server just now — treat as primary evidence):\n${JSON.stringify(checks, null, 2)}`
      : "";

    const input = [
      ...data.history.slice(-20).map((m) => ({ role: m.role, content: m.content })),
      {
        role: "user",
        content: `Respond with a single valid JSON object.\n${SCHEMA}\n\nToday's date (UTC): ${new Date().toISOString().slice(0, 10)}${linkEvidence}\n\nUser request:\n"""\n${data.query}\n"""`,
      },
    ];

    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        instructions: SYSTEM_PROMPT,
        input,
        tools: [{ type: "web_search" }],
        tool_choice: "auto",
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      if (res.status === 401) throw new Error("OpenAI rejected the API key. Please update it.");
      if (res.status === 429) throw new Error("OpenAI rate limit or quota reached. Check your OpenAI billing/credits, then try again.");
      throw new Error(`OpenAI error [${res.status}]: ${t.slice(0, 300)}`);
    }
    const json = await res.json();

    // Collect text + real URLs the web search actually cited.
    let raw = "";
    const cited: { url: string; title?: string }[] = [];
    for (const item of json.output ?? []) {
      if (item.type !== "message") continue;
      for (const c of item.content ?? []) {
        if (c.type === "output_text") {
          raw += c.text;
          for (const a of c.annotations ?? []) {
            if (a.type === "url_citation" && a.url) cited.push({ url: a.url, title: a.title });
          }
        }
      }
    }
    if (!raw) throw new Error("Empty response from the AI.");
    return { raw, cited, link_checks: checks };
  });
