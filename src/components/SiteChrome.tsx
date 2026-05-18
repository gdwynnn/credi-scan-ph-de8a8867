import { Link, useLocation } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { UserMenu } from "./UserMenu";

export function SiteHeader() {
  const loc = useLocation();
  const navItem = (to: string, label: string) => {
    const active = loc.pathname === to;
    return (
      <Link
        to={to}
        className={`text-sm transition-colors hover:text-foreground ${
          active ? "text-foreground font-medium" : "text-muted-foreground"
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-40">
      <div className="mx-auto max-w-5xl px-6 h-16 flex items-center justify-between">
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
          {navItem("/", "Analyzer")}
          {navItem("/history", "History")}
          {navItem("/about", "About")}
          <UserMenu />
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border mt-16">
      <div className="mx-auto max-w-5xl px-6 py-8 text-xs text-muted-foreground flex flex-wrap justify-between gap-4">
        <p>
          CrediScan © {new Date().getFullYear()} — A decision-support tool. Always cross-check with primary sources.
        </p>
        <p>Built with NLP and Lovable AI for the Philippine information ecosystem.</p>
      </div>
    </footer>
  );
}
