import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const INPUT = z.object({ url: z.string().url().max(2000) });

function extractText(html: string): { title: string; text: string } {
  // strip script/style
  let cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");

  const titleMatch = cleaned.match(/<title[^>]*>([^<]*)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : "";

  // Prefer <article>, <main>, or large <p> aggregation
  const articleMatch = cleaned.match(/<article[\s\S]*?<\/article>/i);
  const mainMatch = cleaned.match(/<main[\s\S]*?<\/main>/i);
  const body = articleMatch?.[0] ?? mainMatch?.[0] ?? cleaned;

  // Collect text from <p>
  const paragraphs: string[] = [];
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let m;
  while ((m = pRegex.exec(body)) !== null) {
    const txt = m[1]
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, " ")
      .trim();
    if (txt.length > 30) paragraphs.push(txt);
  }

  let text = paragraphs.join("\n\n");
  if (text.length < 200) {
    // fallback: strip everything
    text = body
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  return { title, text: text.slice(0, 15000) };
}

export const fetchUrlContent = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => INPUT.parse(input))
  .handler(async ({ data }) => {
    const res = await fetch(data.url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; CrediScanBot/1.0; +https://crediscan.app)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    if (!res.ok) throw new Error(`Failed to fetch URL (${res.status})`);
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("html") && !ct.includes("text")) {
      throw new Error(`Unsupported content type: ${ct}`);
    }
    const html = await res.text();
    const { title, text } = extractText(html);
    if (text.length < 100) {
      throw new Error("Could not extract enough readable text from the page.");
    }
    return { title, text, url: data.url };
  });
