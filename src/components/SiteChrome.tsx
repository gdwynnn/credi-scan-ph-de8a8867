import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";

const NAV = [
  { to: "/", label: "Investigate" },
  { to: "/how-it-works", label: "How it works" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/about", label: "About" },
] as const;

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-40">
      <div className="px-4 md:px-6 h-16 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="h-8 w-8 rounded-md bg-primary text-primary-foreground grid place-items-center">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div className="leading-tight hidden sm:block">
            <div className="font-serif text-lg">SURI</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Unbiased Research &amp; Verification
            </div>
          </div>
        </Link>
        <nav className="flex items-center gap-1 overflow-x-auto text-sm">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: true }}
              className="rounded-md px-3 py-1.5 whitespace-nowrap text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              activeProps={{ className: "bg-muted text-foreground font-medium" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
}

export function SiteFooter() {
  return null;
}
