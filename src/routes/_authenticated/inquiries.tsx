import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Card, EmptyState, ErrorState, LoadingRows, PAGE_SIZE, PageHeader, Pager, StatusBadge, Toolbar, errMsg } from "@/components/data-states";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { canWriteMerch } from "@/lib/roles";
import { useMe } from "@/lib/use-me";
import { useBuyerOptions } from "@/lib/use-buyers";
import { INQ_STATUS } from "@/lib/rmg";

export const Route = createFileRoute("/_authenticated/inquiries")({
  head: () => ({ meta: [{ title: "Inquiries / RFQ — SutoTrack RMG" }, { name: "description", content: "Track buyer inquiries and RFQs." }] }),
  component: InquiriesPage,
});



type Form = { id?: string; buyer_id: string; inquiry_no: string; style_ref: string; product_type: string; target_qty: string; target_price: string; currency: string; target_ship_date: string; status: string; notes: string };

function InquiriesPage() {
  const { data: me } = useMe();
  const canWrite = canWriteMerch(me?.roles ?? []);
  const q = useQuery({
    queryKey: ["inquiries"],
    queryFn: async () => {
      const { data, error } = await supabase.from("inquiries").select("*, buyers(name,code)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<Form | null>(null);

  const rows = useMemo(() => {
    const s = search.toLowerCase();
    return (q.data ?? []).filter((r) => (status === "all" || r.status === status) && [r.inquiry_no, r.style_ref, r.product_type, r.buyers?.name].some((v) => v?.toLowerCase().includes(s)));
  }, [q.data, search, status]);
  const pageRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const blank: Form = { buyer_id: "", inquiry_no: `INQ-${new Date().getFullYear()}-${String((q.data?.length ?? 0) + 1).padStart(3, "0")}`, style_ref: "", product_type: "", target_qty: "", target_price: "", currency: "USD", target_ship_date: "", status: "new", notes: "" };

  return (
    <AppShell>
      <PageHeader title="Inquiries / RFQ" subtitle="Every buyer request, from first contact to won or lost"
        action={canWrite && <Button onClick={() => setEditing(blank)}><Plus className="mr-1 h-4 w-4" /> New inquiry</Button>} />
      <Toolbar search={search} onSearch={(v) => { setSearch(v); setPage(0); }} placeholder="Search inquiry no, style, buyer…"
        filter={status} onFilter={(v) => { setStatus(v); setPage(0); }} options={INQ_STATUS.map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))} />
      <Card>
        {q.isLoading ? <LoadingRows /> : q.isError ? <ErrorState message={errMsg(q.error)} onRetry={() => q.refetch()} /> : rows.length === 0 ? (
          <EmptyState title={search || status !== "all" ? "No inquiries match" : "No inquiries yet"} hint="Log a buyer RFQ to start costing." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                  <tr><th className="px-4 py-2.5">Inquiry</th><th className="px-4 py-2.5">Buyer</th><th className="hidden px-4 py-2.5 md:table-cell">Qty</th><th className="hidden px-4 py-2.5 md:table-cell">Target price</th><th className="hidden px-4 py-2.5 lg:table-cell">Ship date</th><th className="px-4 py-2.5">Status</th><th /></tr>
                </thead>
                <tbody>
                  {pageRows.map((r) => (
                    <tr key={r.id} className="border-t transition-colors hover:bg-muted/40">
                      <td className="px-4 py-2.5"><div className="font-medium">{r.inquiry_no}</div><div className="text-xs text-muted-foreground">{r.product_type} {r.style_ref && `· ${r.style_ref}`}</div></td>
                      <td className="px-4 py-2.5">{r.buyers?.name}</td>
                      <td className="hidden px-4 py-2.5 tabular-nums md:table-cell">{r.target_qty.toLocaleString()}</td>
                      <td className="hidden px-4 py-2.5 tabular-nums md:table-cell">{r.target_price != null ? `${r.currency} ${Number(r.target_price).toFixed(2)}` : "—"}</td>
                      <td className="hidden px-4 py-2.5 lg:table-cell">{r.target_ship_date ?? "—"}</td>
                      <td className="px-4 py-2.5"><StatusBadge status={r.status} /></td>
                      <td className="px-2 text-right">{canWrite && (
                        <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => setEditing({
                          id: r.id, buyer_id: r.buyer_id, inquiry_no: r.inquiry_no, style_ref: r.style_ref ?? "", product_type: r.product_type,
                          target_qty: String(r.target_qty), target_price: r.target_price?.toString() ?? "", currency: r.currency,
                          target_ship_date: r.target_ship_date ?? "", status: r.status, notes: r.notes ?? "",
                        })}><Pencil className="h-4 w-4" /></Button>)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager page={page} total={rows.length} onPage={setPage} />
          </>
        )}
      </Card>
      {editing && <InquiryDialog initial={editing} onClose={() => setEditing(null)} />}
    </AppShell>
  );
}

function InquiryDialog({ initial, onClose }: { initial: Form; onClose: () => void }) {
  const qc = useQueryClient();
  const buyers = useBuyerOptions();
  const [f, setF] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const m = useMutation({
    mutationFn: async () => {
      const payload = {
        buyer_id: f.buyer_id, inquiry_no: f.inquiry_no.trim(), style_ref: f.style_ref.trim() || null, product_type: f.product_type.trim(),
        target_qty: Number(f.target_qty), target_price: f.target_price ? Number(f.target_price) : null, currency: f.currency,
        target_ship_date: f.target_ship_date || null, status: f.status, notes: f.notes.trim() || null,
      };
      const { error } = f.id ? await supabase.from("inquiries").update(payload).eq("id", f.id) : await supabase.from("inquiries").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { toast.success(f.id ? "Inquiry updated" : "Inquiry created"); qc.invalidateQueries({ queryKey: ["inquiries"] }); onClose(); },
    onError: (e) => toast.error(errMsg(e)),
  });
  function submit(e: React.FormEvent) {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!f.buyer_id) er["buyer_id"] = "Choose a buyer";
    if (!f.inquiry_no.trim()) er["inquiry_no"] = "Required";
    if (!f.product_type.trim()) er["product_type"] = "Required";
    if (!(Number(f.target_qty) > 0)) er["target_qty"] = "Enter a quantity above 0";
    if (f.target_price && !(Number(f.target_price) > 0)) er["target_price"] = "Must be above 0";
    setErrors(er);
    if (!Object.keys(er).length) m.mutate();
  }
  const inp = (k: keyof Form, label: string, type = "text", ph?: string) => (
    <div className="space-y-1">
      <Label htmlFor={k}>{label}</Label>
      <Input id={k} type={type} value={f[k] ?? ""} placeholder={ph} onChange={(e) => setF({ ...f, [k]: e.target.value })} aria-invalid={!!errors[k]} />
      {errors[k] && <p className="text-xs text-destructive">{errors[k]}</p>}
    </div>
  );
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>{f.id ? "Edit inquiry" : "New inquiry"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <Label>Buyer *</Label>
            <Select value={f.buyer_id} onValueChange={(v) => setF({ ...f, buyer_id: v, currency: buyers.data?.find((b) => b.id === v)?.currency ?? f.currency })}>
              <SelectTrigger aria-invalid={!!errors["buyer_id"]}><SelectValue placeholder={buyers.isLoading ? "Loading…" : "Choose buyer"} /></SelectTrigger>
              <SelectContent>{buyers.data?.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
            </Select>
            {errors["buyer_id"] && <p className="text-xs text-destructive">{errors["buyer_id"]}</p>}
          </div>
          {inp("inquiry_no", "Inquiry no *")}
          {inp("style_ref", "Buyer style ref", "text", "HM-TS-2207")}
          {inp("product_type", "Product *", "text", "Basic crew-neck T-shirt")}
          {inp("target_qty", "Target qty (pcs) *", "number")}
          {inp("target_price", "Target FOB / pc", "number")}
          <div className="space-y-1">
            <Label>Currency</Label>
            <Select value={f.currency} onValueChange={(v) => setF({ ...f, currency: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["USD", "EUR", "GBP"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {inp("target_ship_date", "Target ship date", "date")}
          <div className="space-y-1">
            <Label>Status</Label>
            <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{INQ_STATUS.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Fabric, GSM, wash, special requirements…" />
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
