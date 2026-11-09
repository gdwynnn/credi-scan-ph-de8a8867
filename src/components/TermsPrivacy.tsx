import { useEffect, useRef, useState } from "react";
import { Check, FileText, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const CONSENT_KEY = "suri-terms-privacy-v1";

export function TermsPrivacyDialog({
  open,
  onOpenChange,
  mustAccept = false,
  onAccept,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mustAccept?: boolean;
  onAccept?: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [reachedBottom, setReachedBottom] = useState(false);

  useEffect(() => {
    if (open) setReachedBottom(false);
  }, [open]);

  const accept = () => {
    if (!reachedBottom) return;
    try {
      window.localStorage.setItem(CONSENT_KEY, "accepted");
    } catch {
      // Keep the app usable when browser storage is unavailable.
    }
    onAccept?.();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!mustAccept || nextOpen) onOpenChange(nextOpen);
      }}
    >
      <DialogContent
        className={`flex max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0 ${mustAccept ? "[&>button]:hidden" : ""}`}
      >
        <DialogHeader className="px-6 pb-4 pt-6 pr-12 text-left">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </div>
          <DialogTitle className="font-serif text-2xl">Terms of Use &amp; Privacy</DialogTitle>
          <DialogDescription>
            Please read this notice before using SURI. Your acceptance is saved in this browser.
          </DialogDescription>
        </DialogHeader>

        <div
          ref={scrollRef}
          onScroll={(event) => {
            const element = event.currentTarget;
            if (element.scrollTop + element.clientHeight >= element.scrollHeight - 8) {
              setReachedBottom(true);
            }
          }}
          className="min-h-0 flex-1 space-y-6 overflow-y-auto border-y border-border px-6 py-5 scroll-smooth"
          aria-label="Terms of use and privacy notice"
        >
          <section className="space-y-2">
            <h3 className="font-semibold">Using SURI</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              SURI is an AI-assisted research and claim-checking tool. Its classifications and confidence
              scores are estimates based on available information, not guarantees or professional, legal,
              medical, or financial advice. AI-generated results may be incomplete or incorrect. Review
              the linked evidence and consult authoritative sources before relying on or sharing a result.
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Use SURI lawfully and respectfully. Do not submit passwords, access codes, private account
              details, or sensitive personal information. You are responsible for the material you submit
              and for how you use the results.
            </p>
          </section>

          <section className="space-y-2 border-t border-border pt-5">
            <h3 className="font-semibold">Information you provide</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              SURI saves investigations and messages in this browser&apos;s local storage so they remain
              available on this device. They are not synced to an account. Clearing this browser&apos;s data
              or using another browser/device may remove or hide those saved conversations. You can use
              the app&apos;s conversation controls to delete saved investigations.
            </p>
          </section>

          <section className="space-y-2 border-t border-border pt-5">
            <h3 className="font-semibold">AI processing and external websites</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              To produce an answer, the question, relevant recent conversation context, and any link you
              submit are sent from SURI&apos;s server to OpenAI for AI analysis. SURI may also send search
              queries to find related public evidence and attempt to retrieve the public page at a link
              you provide. These services process information under their own terms and privacy practices.
              SURI does not control their handling or availability.
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Private, login-protected, or inaccessible pages may not be readable. Do not share credentials
              to make them accessible; paste only non-sensitive text you are permitted to share.
            </p>
          </section>

          <section className="space-y-2 border-t border-border pt-5">
            <h3 className="font-semibold">Links and changes</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              SURI may link to third-party sites. Those sites have their own content, policies, and terms;
              a link or a high source score is not an endorsement of every article or claim. This notice
              may be updated as the service changes. If a material update is made, SURI may ask you to
              review and accept the updated notice again.
            </p>
          </section>

          <section className="space-y-2 border-t border-border pt-5">
            <h3 className="font-semibold">Your choice</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              By selecting “Accept and continue,” you confirm that you have read this notice and agree to
              these terms for using SURI, including the processing described above. If you do not agree,
              do not continue using the service.
            </p>
          </section>
        </div>

        <div className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className={`flex items-center gap-2 text-xs transition-colors duration-300 ${reachedBottom ? "text-success" : "text-muted-foreground"}`} aria-live="polite">
            {reachedBottom ? <Check className="h-4 w-4" aria-hidden="true" /> : <FileText className="h-4 w-4" aria-hidden="true" />}
            {mustAccept
              ? reachedBottom
                ? "You reached the end. You can continue."
                : "Scroll to the end to enable acceptance."
              : "You can close this notice whenever you’re ready."}
          </p>
          {mustAccept ? (
            <Button onClick={accept} disabled={!reachedBottom} className="btn-pop shrink-0">
              <Check aria-hidden="true" /> Accept and continue
            </Button>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)} className="btn-pop shrink-0">
              Close
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function FirstVisitConsent() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      setOpen(window.localStorage.getItem(CONSENT_KEY) !== "accepted");
    } catch {
      setOpen(true);
    }
  }, []);

  return (
    <TermsPrivacyDialog
      open={open}
      onOpenChange={setOpen}
      mustAccept
    />
  );
}

export function TermsPrivacyButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="btn-pop">
        <FileText aria-hidden="true" /> Terms &amp; Privacy
      </Button>
      <TermsPrivacyDialog open={open} onOpenChange={setOpen} />
    </>
  );
}