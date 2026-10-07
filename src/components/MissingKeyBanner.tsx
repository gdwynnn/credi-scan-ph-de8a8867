import { Card } from "@/components/ui/card";
import { KeyRound } from "lucide-react";

export function MissingKeyBanner() {
  return (
    <Card className="p-6 border-2 border-dashed">
      <div className="flex items-start gap-4">
        <KeyRound className="h-5 w-5 shrink-0" />
        <p className="text-sm text-muted-foreground">
          CrediScan's AI key is not configured yet, so no analyses can run.
        </p>
      </div>
    </Card>
  );
}
