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
import { useBuyerOptions } from "@/lib/use-buyers";
import { useMe } from "@/lib/use-me";

export const Route = createFileRoute("/_authenticated/inquiries")({
  head: () => ({ meta: [{ title: "Inquiries — SutoTrack RMG" }, { name: "description", content: "Buyer inquiries and RFQs." }] }),
  component: InquiriesPage,
});

type Inquiry = Tables<"inquiries">;

const INQUIRY_STATUSES = [
  { value: "new", label: "New" },
  { value: "costing", label: "Costing" },
  { value: "quoted", label: "Quoted" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
];

const PRODUCT_TYPES = ["T-Shirt (Knit)", "Polo Shirt", "Denim Pant", "Woven Shirt", "Shorts", "Sweater", "Hoodie", "Jacket"];
const CURRENCIES = ["USD", "EUR", "GBP", "BDT"];

const empty = {
  buyer_id: "",
  inquiry_no: "",
  style_ref: "",
  product_type: "T-Shirt (Knit)",
  target_qty: 0,
  target_price: 0,
  currency: "USD",
  target_ship_date: "",
  status: "new",
  notes: "",
};

function InquiriesPage() {
  const { data: me } = useMe();
  const canWrite = canWriteMerch(me?.roles ?? []);
  const q = useQuery({
    queryKey: ["inquiries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inquiries")
        .select("*, buyers(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<Partial<Inquiry> | null>(null);

  const rows = useMemo(() => {
    const s = search.toLowerCase();
    return (q.data ?? []).filter(
      (i) =>
        (status === "all" || i.status === status) &&
        [i.inquiry_no, i.style_ref, i.product_type, i.buyers?.name].some((v) => v?.toLowerCase().includes(s)),
    );
  }, [q.data, search, status]);
  const pageRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <AppShell>
      <PageHeader
        title="Inquiries / RFQ"
        subtitle="Buyer inquiries and requests for quotation"
        action={canWrite && <Button onClick={() => setEditing({})}><Plus className="mr-1 h-4 w-4" /> New inquiry</Button>}
      />
      <Toolbar
        search={search}
        onSearch={(v) => { setSearch(v); setPage(0); }}
        placeholder="Search inquiry no, style ref, buyer…"
        filter={status}
        onFilter={(v) => { setStatus(v); setPage(0); }}
        options={INQUIRY_STATUSES}
      />
      <Card>
        {q.isLoading ? <LoadingRows /> : q.isError ? <ErrorState message={errMsg(q.error)} onRetry={() => q.refetch()} /> : rows.length === 0 ? (
          <EmptyState title={search || status !== "all" ? "No inquiries match" : "No inquiries yet"} hint="Create your first inquiry to start the costing process." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5">Inquiry</th>
                    <th className="px-4 py-2.5">Buyer</th>
                    <th className="hidden px-4 py-2.5 md:table-cell">Product</th>
                    <th className="hidden px-4 py-2.5 md:table-cell">Qty</th>
                    <th className="hidden px-4 py-2.5 lg:table-cell">Target price</th>
                    <th className="hidden px-4 py-2.5 lg:table-cell">Ship date</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((i) => (
                    <tr key={i.id} className="border-t transition-colors hover:bg-muted/40">
                      <td className="px-4 py-2.5">
                        <div className="font-medium">{i.inquiry_no}</div>
                        <div className="text-xs text-muted-foreground">{i.style_ref ?? "—"}</div>
                      </td>
                      <td className="px-4 py-2.5">{i.buyers?.name ?? "—"}</td>
                      <td className="hidden px-4 py-2.5 md:table-cell">{i.product_type}</td>
                      <td className="hidden px-4 py-2.5 md:table-cell">{i.target_qty.toLocaleString()}</td>
                      <td className="hidden px-4 py-2.5 lg:table-cell">{i.target_price != null ? `${i.target_price.toFixed(2)} ${i.currency}` : "—"}</td>
                      <td className="hidden px-4 py-2.5 lg:table-cell">{i.target_ship_date ?? "—"}</td>
                      <td className="px-4 py-2.5"><StatusBadge status={i.status} /></td>
                      <td className="px-2 text-right">{canWrite && <Button variant="ghost" size="icon" onClick={() => setEditing(i)} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager page={page} total={rows.length} onPage={setPage} />
          </>
        )}
      </Card>
      {editing && <InquiryDialog inquiry={editing} onClose={() => setEditing(null)} />}
    </AppShell>
  );
}

function InquiryDialog({ inquiry, onClose }: { inquiry: Partial<Inquiry>; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: buyers } = useBuyerOptions();
  const [f, setF] = useState({ ...empty, ...Object.fromEntries(Object.entries(inquiry).map(([k, v]) => [k, v ?? ""])) } as typeof empty & { id?: string });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const m = useMutation({
    mutationFn: async () => {
      const payload = {
        buyer_id: f.buyer_id,
        inquiry_no: f.inquiry_no.trim(),
        style_ref: f.style_ref.trim() || null,
        product_type: f.product_type,
        target_qty: Number(f.target_qty) || 0,
        target_price: f.target_price ? Number(f.target_price) : null,
        currency: f.currency,
        target_ship_date: f.target_ship_date || null,
        status: f.status,
        notes: f.notes.trim() || null,
      };
      const { error } = f.id ? await supabase.from("inquiries").update(payload).eq("id", f.id) : await supabase.from("inquiries").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { toast.success(f.id ? "Inquiry updated" : "Inquiry added"); qc.invalidateQueries({ queryKey: ["inquiries"] }); onClose(); },
    onError: (e) => toast.error(errMsg(e)),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!f.buyer_id) er.buyer_id = "Select a buyer";
    if (!f.inquiry_no.trim()) er.inquiry_no = "Inquiry number is required";
    if (!f.product_type.trim()) er.product_type = "Product type is required";
    if (Number(f.target_qty) < 0) er.target_qty = "Quantity cannot be negative";
    if (f.target_price && Number(f.target_price) < 0) er.target_price = "Price cannot be negative";
    setErrors(er);
    if (!Object.keys(er).length) m.mutate();
  }

  const field = (k: keyof typeof empty, label: string, ph?: string, type = "text") => (
    <div className="space-y-1">
      <Label htmlFor={k}>{label}</Label>
      <Input id={k} type={type} value={f[k]} onChange={set(k)} placeholder={ph} aria-invalid={!!errors[k]} />
      {errors[k] && <p className="text-xs text-destructive">{errors[k]}</p>}
    </div>
  );

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>{f.id ? "Edit inquiry" : "New inquiry"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="buyer_id">Buyer *</Label>
            <Select value={f.buyer_id} onValueChange={(v) => setF({ ...f, buyer_id: v })}>
              <SelectTrigger id="buyer_id" aria-invalid={!!errors.buyer_id}><SelectValue placeholder="Select buyer" /></SelectTrigger>
              <SelectContent>
                {(buyers ?? []).map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.buyer_id && <p className="text-xs text-destructive">{errors.buyer_id}</p>}
          </div>
          {field("inquiry_no", "Inquiry number *", "INQ-2026-004")}
          {field("style_ref", "Style reference", "ST-9004")}
          <div className="space-y-1">
            <Label htmlFor="product_type">Product type *</Label>
            <Select value={f.product_type} onValueChange={(v) => setF({ ...f, product_type: v })}>
              <SelectTrigger id="product_type" aria-invalid={!!errors.product_type}><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRODUCT_TYPES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.product_type && <p className="text-xs text-destructive">{errors.product_type}</p>}
          </div>
          {field("target_qty", "Target quantity", "50000", "number")}
          {field("target_price", "Target price (FOB)", "3.20", "number")}
          <div className="space-y-1">
            <Label>Currency</Label>
            <Select value={f.currency} onValueChange={(v) => setF({ ...f, currency: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {field("target_ship_date", "Target ship date", "", "date")}
          <div className="space-y-1">
            <Label>Status</Label>
            <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{INQUIRY_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2 space-y-1">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Fabric, wash, special requirements…" rows={3} />
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
