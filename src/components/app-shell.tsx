import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Menu, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { NAV_ITEMS, ROLE_LABELS, canSee } from "@/lib/roles";
import { useMe } from "@/lib/use-me";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: ReactNode }) {
  const { data: me } = useMe();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const roles = me?.roles ?? [];
  const items = NAV_ITEMS.filter((i) => canSee(i, roles));

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const nav = (stagger = false) => (
    <nav className="flex flex-col gap-1">
      {items.map((i, idx) => {
        const cls = cn(
          "flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-all duration-200 ease-out active:scale-[0.98]",
          stagger && (open ? "translate-x-0 opacity-100" : "translate-x-6 opacity-0"),
          i.ready
            ? "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
            : "cursor-default text-sidebar-foreground/40",
        );
        const style = stagger ? { transitionDelay: `${80 + idx * 35}ms` } : undefined;
        const inner = (
          <>
            <i.icon className="h-5 w-5" />
            <span className="flex-1">{i.label}</span>
            {!i.ready && (
              <span className="rounded bg-sidebar-border px-1.5 py-0.5 text-[10px] uppercase tracking-wide">Soon</span>
            )}
          </>
        );
        return i.to ? (
          <Link
            key={i.key}
            to={i.to}
            onClick={() => setOpen(false)}
            className={cls}
            style={style}
            activeProps={{ className: "!bg-sidebar-accent !text-sidebar-accent-foreground" }}
          >
            {inner}
          </Link>
        ) : (
          <div key={i.key} className={cls} style={style}>
            {inner}
          </div>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background lg:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-6 overflow-y-auto bg-sidebar p-4 lg:flex">
        <Brand />
        {nav()}
      </aside>

      <div className={cn("fixed inset-0 z-40 lg:hidden", open ? "pointer-events-auto" : "pointer-events-none")} aria-hidden={!open}>
        <div
          onClick={() => setOpen(false)}
          className={cn("absolute inset-0 bg-foreground/50 backdrop-blur-sm transition-opacity duration-300", open ? "opacity-100" : "opacity-0")}
        />
        <div
          className={cn(
            "absolute inset-y-0 left-0 w-72 max-w-[85vw] overflow-y-auto bg-sidebar p-4 shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="mb-6 flex items-center justify-between">
            <Brand />
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg p-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent active:scale-90"
              aria-label="Close menu"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          {nav(true)}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-card/95 px-4 py-3 backdrop-blur">
          <button
            onClick={() => setOpen(true)}
            className="rounded-lg p-2 transition-all duration-200 hover:bg-accent active:scale-90 lg:hidden"
            aria-label="Open menu"
          >
            <Menu className={cn("h-6 w-6 transition-transform duration-300", open && "rotate-90")} />
          </button>
          <div className="ml-auto flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-semibold">{me?.name}</div>
              <div className="text-xs text-muted-foreground">{roles.map((r) => ROLE_LABELS[r]).join(", ") || "No role"}</div>
            </div>
            <Button variant="outline" size="icon" onClick={signOut} aria-label="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <main className="animate-in fade-in slide-in-from-bottom-2 space-y-6 p-4 duration-300 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-sidebar-primary font-display font-bold text-sidebar-primary-foreground">
        S
      </div>
      <span className="font-display text-lg font-bold text-sidebar-foreground">SutoTrack</span>
    </div>
  );
}
