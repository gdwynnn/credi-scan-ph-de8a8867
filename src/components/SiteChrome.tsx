import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { UserMenu } from "./UserMenu";

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-40">
      <div className="px-4 md:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-primary text-primary-foreground grid place-items-center">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <div className="font-serif text-lg">CrediScan</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              PH Fake News Detector
            </div>
          </div>
        </Link>
        <nav className="flex items-center gap-6">
          <UserMenu />
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return null;
}
