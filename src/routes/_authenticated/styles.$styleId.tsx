import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { AppShell } from "@/components/app-shell";
import { Card, EmptyState, ErrorState, LoadingRows, PageHeader, StatusBadge, errMsg } from "@/components/data-states";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { canWriteMerch } from "@/lib/roles";
import { useMe } from "@/lib/use-me";

export const Route = createFileRoute("/_authenticated/styles/$styleId")({
  head: () => ({ meta: [{ title: "Style detail — SutoTrack RMG" }] }),
  component: StyleDetailPage,
});

type BomItem = Tables<"bom_items">;
type Style = Tables<"styles">;

const BOM_CATEGORIES = ["fabric", "trim", "accessory", "packing"];
const BOM_UNITS = ["kg", "m", "pcs", "cone", "yard", "roll", "set"];

const emptyBom = {
  category: "fabric",
  item_name: "",
  description: "",
  unit: "kg",
  consumption_per_pc: 0,
  wastage_pct: 0,
  unit_price: 0,
  supplier_name: "",
};

function StyleDetailPage() {
  const { styleId } = Route.useParams();
  const { data: me } = useMe();
  const canWrite = canWriteMerch(me?.roles ?? []);
  const qc = useQueryClient();
  const [editingBom, setEditingBom] = useState<Partial<BomItem> | null>(null);

  const sq = useQuery({
    queryKey: ["styles", styleId],
    queryFn: async () => {
      const { data, error } = await supabase.from("styles").select("*, buyers(name)").eq("id", styleId).maybeSingle();
      if (error) throw error;
      return data as (Style & { buyers: { name: string } | null }) | null;
    },
  });

  const bq = useQuery({
    queryKey: ["bom", styleId],
    queryFn: async () => {
      const { data, error } = await supabase.from("bom_items").select("*").eq("style_id", styleId).order("category,created_at");
      if (error) throw error;
      return data;
    },
  });

  const delBom = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bom_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("BOM item removed"); qc.invalidateQueries({ queryKey: ["bom", styleId] }); },
    onError: (e) => toast.error(errMsg(e)),
  });

  const st = sq.data;
  const items = bq.data ?? [];
  const grouped = BOM_CATEGORIES.map((c) => ({ category: c, items: items.filter((i) => i.category === c) }));
  const totalCost = items.reduce((sum, i) => sum + i.consumption_per_pc * (1 + i.wastage_pct / 100) * i.unit_price, 0);

  return (
    <AppShell>
      <Link to="/styles" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to styles
      </Link>
      {sq.isLoading ? <LoadingRows /> : sq.isError ? <ErrorState message={errMsg(sq.error)} onRetry={() => sq.refetch()} /> : !st ? (
        <EmptyState title="Style not found" hint="This style may have been deleted." />
      ) : (
        <>
          <PageHeader
            title={st.style_no}
            subtitle={`${st.buyers?.name ?? "—"} · ${st.product_type ?? "—"}`}
            action={canWrite && <Button onClick={() => setEditingBom({})}><Plus className="mr-1 h-4 w-4" /> Add BOM line</Button>}
          />

          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-4"><div className="text-xs uppercase text-muted-foreground">Fabric</div><div className="mt-1 text-sm font-medium">{st.fabric_desc ?? "—"}</div></Card>
            <Card className="p-4"><div className="text-xs uppercase text-muted-foreground">GSM</div><div className="mt-1 text-sm font-medium">{st.gsm ?? "—"}</div></Card>
            <Card className="p-4"><div className="text-xs uppercase text-muted-foreground">Colors / Sizes</div><div className="mt-1 text-sm font-medium">{st.colors.join(", ") || "—"} / {st.sizes.join(", ") || "—"}</div></Card>
            <Card className="p-4"><div className="text-xs uppercase text-muted-foreground">Status / BOM cost</div><div className="mt-1 flex items-center gap-2"><StatusBadge status={st.status} /><span className="text-sm font-medium">{totalCost.toFixed(3)}</span></div></Card>
          </div>

          {bq.isLoading ? <LoadingRows /> : bq.isError ? <ErrorState message={errMsg(bq.error)} onRetry={() => bq.refetch()} /> : items.length === 0 ? (
            <Card><EmptyState title="No BOM items yet" hint="Add fabric, trims, accessories and packing items to build the bill of materials." /></Card>
          ) : (
            <div className="space-y-4">
              {grouped.map((g) => g.items.length > 0 && (
                <Card key={g.category}>
                  <div className="border-b bg-muted/40 px-4 py-2 text-xs font-semibold uppercase text-muted-foreground">{g.category}</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-left text-xs uppercase text-muted-foreground">
                        <tr>
                          <th className="px-4 py-2">Item</th>
                          <th className="hidden px-4 py-2 md:table-cell">Supplier</th>
                          <th className="px-4 py-2">Cons/pc</th>
                          <th className="px-4 py-2">Waste%</th>
                          <th className="px-4 py-2">Unit price</th>
                          <th className="px-4 py-2 text-right">Cost/pc</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {g.items.map((i) => {
                          const cost = i.consumption_per_pc * (1 + i.wastage_pct / 100) * i.unit_price;
                          return (
                            <tr key={i.id} className="border-t transition-colors hover:bg-muted/40">
                              <td className="px-4 py-2"><div className="font-medium">{i.item_name}</div><div className="text-xs text-muted-foreground">{i.description ?? "—"}</div></td>
                              <td className="hidden px-4 py-2 md:table-cell">{i.supplier_name ?? "—"}</td>
                              <td className="px-4 py-2">{i.consumption_per_pc} {i.unit}</td>
                              <td className="px-4 py-2">{i.wastage_pct}%</td>
                              <td className="px-4 py-2">{i.unit_price.toFixed(2)}</td>
                              <td className="px-4 py-2 text-right font-medium">{cost.toFixed(3)}</td>
                              <td className="px-2 text-right whitespace-nowrap">
                                {canWrite && <>
                                  <Button variant="ghost" size="icon" onClick={() => setEditingBom(i)} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
                                  <Button variant="ghost" size="icon" onClick={() => delBom.mutate(i.id)} aria-label="Delete"><Trash2 className="h-4 w-4" /></Button>
                                </>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              ))}
              <div className="flex justify-end pr-2 text-sm">
                <span className="text-muted-foreground">Total BOM cost per piece: </span>
                <span className="ml-2 font-bold">{totalCost.toFixed(3)}</span>
              </div>
            </div>
          )}
        </>
      )}
      {editingBom && <BomDialog styleId={styleId} item={editingBom} onClose={() => setEditingBom(null)} />}
    </AppShell>
  );
}

function BomDialog({ styleId, item, onClose }: { styleId: string; item: Partial<BomItem>; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ ...emptyBom, ...Object.fromEntries(Object.entries(item).map(([k, v]) => [k, v ?? ""])) } as typeof emptyBom & { id?: string });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: keyof typeof emptyBom) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const m = useMutation({
    mutationFn: async () => {
      const payload = {
        style_id: styleId,
        category: f.category,
        item_name: f.item_name.trim(),
        description: f.description.trim() || null,
        unit: f.unit,
        consumption_per_pc: Number(f.consumption_per_pc) || 0,
        wastage_pct: Number(f.wastage_pct) || 0,
        unit_price: Number(f.unit_price) || 0,
        supplier_name: f.supplier_name.trim() || null,
      };
      const { error } = f.id ? await supabase.from("bom_items").update(payload).eq("id", f.id) : await supabase.from("bom_items").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { toast.success(f.id ? "BOM item updated" : "BOM item added"); qc.invalidateQueries({ queryKey: ["bom", styleId] }); onClose(); },
    onError: (e) => toast.error(errMsg(e)),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!f.item_name.trim()) er.item_name = "Item name is required";
    if (Number(f.consumption_per_pc) < 0) er.consumption_per_pc = "Cannot be negative";
    if (Number(f.unit_price) < 0) er.unit_price = "Cannot be negative";
    setErrors(er);
    if (!Object.keys(er).length) m.mutate();
  }

  const field = (k: keyof typeof emptyBom, label: string, ph?: string, type = "text") => (
    <div className="space-y-1">
      <Label htmlFor={k}>{label}</Label>
      <Input id={k} type={type} value={f[k]} onChange={set(k)} placeholder={ph} aria-invalid={!!errors[k]} />
      {errors[k] && <p className="text-xs text-destructive">{errors[k]}</p>}
    </div>
  );

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>{f.id ? "Edit BOM item" : "Add BOM item"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Category</Label>
            <Select value={f.category} onValueChange={(v) => setF({ ...f, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{BOM_CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">{field("item_name", "Item name *", "Single jersey 180gsm")}</div>
          <div className="sm:col-span-2 space-y-1">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="100% combed cotton…" rows={2} />
          </div>
          <div className="space-y-1">
            <Label>Unit</Label>
            <Select value={f.unit} onValueChange={(v) => setF({ ...f, unit: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{BOM_UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {field("consumption_per_pc", "Consumption / pc", "0.18", "number")}
          {field("wastage_pct", "Wastage %", "5", "number")}
          {field("unit_price", "Unit price", "4.20", "number")}
          {field("supplier_name", "Supplier", "Square Fashions Ltd")}
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={m.isPending}>{m.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
