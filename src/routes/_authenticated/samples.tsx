import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus } from "lucide-react";
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
import { canWriteMerch } from "@/lib/roles";
import { useMe } from "@/lib/use-me";

export const Route = createFileRoute("/_authenticated/samples")({
  head: () => ({ meta: [{ title: "Samples — SutoTrack RMG" }, { name: "description", content: "Track sample submissions and approvals." }] }),
  component: SamplesPage,
});

type Sample = Tables<"samples">;

const SAMPLE_TYPES = [
  { value: "proto", label: "Proto" },
  { value: "fit", label: "Fit" },
  { value: "size_set", label: "Size set" },
  { value: "pp", label: "PP" },
  { value: "shipment", label: "Shipment" },
];
const SAMPLE_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "sent", label: "Sent" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "resubmit", label: "Resubmit" },
];

const empty = {
  style_id: "",
  sample_type: "proto",
  sent_date: "",
  courier_ref: "",
  buyer_comment: "",
  status: "pending",
  remarks: "",
};

function SamplesPage() {
  const { data: me } = useMe();
  const canWrite = canWriteMerch(me?.roles ?? []);
  const q = useQuery({
    queryKey: ["samples"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("samples")
        .select("*, styles(style_no, buyers(name))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const [search, setSearch] = useState("");
  const [sampleType, setSampleType] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<Partial<Sample> | null>(null);

  const rows = useMemo(() => {
    const s = search.toLowerCase();
    return (q.data ?? []).filter(
      (sm) =>
        (sampleType === "all" || sm.sample_type === sampleType) &&
        (status === "all" || sm.status === status) &&
        [sm.styles?.style_no, sm.styles?.buyers?.name, sm.courier_ref].some((v) => v?.toLowerCase().includes(s)),
    );
  }, [q.data, search, sampleType, status]);
  const pageRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <AppShell>
      <PageHeader
        title="Samples"
        subtitle="Track sample submissions and buyer approvals"
        action={canWrite && <Button onClick={() => setEditing({})}><Plus className="mr-1 h-4 w-4" /> Log sample</Button>}
      />
      <div className="flex flex-col gap-2 sm:flex-row">
        <Toolbar
          search={search}
          onSearch={(v) => { setSearch(v); setPage(0); }}
          placeholder="Search style, buyer, courier…"
        />
        <Select value={sampleType} onValueChange={(v) => { setSampleType(v); setPage(0); }}>
          <SelectTrigger className="sm:w-40"><SelectValue placeholder="All types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {SAMPLE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(0); }}>
          <SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {SAMPLE_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <Card>
        {q.isLoading ? <LoadingRows /> : q.isError ? <ErrorState message={errMsg(q.error)} onRetry={() => q.refetch()} /> : rows.length === 0 ? (
          <EmptyState title={search || sampleType !== "all" || status !== "all" ? "No samples match" : "No samples yet"} hint="Log a proto, fit, or PP sample to track buyer approvals." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5">Style</th>
                    <th className="px-4 py-2.5">Type</th>
                    <th className="hidden px-4 py-2.5 md:table-cell">Sent</th>
                    <th className="hidden px-4 py-2.5 md:table-cell">Courier</th>
                    <th className="hidden px-4 py-2.5 lg:table-cell">Buyer comment</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((sm) => (
                    <tr key={sm.id} className="border-t transition-colors hover:bg-muted/40">
                      <td className="px-4 py-2.5"><div className="font-medium">{sm.styles?.style_no ?? "—"}</div><div className="text-xs text-muted-foreground">{sm.styles?.buyers?.name ?? "—"}</div></td>
                      <td className="px-4 py-2.5 capitalize">{sm.sample_type.replace("_", " ")}</td>
                      <td className="hidden px-4 py-2.5 md:table-cell">{sm.sent_date ?? "—"}</td>
                      <td className="hidden px-4 py-2.5 md:table-cell">{sm.courier_ref ?? "—"}</td>
                      <td className="hidden px-4 py-2.5 lg:table-cell max-w-xs truncate">{sm.buyer_comment ?? "—"}</td>
                      <td className="px-4 py-2.5"><StatusBadge status={sm.status} /></td>
                      <td className="px-2 text-right">{canWrite && <Button variant="ghost" size="icon" onClick={() => setEditing(sm)} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager page={page} total={rows.length} onPage={setPage} />
          </>
        )}
      </Card>
      {editing && <SampleDialog sample={editing} onClose={() => setEditing(null)} />}
    </AppShell>
  );
}

function SampleDialog({ sample, onClose }: { sample: Partial<Sample>; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ ...empty, ...Object.fromEntries(Object.entries(sample).map(([k, v]) => [k, v ?? ""])) } as typeof empty & { id?: string });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const styles = useQuery({
    queryKey: ["styles", "for-samples"],
    queryFn: async () => {
      const { data, error } = await supabase.from("styles").select("id,style_no").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const m = useMutation({
    mutationFn: async () => {
      const payload = {
        style_id: f.style_id,
        sample_type: f.sample_type,
        sent_date: f.sent_date || null,
        courier_ref: f.courier_ref.trim() || null,
        buyer_comment: f.buyer_comment.trim() || null,
        status: f.status,
        remarks: f.remarks.trim() || null,
      };
      const { error } = f.id ? await supabase.from("samples").update(payload).eq("id", f.id) : await supabase.from("samples").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { toast.success(f.id ? "Sample updated" : "Sample logged"); qc.invalidateQueries({ queryKey: ["samples"] }); onClose(); },
    onError: (e) => toast.error(errMsg(e)),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!f.style_id) er.style_id = "Select a style";
    setErrors(er);
    if (!Object.keys(er).length) m.mutate();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>{f.id ? "Edit sample" : "Log sample"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="style_id">Style *</Label>
            <Select value={f.style_id} onValueChange={(v) => setF({ ...f, style_id: v })}>
              <SelectTrigger id="style_id" aria-invalid={!!errors.style_id}><SelectValue placeholder="Select style" /></SelectTrigger>
              <SelectContent>
                {(styles.data ?? []).map((s) => <SelectItem key={s.id} value={s.id}>{s.style_no}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.style_id && <p className="text-xs text-destructive">{errors.style_id}</p>}
          </div>
          <div className="space-y-1">
            <Label>Sample type</Label>
            <Select value={f.sample_type} onValueChange={(v) => setF({ ...f, sample_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SAMPLE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="sent_date">Sent date</Label>
            <Input id="sent_date" type="date" value={f.sent_date} onChange={set("sent_date")} />
          </div>
          {field("courier_ref", "Courier ref", "DHL-884521")}
          <div className="space-y-1">
            <Label>Status</Label>
            <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SAMPLE_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2 space-y-1">
            <Label htmlFor="buyer_comment">Buyer comment</Label>
            <Textarea id="buyer_comment" value={f.buyer_comment} onChange={(e) => setF({ ...f, buyer_comment: e.target.value })} rows={2} placeholder="Feedback from buyer…" />
          </div>
          <div className="sm:col-span-2 space-y-1">
            <Label htmlFor="remarks">Internal remarks</Label>
            <Textarea id="remarks" value={f.remarks} onChange={(e) => setF({ ...f, remarks: e.target.value })} rows={2} />
          </div>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={m.isPending}>{m.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );

  function field(k: keyof typeof empty, label: string, ph?: string) {
    return (
      <div className="space-y-1">
        <Label htmlFor={k}>{label}</Label>
        <Input id={k} value={f[k]} onChange={set(k)} placeholder={ph} />
      </div>
    );
  }
}
