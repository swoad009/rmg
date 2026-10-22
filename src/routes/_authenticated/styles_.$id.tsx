import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { AppShell } from "@/components/app-shell";
import { Card, EmptyState, ErrorState, LoadingRows, StatusBadge, errMsg } from "@/components/data-states";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { canWriteMerch } from "@/lib/roles";
import { useMe } from "@/lib/use-me";
import { STYLE_STATUS } from "@/lib/rmg";

export const Route = createFileRoute("/_authenticated/styles_/$id")({
  head: () => ({ meta: [{ title: "Style detail — SutoTrack RMG" }, { name: "description", content: "Colour-size matrix and BOM for a style." }] }),
  component: StyleDetail,
});

type Matrix = Record<string, Record<string, number>>;
type Bom = Tables<"bom_items">;
const BOM_CATS = ["fabric", "trim", "accessory", "packing"];

function StyleDetail() {
  const { id } = Route.useParams();
  const { data: me } = useMe();
  const canWrite = canWriteMerch(me?.roles ?? []);
  const q = useQuery({
    queryKey: ["style", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("styles").select("*, buyers(name), inquiries(inquiry_no), bom_items(*)").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  return (
    <AppShell>
      <Link to="/styles" className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All styles
      </Link>
      {q.isLoading ? <Card><LoadingRows rows={6} /></Card> : q.isError ? <Card><ErrorState message={errMsg(q.error)} onRetry={() => q.refetch()} /></Card> : !q.data ? (
        <Card><EmptyState title="Style not found" hint="It may have been removed or belongs to another organization." /></Card>
      ) : (
        <>
          <Header s={q.data} canWrite={canWrite} />
          <MatrixCard s={q.data} canWrite={canWrite} />
          <BomCard styleId={id} items={q.data.bom_items} matrixTotal={sumMatrix(q.data.size_color_qty as Matrix)} canWrite={canWrite} />
        </>
      )}
    </AppShell>
  );
}

function sumMatrix(m: Matrix) {
  return Object.values(m ?? {}).reduce((a, c) => a + Object.values(c ?? {}).reduce((x, y) => x + Number(y || 0), 0), 0);
}

function Header({ s, canWrite }: { s: Tables<"styles"> & { buyers: { name: string } | null; inquiries: { inquiry_no: string } | null }; canWrite: boolean }) {
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await supabase.from("styles").update({ status }).eq("id", s.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Status updated"); qc.invalidateQueries({ queryKey: ["style", s.id] }); qc.invalidateQueries({ queryKey: ["styles"] }); },
    onError: (e) => toast.error(errMsg(e)),
  });
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2"><h1 className="font-display text-2xl font-bold">{s.style_no}</h1><StatusBadge status={s.status} /></div>
        <p className="text-sm text-muted-foreground">
          {s.buyers?.name} · {s.description} · {s.fabric_desc} {s.gsm ? `${s.gsm} GSM` : ""} {s.inquiries && `· from ${s.inquiries.inquiry_no}`}
        </p>
      </div>
      {canWrite && (
        <Select value={s.status} onValueChange={(v) => m.mutate(v)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>{STYLE_STATUS.map((x) => <SelectItem key={x} value={x} className="capitalize">{x}</SelectItem>)}</SelectContent>
        </Select>
      )}
    </div>
  );
}

function MatrixCard({ s, canWrite }: { s: Tables<"styles">; canWrite: boolean }) {
  const qc = useQueryClient();
  const [m, setM] = useState<Matrix>((s.size_color_qty as Matrix) ?? {});
  useEffect(() => setM((s.size_color_qty as Matrix) ?? {}), [s.size_color_qty]);
  const dirty = JSON.stringify(m) !== JSON.stringify(s.size_color_qty ?? {});
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("styles").update({ size_color_qty: m }).eq("id", s.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Colour-size quantities saved"); qc.invalidateQueries({ queryKey: ["style", s.id] }); qc.invalidateQueries({ queryKey: ["styles"] }); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const cell = (c: string, z: string) => Number(m[c]?.[z] ?? 0);
  const set = (c: string, z: string, v: string) => {
    const n = Math.max(0, Math.floor(Number(v) || 0));
    setM({ ...m, [c]: { ...(m[c] ?? {}), [z]: n } });
  };
  const colTotal = (z: string) => s.colors.reduce((a, c) => a + cell(c, z), 0);
  const rowTotal = (c: string) => s.sizes.reduce((a, z) => a + cell(c, z), 0);
  const grand = s.colors.reduce((a, c) => a + rowTotal(c), 0);

  return (
    <Card>
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div><h2 className="font-semibold">Colour-size matrix</h2><p className="text-xs text-muted-foreground">Order quantity per colour and size (pcs)</p></div>
        {canWrite && <Button size="sm" disabled={!dirty || save.isPending} onClick={() => save.mutate()}>{save.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />} Save</Button>}
      </div>
      {s.colors.length === 0 || s.sizes.length === 0 ? <EmptyState title="No colours or sizes" hint="This style has no colours or sizes defined." /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr><th className="px-3 py-2 text-left">Colour</th>{s.sizes.map((z) => <th key={z} className="px-2 py-2 text-center">{z}</th>)}<th className="px-3 py-2 text-right">Total</th></tr>
            </thead>
            <tbody>
              {s.colors.map((c) => (
                <tr key={c} className="border-t">
                  <td className="whitespace-nowrap px-3 py-1.5 font-medium">{c}</td>
                  {s.sizes.map((z) => (
                    <td key={z} className="px-1 py-1">
                      {canWrite ? (
                        <Input type="number" min={0} inputMode="numeric" value={cell(c, z) || ""} placeholder="0" onChange={(e) => set(c, z, e.target.value)} className="h-8 min-w-16 text-center tabular-nums" aria-label={`${c} ${z}`} />
                      ) : <div className="text-center tabular-nums">{cell(c, z).toLocaleString()}</div>}
                    </td>
                  ))}
                  <td className="px-3 text-right font-medium tabular-nums">{rowTotal(c).toLocaleString()}</td>
                </tr>
              ))}
              <tr className="border-t bg-muted/30 font-semibold">
                <td className="px-3 py-2">Total</td>
                {s.sizes.map((z) => <td key={z} className="px-2 text-center tabular-nums">{colTotal(z).toLocaleString()}</td>)}
                <td className="px-3 text-right tabular-nums text-primary">{grand.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function BomCard({ styleId, items, matrixTotal, canWrite }: { styleId: string; items: Bom[]; matrixTotal: number; canWrite: boolean }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Bom> | null>(null);
  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bom_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("BOM line removed"); qc.invalidateQueries({ queryKey: ["style", styleId] }); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const sorted = useMemo(() => [...items].sort((a, b) => BOM_CATS.indexOf(a.category) - BOM_CATS.indexOf(b.category)), [items]);
  const costPc = (b: Bom) => Number(b.consumption_per_pc) * (1 + Number(b.wastage_pct) / 100) * Number(b.unit_price);
  const reqQty = (b: Bom) => Number(b.consumption_per_pc) * (1 + Number(b.wastage_pct) / 100) * matrixTotal;
  const totalPc = items.reduce((a, b) => a + costPc(b), 0);

  return (
    <Card>
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div><h2 className="font-semibold">Bill of materials</h2><p className="text-xs text-muted-foreground">Material cost per piece: <span className="font-semibold text-foreground">{totalPc.toFixed(3)}</span></p></div>
        {canWrite && <Button size="sm" onClick={() => setEditing({})}><Plus className="mr-1 h-4 w-4" /> Add line</Button>}
      </div>
      {items.length === 0 ? <EmptyState title="No BOM lines yet" hint="Add fabric, trims, accessories and packing." /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr><th className="px-3 py-2">Item</th><th className="px-3 py-2">Cons./pc</th><th className="hidden px-3 py-2 sm:table-cell">Wastage</th><th className="hidden px-3 py-2 md:table-cell">Unit price</th><th className="px-3 py-2 text-right">Cost/pc</th><th className="hidden px-3 py-2 text-right lg:table-cell">Required</th><th /></tr>
            </thead>
            <tbody>
              {sorted.map((b) => (
                <tr key={b.id} className="border-t transition-colors hover:bg-muted/40">
                  <td className="px-3 py-2"><div className="font-medium">{b.item_name} <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">{b.category}</span></div><div className="text-xs text-muted-foreground">{b.description} {b.supplier_name && `· ${b.supplier_name}`}</div></td>
                  <td className="px-3 tabular-nums">{Number(b.consumption_per_pc)} {b.unit}</td>
                  <td className="hidden px-3 tabular-nums sm:table-cell">{Number(b.wastage_pct)}%</td>
                  <td className="hidden px-3 tabular-nums md:table-cell">{Number(b.unit_price).toFixed(3)}</td>
                  <td className="px-3 text-right tabular-nums">{costPc(b).toFixed(3)}</td>
                  <td className="hidden px-3 text-right tabular-nums lg:table-cell">{reqQty(b).toLocaleString(undefined, { maximumFractionDigits: 1 })} {b.unit}</td>
                  <td className="whitespace-nowrap px-1 text-right">{canWrite && (<>
                    <Button variant="ghost" size="sm" onClick={() => setEditing(b)}>Edit</Button>
                    <Button variant="ghost" size="icon" aria-label="Delete" disabled={del.isPending} onClick={() => confirm(`Remove ${b.item_name}?`) && del.mutate(b.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </>)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing && <BomDialog styleId={styleId} item={editing} onClose={() => setEditing(null)} />}
    </Card>
  );
}

function BomDialog({ styleId, item, onClose }: { styleId: string; item: Partial<Bom>; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    category: item.category ?? "fabric", item_name: item.item_name ?? "", description: item.description ?? "", unit: item.unit ?? "pcs",
    consumption_per_pc: item.consumption_per_pc?.toString() ?? "", wastage_pct: item.wastage_pct?.toString() ?? "3",
    unit_price: item.unit_price?.toString() ?? "", supplier_name: item.supplier_name ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const m = useMutation({
    mutationFn: async () => {
      const payload = {
        style_id: styleId, category: f.category, item_name: f.item_name.trim(), description: f.description.trim() || null, unit: f.unit.trim(),
        consumption_per_pc: Number(f.consumption_per_pc), wastage_pct: Number(f.wastage_pct || 0), unit_price: Number(f.unit_price || 0), supplier_name: f.supplier_name.trim() || null,
      };
      const { error } = item.id ? await supabase.from("bom_items").update(payload).eq("id", item.id) : await supabase.from("bom_items").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { toast.success(item.id ? "BOM line updated" : "BOM line added"); qc.invalidateQueries({ queryKey: ["style", styleId] }); qc.invalidateQueries({ queryKey: ["styles"] }); onClose(); },
    onError: (e) => toast.error(errMsg(e)),
  });
  function submit(e: React.FormEvent) {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!f.item_name.trim()) er["item_name"] = "Required";
    if (!f.unit.trim()) er["unit"] = "Required";
    if (!(Number(f.consumption_per_pc) > 0)) er["consumption_per_pc"] = "Must be above 0";
    if (Number(f.wastage_pct) < 0 || Number(f.wastage_pct) > 50) er["wastage_pct"] = "0–50%";
    if (Number(f.unit_price) < 0) er["unit_price"] = "Cannot be negative";
    setErrors(er);
    if (!Object.keys(er).length) m.mutate();
  }
  const inp = (k: keyof typeof f, label: string, type = "text", ph?: string) => (
    <div className="space-y-1">
      <Label htmlFor={k}>{label}</Label>
      <Input id={k} type={type} step="any" value={f[k]} placeholder={ph} onChange={(e) => setF({ ...f, [k]: e.target.value })} aria-invalid={!!errors[k]} />
      {errors[k] && <p className="text-xs text-destructive">{errors[k]}</p>}
    </div>
  );
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>{item.id ? "Edit BOM line" : "Add BOM line"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Category</Label>
            <Select value={f.category} onValueChange={(v) => setF({ ...f, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{BOM_CATS.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {inp("item_name", "Item *", "text", "Body fabric")}
          <div className="sm:col-span-2">{inp("description", "Description", "text", "100% cotton S/J 160 GSM")}</div>
          {inp("unit", "Unit *", "text", "kg / m / pcs / cone")}
          {inp("consumption_per_pc", "Consumption per pc *", "number")}
          {inp("wastage_pct", "Wastage %", "number")}
          {inp("unit_price", "Unit price", "number")}
          <div className="sm:col-span-2">{inp("supplier_name", "Supplier", "text", "Square Textiles, Gazipur")}</div>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={m.isPending}>{m.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
