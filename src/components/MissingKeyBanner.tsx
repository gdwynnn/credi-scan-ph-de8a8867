import { Card } from "@/components/ui/card";
import { KeyRound } from "lucide-react";

export function MissingKeyBanner() {
  return (
    <Card className="p-6 border-2 border-dashed">
      <div className="flex items-start gap-4">
        <div className="h-10 w-10 rounded-md bg-muted grid place-items-center shrink-0">
          <KeyRound className="h-5 w-5" />
        </div>
        <div className="space-y-3 text-sm">
          <div>
            <h2 className="text-base font-semibold">Missing API Key</h2>
            <p className="text-muted-foreground mt-1">
              CrediScan needs a Google Gemini API key (free tier) to run the conversational
              assistant. The app won't crash — but no analyses can be performed until a key is
              configured.
            </p>
          </div>
          <div className="rounded-md bg-muted px-4 py-3 font-mono text-xs">
            <div className="text-muted-foreground"># Add to .env in the project root</div>
            VITE_GEMINI_API_KEY=your-gemini-key-here
          </div>
          <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
            <li>
              Create a free key at{" "}
              <a
                className="underline text-foreground"
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
              >
                aistudio.google.com/app/apikey
              </a>
              .
            </li>
            <li>Copy <code className="text-foreground">.env.example</code> to <code className="text-foreground">.env</code>.</li>
            <li>Paste your key and restart the dev server (<code className="text-foreground">bun run dev</code>).</li>
          </ol>
        </div>
      </div>
    </Card>
  );
}
