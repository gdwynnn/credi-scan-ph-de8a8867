import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function UserMenu() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user.email ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!email) {
    return (
      <Link to="/auth">
        <Button size="sm" variant="outline">
          Sign in
        </Button>
      </Link>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground hidden md:inline">{email}</span>
      <Button
        size="sm"
        variant="ghost"
        onClick={async () => {
          await supabase.auth.signOut();
        }}
      >
        <LogOut className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
