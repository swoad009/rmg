import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { NAV_ITEMS, ROLE_LABELS, canSee, type AppRole } from "@/lib/roles";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — SutoTrack RMG" },
      { name: "description", content: "Factory operations overview." },
    ],
  }),
  component: Dashboard,
});

function useMe() {
  const { user } = Route.useRouteContext();
  return useQuery({
    queryKey: ["me", user.id],
    queryFn: async () => {
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("full_name,email").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);
      return {
        name: profile?.full_name ?? user.email ?? "User",
        email: profile?.email ?? user.email ?? "",
        roles: (roles ?? []).map((r) => r.role as AppRole),
      };
    },
  });
}

function Dashboard() {
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
      {items.map((i, idx) => (
        <div
          key={i.key}
          style={stagger ? { transitionDelay: `${80 + idx * 40}ms` } : undefined}
          className={cn(
            "flex h-12 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-all duration-200 ease-out active:scale-[0.98]",
            stagger &&
              (open ? "translate-x-0 opacity-100" : "translate-x-6 opacity-0"),
            i.key === "dashboard"
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
          )}
        >
          <i.icon className="h-5 w-5" />
          <span className="flex-1">{i.label}</span>
          {!i.ready && (
            <span className="rounded bg-sidebar-border px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
              Soon
            </span>
          )}
        </div>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background lg:flex">
      <aside className="hidden w-64 shrink-0 flex-col gap-6 bg-sidebar p-4 lg:flex">
        <Brand />
        {nav}
      </aside>

      {/* Mobile menu: backdrop fades, panel slides in, items stagger */}
      <div
        className={cn(
          "fixed inset-0 z-40 lg:hidden",
          open ? "pointer-events-auto" : "pointer-events-none",
        )}
        aria-hidden={!open}
      >
        <div
          onClick={() => setOpen(false)}
          className={cn(
            "absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300",
            open ? "opacity-100" : "opacity-0",
          )}
        />
        <div
          className={cn(
            "absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-sidebar p-4 shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
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

      <div className="flex-1">
        <header className="flex items-center justify-between border-b bg-card px-4 py-3">
          <button
            onClick={() => setOpen(true)}
            className="rounded-lg p-2 transition-all duration-200 hover:bg-accent active:scale-90 lg:hidden"
            aria-label="Open menu"
          >
            <Menu
              className={cn(
                "h-6 w-6 transition-transform duration-300",
                open && "rotate-90",
              )}
            />
          </button>
          <div className="ml-auto flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-semibold">{me?.name}</div>
              <div className="text-xs text-muted-foreground">
                {roles.map((r) => ROLE_LABELS[r]).join(", ") || "No role"}
              </div>
            </div>
            <Button variant="outline" size="icon" onClick={signOut} aria-label="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <main className="space-y-6 p-4 lg:p-8">
          <div>
            <h1 className="text-2xl font-bold">Welcome, {me?.name?.split(" ")[0]}</h1>
            <p className="text-sm text-muted-foreground">
              Your account is set up. Factory modules will appear here as they're added.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { l: "Completed", c: "bg-success text-success-foreground" },
              { l: "Pending", c: "bg-warning text-warning-foreground" },
              { l: "Delayed", c: "bg-destructive text-destructive-foreground" },
              { l: "Your modules", c: "bg-primary text-primary-foreground", v: items.length },
            ].map((s) => (
              <div key={s.l} className={cn("rounded-xl p-4 shadow-card", s.c)}>
                <div className="text-xs font-medium uppercase opacity-80">{s.l}</div>
                <div className="mt-2 font-display text-3xl font-bold">{s.v ?? "—"}</div>
              </div>
            ))}
          </div>
          <div className="rounded-xl border bg-card p-5 shadow-card">
            <h2 className="font-semibold">Your access</h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {items.map((i) => (
                <li key={i.key} className="flex items-center gap-2 text-sm">
                  <i.icon className="h-4 w-4 text-primary" /> {i.label}
                </li>
              ))}
            </ul>
          </div>
        </main>
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
