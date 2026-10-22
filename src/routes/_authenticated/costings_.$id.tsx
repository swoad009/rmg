import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Loader2, Save, Send, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Card, EmptyState, ErrorState, LoadingRows, StatusBadge, errMsg } from "@/components/data-states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { calcFob } from "@/lib/rmg";
import { canApprove, canWriteMerch } from "@/lib/roles";
import { useMe } from "@/lib/use-me";

export const Route = createFileRoute("/_authenticated/costings_/$id")({
  head: () => ({ meta: [{ title: "Costing sheet — SutoTrack RMG" }, { name: "description", content: "Edit costing and approve FOB." }] }),
  component: CostingSheet,
});

const FIELDS = [
  { k: "fabric_cost", l: "Fabric cost / pc" },
  { k: "trims_cost", l: "Trims & accessories / pc" },
  { k: "cm_cost", l: "CM (cut & make) / pc" },
  { k: "washing_cost", l: "Washing / printing / pc" },
  { k: "other_cost", l: "Testing, freight & other / pc" },
  { k: "commercial_pct", l: "Commercial cost %" },
  { k: "profit_pct", l: "Profit margin %" },
] as const;
type K = (typeof FIELDS)[number]["k"];

function CostingSheet() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data: me } = useMe();
  const roles = me?.roles ?? [];
  const q = useQuery({
    queryKey: ["costing", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("costings").select("*, styles(id, style_no, buyers(name)), inquiries(inquiry_no, target_price, target_qty)").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const [f, setF] = useState<Record<K, string>>({} as Record<K, string>);
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!q.data) return;
    setF(Object.fromEntries(FIELDS.map(({ k }) => [k, String(q.data![k] ?? 0)])) as Record<K, string>);
    setNotes(q.data.notes ?? "");
  }, [q.data]);

  const c = q.data;
  const locked = c?.status === "approved";
  const editable = canWriteMerch(roles) && !locked;
  const nums = Object.fromEntries(FIELDS.map(({ k }) => [k, Number(f[k] || 0)])) as Record<K, number>;
  const fob = calcFob(nums);
  const base = nums.fabric_cost + nums.trims_cost + nums.cm_cost + nums.washing_cost + nums.other_cost;
  const target = c?.inquiries?.target_price != null ? Number(c.inquiries.target_price) : null;

  const save = useMutation({
    mutationFn: async (status?: string) => {
      const payload: Record<string, unknown> = { ...nums, notes: notes.trim() || null };
      if (status) payload.status = status;
      const { error } = await supabase.from("costings").update(payload).eq("id", id);
      if (error) throw error;
      return status;
    },
    onSuccess: (status) => {
      toast.success(status === "approved" ? "Costing approved" : status === "rejected" ? "Costing rejected" : status === "submitted" ? "Sent for approval" : "Costing saved");
      qc.invalidateQueries({ queryKey: ["costing", id] });
      qc.invalidateQueries({ queryKey: ["costings"] });
    },
    onError: (e) => toast.error(errMsg(e)),
  });
  function run(status?: string) {
    const er: Record<string, string> = {};
    FIELDS.forEach(({ k }) => { if (f[k] === "" || isNaN(Number(f[k])) || Number(f[k]) < 0) er[k] = "Enter 0 or more"; });
    if (nums.profit_pct > 100) er.profit_pct = "Max 100%";
    setErrors(er);
    if (!Object.keys(er).length) save.mutate(status);
  }

  return (
    <AppShell>
      <Link to="/costings" className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All costings
      </Link>
      {q.isLoading ? <Card><LoadingRows rows={6} /></Card> : q.isError ? <Card><ErrorState message={errMsg(q.error)} onRetry={() => q.refetch()} /></Card> : !c ? (
        <Card><EmptyState title="Costing not found" /></Card>
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2"><h1 className="font-display text-2xl font-bold">{c.costing_no}</h1><span className="text-sm text-muted-foreground">v{c.version}</span><StatusBadge status={c.status} /></div>
              <p className="text-sm text-muted-foreground">
                {c.styles && <Link to="/styles/$id" params={{ id: c.styles.id }} className="underline-offset-2 hover:underline">{c.styles.style_no}</Link>} · {c.styles?.buyers?.name}
                {c.inquiries && ` · ${c.inquiries.inquiry_no} (${c.inquiries.target_qty.toLocaleString()} pcs)`}
              </p>
              {c.approved_at && <p className="text-xs text-muted-foreground">Decision recorded {new Date(c.approved_at).toLocaleString()}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              {editable && <Button variant="outline" disabled={save.isPending} onClick={() => run()}><Save className="mr-1 h-4 w-4" /> Save</Button>}
              {editable && c.status === "draft" && <Button disabled={save.isPending} onClick={() => run("submitted")}><Send className="mr-1 h-4 w-4" /> Submit</Button>}
              {canApprove(roles) && c.status === "submitted" && (<>
                <Button variant="outline" disabled={save.isPending} onClick={() => run("rejected")}><X className="mr-1 h-4 w-4" /> Reject</Button>
                <Button disabled={save.isPending} onClick={() => run("approved")}><Check className="mr-1 h-4 w-4" /> Approve</Button>
              </>)}
              {editable && c.status === "rejected" && <Button disabled={save.isPending} onClick={() => run("draft")}>Reopen as draft</Button>}
              {save.isPending && <Loader2 className="h-5 w-5 animate-spin self-center text-muted-foreground" />}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="p-4 lg:col-span-2">
              <h2 className="mb-3 font-semibold">Cost breakdown <span className="text-xs font-normal text-muted-foreground">({c.currency} per piece)</span></h2>
              {locked && <p className="mb-3 rounded-md bg-success/10 px-3 py-2 text-xs text-success">Approved costings are locked. Create a new version to change prices.</p>}
              <div className="grid gap-3 sm:grid-cols-2">
                {FIELDS.map(({ k, l }) => (
                  <div key={k} className="space-y-1">
                    <Label htmlFor={k}>{l}</Label>
                    <Input id={k} type="number" step="any" min={0} disabled={!editable} value={f[k] ?? ""} onChange={(e) => setF({ ...f, [k]: e.target.value })} aria-invalid={!!errors[k]} className="tabular-nums" />
                    {errors[k] && <p className="text-xs text-destructive">{errors[k]}</p>}
                  </div>
                ))}
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" disabled={!editable} value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
              </div>
            </Card>
            <Card className="h-fit p-4">
              <h2 className="mb-3 font-semibold">Summary</h2>
              <dl className="space-y-2 text-sm">
                <Row l="Base cost" v={base.toFixed(3)} />
                <Row l={`Commercial (${nums.commercial_pct}%)`} v={(base * nums.commercial_pct / 100).toFixed(3)} />
                <Row l={`Profit (${nums.profit_pct}%)`} v={(base * (1 + nums.commercial_pct / 100) * nums.profit_pct / 100).toFixed(3)} />
              </dl>
              <div className="mt-4 rounded-lg bg-primary/10 p-3">
                <div className="text-xs uppercase text-muted-foreground">FOB / pc</div>
                <div className="font-display text-3xl font-bold text-primary tabular-nums transition-all">{c.currency} {fob.toFixed(3)}</div>
                {target != null && (
                  <div className={fob <= target ? "mt-1 text-xs text-success" : "mt-1 text-xs text-destructive"}>
                    Buyer target {target.toFixed(2)} · {fob <= target ? "within target" : `${(fob - target).toFixed(3)} over`}
                  </div>
                )}
              </div>
              {c.inquiries && <p className="mt-3 text-xs text-muted-foreground">Order value ≈ {c.currency} {(fob * c.inquiries.target_qty).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>}
            </Card>
          </div>
        </>
      )}
    </AppShell>
  );
}

function Row({ l, v }: { l: string; v: string }) {
  return <div className="flex justify-between"><dt className="text-muted-foreground">{l}</dt><dd className="tabular-nums">{v}</dd></div>;
}
