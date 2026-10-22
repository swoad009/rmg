import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Loader2, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Card, EmptyState, ErrorState, LoadingRows, PAGE_SIZE, PageHeader, Pager, StatusBadge, Toolbar, errMsg } from "@/components/data-states";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COSTING_STATUS } from "@/lib/rmg";
import { canWriteMerch } from "@/lib/roles";
import { useMe } from "@/lib/use-me";

export const Route = createFileRoute("/_authenticated/costings")({
  head: () => ({ meta: [{ title: "Costing — SutoTrack RMG" }, { name: "description", content: "Costing sheets and FOB approval." }] }),
  component: CostingsPage,
});

function CostingsPage() {
  const { data: me } = useMe();
  const canWrite = canWriteMerch(me?.roles ?? []);
  const q = useQuery({
    queryKey: ["costings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("costings").select("*, styles(style_no, buyers(name)), inquiries(inquiry_no, target_price)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(0);
  const [creating, setCreating] = useState(false);

  const rows = useMemo(() => {
    const s = search.toLowerCase();
    return (q.data ?? []).filter((r) => (status === "all" || r.status === status) && [r.costing_no, r.styles?.style_no, r.styles?.buyers?.name, r.inquiries?.inquiry_no].some((v) => v?.toLowerCase().includes(s)));
  }, [q.data, search, status]);
  const pageRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <AppShell>
      <PageHeader title="Costing" subtitle="Cost breakdown, FOB price and approval"
        action={canWrite && <Button onClick={() => setCreating(true)}><Plus className="mr-1 h-4 w-4" /> New costing</Button>} />
      <Toolbar search={search} onSearch={(v) => { setSearch(v); setPage(0); }} placeholder="Search costing, style, buyer…"
        filter={status} onFilter={(v) => { setStatus(v); setPage(0); }} options={COSTING_STATUS.map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }))} />
      <Card>
        {q.isLoading ? <LoadingRows /> : q.isError ? <ErrorState message={errMsg(q.error)} onRetry={() => q.refetch()} /> : rows.length === 0 ? (
          <EmptyState title={search || status !== "all" ? "No costings match" : "No costings yet"} hint="Create a costing sheet from a style." />
        ) : (
          <>
            <ul>
              {pageRows.map((r) => {
                const target = r.inquiries?.target_price != null ? Number(r.inquiries.target_price) : null;
                const fob = Number(r.fob_price ?? 0);
                return (
                  <li key={r.id} className="border-t first:border-t-0">
                    <Link to="/costings/$id" params={{ id: r.id }} className="group flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/40">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2"><span className="font-medium">{r.costing_no}</span><span className="text-xs text-muted-foreground">v{r.version}</span><StatusBadge status={r.status} /></div>
                        <div className="truncate text-xs text-muted-foreground">{r.styles?.style_no} · {r.styles?.buyers?.name} {r.inquiries && `· ${r.inquiries.inquiry_no}`}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-display text-lg font-bold tabular-nums">{r.currency} {fob.toFixed(2)}</div>
                        {target != null && <div className={fob <= target ? "text-xs text-success" : "text-xs text-destructive"}>target {target.toFixed(2)}</div>}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </li>
                );
              })}
            </ul>
            <Pager page={page} total={rows.length} onPage={setPage} />
          </>
        )}
      </Card>
      {creating && <NewCostingDialog count={q.data?.length ?? 0} onClose={() => setCreating(false)} />}
    </AppShell>
  );
}

function NewCostingDialog({ count, onClose }: { count: number; onClose: () => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const styles = useQuery({
    queryKey: ["styles", "options"],
    queryFn: async () => {
      const { data, error } = await supabase.from("styles").select("id,style_no,inquiry_id,buyers(name,currency),bom_items(category,consumption_per_pc,wastage_pct,unit_price)").order("style_no");
      if (error) throw error;
      return data;
    },
  });
  const [styleId, setStyleId] = useState("");
  const [err, setErr] = useState("");
  const m = useMutation({
    mutationFn: async () => {
      const s = styles.data?.find((x) => x.id === styleId);
      if (!s) throw new Error("Choose a style");
      // Pre-fill fabric and trims from the style's BOM
      const cost = (cats: string[]) => s.bom_items.filter((b) => cats.includes(b.category))
        .reduce((a, b) => a + Number(b.consumption_per_pc) * (1 + Number(b.wastage_pct) / 100) * Number(b.unit_price), 0);
      const { data: prev } = await supabase.from("costings").select("version").eq("style_id", s.id).order("version", { ascending: false }).limit(1);
      const { data, error } = await supabase.from("costings").insert({
        style_id: s.id, inquiry_id: s.inquiry_id, currency: s.buyers?.currency ?? "USD",
        costing_no: `CST-${new Date().getFullYear()}-${String(count + 1).padStart(3, "0")}`,
        version: (prev?.[0]?.version ?? 0) + 1,
        fabric_cost: Math.round(cost(["fabric"]) * 1000) / 1000,
        trims_cost: Math.round(cost(["trim", "accessory", "packing"]) * 1000) / 1000,
        commercial_pct: 3, profit_pct: 8,
      }).select("id").single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: (id) => { toast.success("Costing created from BOM"); qc.invalidateQueries({ queryKey: ["costings"] }); onClose(); navigate({ to: "/costings/$id", params: { id } }); },
    onError: (e) => toast.error(errMsg(e)),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>New costing</DialogTitle></DialogHeader>
        <div className="space-y-1">
          <Label>Style *</Label>
          <Select value={styleId} onValueChange={(v) => { setStyleId(v); setErr(""); }}>
            <SelectTrigger aria-invalid={!!err}><SelectValue placeholder={styles.isLoading ? "Loading…" : "Choose style"} /></SelectTrigger>
            <SelectContent>{styles.data?.map((s) => <SelectItem key={s.id} value={s.id}>{s.style_no} · {s.buyers?.name}</SelectItem>)}</SelectContent>
          </Select>
          {err && <p className="text-xs text-destructive">{err}</p>}
          <p className="text-xs text-muted-foreground">Fabric and trims cost are pre-filled from the style's BOM. You can edit everything next.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={m.isPending} onClick={() => (styleId ? m.mutate() : setErr("Choose a style"))}>{m.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
