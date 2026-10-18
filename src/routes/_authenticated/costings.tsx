import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Pencil, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { AppShell } from "@/components/app-shell";
import { Card, EmptyState, ErrorState, LoadingRows, PAGE_SIZE, PageHeader, Pager, StatusBadge, Toolbar, errMsg } from "@/components/data-states";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { canApprove, canWriteMerch } from "@/lib/roles";
import { useBuyerOptions } from "@/lib/use-buyers";
import { useMe } from "@/lib/use-me";

export const Route = createFileRoute("/_authenticated/costings")({
  head: () => ({ meta: [{ title: "Costing — SutoTrack RMG" }, { name: "description", content: "Manage cost sheets and approvals." }] }),
  component: CostingsPage,
});

type Costing = Tables<"costings">;

const COSTING_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];
const CURRENCIES = ["USD", "EUR", "GBP", "BDT"];

const empty = {
  inquiry_id: "",
  style_id: "",
  costing_no: "",
  currency: "USD",
  fabric_cost: 0,
  trims_cost: 0,
  cm_cost: 0,
  washing_cost: 0,
  other_cost: 0,
  commercial_pct: 0,
  profit_pct: 0,
  status: "draft",
  notes: "",
};

function CostingsPage() {
  const { data: me } = useMe();
  const canWrite = canWriteMerch(me?.roles ?? []);
  const canApproveCostings = canApprove(me?.roles ?? []);
  const q = useQuery({
    queryKey: ["costings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("costings")
        .select("*, inquiries(inquiry_no), styles(style_no)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<Partial<Costing> | null>(null);

  const rows = useMemo(() => {
    const s = search.toLowerCase();
    return (q.data ?? []).filter(
      (c) =>
        (status === "all" || c.status === status) &&
        [c.costing_no, c.inquiries?.inquiry_no, c.styles?.style_no].some((v) => v?.toLowerCase().includes(s)),
    );
  }, [q.data, search, status]);
  const pageRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <AppShell>
      <PageHeader
        title="Costing"
        subtitle="Cost sheets with FOB calculation and approval workflow"
        action={canWrite && <Button onClick={() => setEditing({})}><Plus className="mr-1 h-4 w-4" /> New costing</Button>}
      />
      <Toolbar
        search={search}
        onSearch={(v) => { setSearch(v); setPage(0); }}
        placeholder="Search costing no, inquiry, style…"
        filter={status}
        onFilter={(v) => { setStatus(v); setPage(0); }}
        options={COSTING_STATUSES}
      />
      <Card>
        {q.isLoading ? <LoadingRows /> : q.isError ? <ErrorState message={errMsg(q.error)} onRetry={() => q.refetch()} /> : rows.length === 0 ? (
          <EmptyState title={search || status !== "all" ? "No costings match" : "No costings yet"} hint="Create a cost sheet to calculate FOB price for an inquiry." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5">Costing</th>
                    <th className="hidden px-4 py-2.5 md:table-cell">Inquiry</th>
                    <th className="hidden px-4 py-2.5 md:table-cell">Style</th>
                    <th className="px-4 py-2.5">FOB</th>
                    <th className="hidden px-4 py-2.5 lg:table-cell">Version</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((c) => (
                    <tr key={c.id} className="border-t transition-colors hover:bg-muted/40">
                      <td className="px-4 py-2.5"><div className="font-medium">{c.costing_no}</div><div className="text-xs text-muted-foreground">{c.currency}</div></td>
                      <td className="hidden px-4 py-2.5 md:table-cell">{c.inquiries?.inquiry_no ?? "—"}</td>
                      <td className="hidden px-4 py-2.5 md:table-cell">{c.styles?.style_no ?? "—"}</td>
                      <td className="px-4 py-2.5 font-medium">{c.fob_price != null ? c.fob_price.toFixed(3) : "—"}</td>
                      <td className="hidden px-4 py-2.5 lg:table-cell">v{c.version}</td>
                      <td className="px-4 py-2.5"><StatusBadge status={c.status} /></td>
                      <td className="px-2 text-right whitespace-nowrap">
                        {canApproveCostings && c.status === "submitted" && <CostingActions costing={c} />}
                        {canWrite && c.status === "draft" && <Button variant="ghost" size="icon" onClick={() => setEditing(c)} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager page={page} total={rows.length} onPage={setPage} />
          </>
        )}
      </Card>
      {editing && <CostingDialog costing={editing} onClose={() => setEditing(null)} />}
    </AppShell>
  );
}

function CostingActions({ costing }: { costing: Costing }) {
  const qc = useQueryClient();
  const approve = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("costings").update({ status: "approved" }).eq("id", costing.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Costing approved"); qc.invalidateQueries({ queryKey: ["costings"] }); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const reject = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("costings").update({ status: "rejected" }).eq("id", costing.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Costing rejected"); qc.invalidateQueries({ queryKey: ["costings"] }); },
    onError: (e) => toast.error(errMsg(e)),
  });
  return (
    <>
      <Button variant="ghost" size="icon" onClick={() => approve.mutate()} aria-label="Approve"><Check className="h-4 w-4 text-success" /></Button>
      <Button variant="ghost" size="icon" onClick={() => reject.mutate()} aria-label="Reject"><X className="h-4 w-4 text-destructive" /></Button>
    </>
  );
}

function CostingDialog({ costing, onClose }: { costing: Partial<Costing>; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: buyers } = useBuyerOptions();
  const [f, setF] = useState({ ...empty, ...Object.fromEntries(Object.entries(costing).map(([k, v]) => [k, v ?? ""])) } as typeof empty & { id?: string });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const inquiries = useQuery({
    queryKey: ["inquiries", "for-costing"],
    queryFn: async () => {
      const { data, error } = await supabase.from("inquiries").select("id,inquiry_no").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const styles = useQuery({
    queryKey: ["styles", "for-costing"],
    queryFn: async () => {
      const { data, error } = await supabase.from("styles").select("id,style_no").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const subtotal = (Number(f.fabric_cost) + Number(f.trims_cost) + Number(f.cm_cost) + Number(f.washing_cost) + Number(f.other_cost));
  const withCommercial = subtotal * (1 + Number(f.commercial_pct) / 100);
  const fob = withCommercial * (1 + Number(f.profit_pct) / 100);

  const m = useMutation({
    mutationFn: async () => {
      const payload = {
        inquiry_id: f.inquiry_id || null,
        style_id: f.style_id || null,
        costing_no: f.costing_no.trim(),
        currency: f.currency,
        fabric_cost: Number(f.fabric_cost) || 0,
        trims_cost: Number(f.trims_cost) || 0,
        cm_cost: Number(f.cm_cost) || 0,
        washing_cost: Number(f.washing_cost) || 0,
        other_cost: Number(f.other_cost) || 0,
        commercial_pct: Number(f.commercial_pct) || 0,
        profit_pct: Number(f.profit_pct) || 0,
        status: f.status,
        notes: f.notes.trim() || null,
      };
      const { error } = f.id ? await supabase.from("costings").update(payload).eq("id", f.id) : await supabase.from("costings").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { toast.success(f.id ? "Costing updated" : "Costing added"); qc.invalidateQueries({ queryKey: ["costings"] }); onClose(); },
    onError: (e) => toast.error(errMsg(e)),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!f.costing_no.trim()) er.costing_no = "Costing number is required";
    setErrors(er);
    if (!Object.keys(er).length) m.mutate();
  }

  const field = (k: keyof typeof empty, label: string, ph?: string, type = "number") => (
    <div className="space-y-1">
      <Label htmlFor={k}>{label}</Label>
      <Input id={k} type={type} value={f[k]} onChange={set(k)} placeholder={ph} aria-invalid={!!errors[k]} step={type === "number" ? "0.01" : undefined} />
      {errors[k] && <p className="text-xs text-destructive">{errors[k]}</p>}
    </div>
  );

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>{f.id ? "Edit costing" : "New costing"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          {field("costing_no", "Costing number *", "CST-2026-003", "text")}
          <div className="space-y-1">
            <Label>Currency</Label>
            <Select value={f.currency} onValueChange={(v) => setF({ ...f, currency: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Inquiry</Label>
            <Select value={f.inquiry_id} onValueChange={(v) => setF({ ...f, inquiry_id: v })}>
              <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
              <SelectContent>
                {(inquiries.data ?? []).map((i) => <SelectItem key={i.id} value={i.id}>{i.inquiry_no}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Style</Label>
            <Select value={f.style_id} onValueChange={(v) => setF({ ...f, style_id: v })}>
              <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
              <SelectContent>
                {(styles.data ?? []).map((s) => <SelectItem key={s.id} value={s.id}>{s.style_no}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="sm:col-span-2 mt-2 text-xs font-semibold uppercase text-muted-foreground">Cost components (per piece)</div>
          {field("fabric_cost", "Fabric cost", "0.76")}
          {field("trims_cost", "Trims cost", "0.41")}
          {field("cm_cost", "CM (making) cost", "0.85")}
          {field("washing_cost", "Washing cost", "0.00")}
          {field("other_cost", "Other cost", "0.10")}
          {field("commercial_pct", "Commercial %", "3")}
          {field("profit_pct", "Profit %", "12")}

          <div className="sm:col-span-2 rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span className="font-medium">{subtotal.toFixed(3)} {f.currency}</span></div>
            <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">After commercial ({f.commercial_pct}%)</span><span className="font-medium">{withCommercial.toFixed(3)} {f.currency}</span></div>
            <div className="mt-1 flex items-center justify-between border-t pt-2"><span className="font-semibold">FOB price</span><span className="text-lg font-bold text-primary">{fob.toFixed(3)} {f.currency}</span></div>
          </div>

          <div className="space-y-1">
            <Label>Status</Label>
            <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{COSTING_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2 space-y-1">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} rows={2} />
          </div>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={m.isPending}>{m.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
