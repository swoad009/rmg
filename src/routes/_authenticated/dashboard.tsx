import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { NAV_ITEMS, canSee } from "@/lib/roles";
import { useMe } from "@/lib/use-me";
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

function Dashboard() {
  const { data: me } = useMe();
  const roles = me?.roles ?? [];
  const items = NAV_ITEMS.filter((i) => canSee(i, roles));

  return (
    <AppShell>
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
    </AppShell>
  );
}
