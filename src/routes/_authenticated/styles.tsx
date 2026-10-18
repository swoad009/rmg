import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, ArrowRight } from "lucide-react";
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

export const Route = createFileRoute("/_authenticated/styles")({
  head: () => ({ meta: [{ title: "Styles & BOM — SutoTrack RMG" }, { name: "description", content: "Manage styles and bill of materials." }] }),
  component: StylesPage,
});

type Style = Tables<"styles">;

const STYLE_STATUSES = [
  { value: "development", label: "Development" },
  { value: "sampling", label: "Sampling" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const PRODUCT_TYPES = ["T-Shirt (Knit)", "Polo Shirt", "Denim Pant", "Woven Shirt", "Shorts", "Sweater", "Hoodie", "Jacket"];

const empty = {
  buyer_id: "",
  inquiry_id: "",
  style_no: "",
  description: "",
  product_type: "T-Shirt (Knit)",
  fabric_desc: "",
  gsm: 0,
  colors: "",
  sizes: "",
  status: "development",
};

function StylesPage() {
  const { data: me } = useMe();
  const canWrite = canWriteMerch(me?.roles ?? []);
  const q = useQuery({
    queryKey: ["styles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("styles")
        .select("*, buyers(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<Partial<Style> | null>(null);

  const rows = useMemo(() => {
    const s = search.toLowerCase();
    return (q.data ?? []).filter(
      (st) =>
        (status === "all" || st.status === status) &&
        [st.style_no, st.description, st.buyers?.name, st.product_type].some((v) => v?.toLowerCase().includes(s)),
    );
  }, [q.data, search, status]);
  const pageRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <AppShell>
      <PageHeader
        title="Styles & BOM"
        subtitle="Manage garment styles, bill of materials, and colors/sizes"
        action={canWrite && <Button onClick={() => setEditing({})}><Plus className="mr-1 h-4 w-4" /> New style</Button>}
      />
      <Toolbar
        search={search}
        onSearch={(v) => { setSearch(v); setPage(0); }}
        placeholder="Search style no, buyer, product…"
        filter={status}
        onFilter={(v) => { setStatus(v); setPage(0); }}
        options={STYLE_STATUSES}
      />
      <Card>
        {q.isLoading ? <LoadingRows /> : q.isError ? <ErrorState message={errMsg(q.error)} onRetry={() => q.refetch()} /> : rows.length === 0 ? (
          <EmptyState title={search || status !== "all" ? "No styles match" : "No styles yet"} hint="Create your first style to start building a BOM." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5">Style</th>
                    <th className="px-4 py-2.5">Buyer</th>
                    <th className="hidden px-4 py-2.5 md:table-cell">Fabric</th>
                    <th className="hidden px-4 py-2.5 md:table-cell">GSM</th>
                    <th className="hidden px-4 py-2.5 lg:table-cell">Colors / Sizes</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((st) => (
                    <tr key={st.id} className="border-t transition-colors hover:bg-muted/40">
                      <td className="px-4 py-2.5">
                        <div className="font-medium">{st.style_no}</div>
                        <div className="text-xs text-muted-foreground">{st.description ?? "—"}</div>
                      </td>
                      <td className="px-4 py-2.5">{st.buyers?.name ?? "—"}</td>
                      <td className="hidden px-4 py-2.5 md:table-cell">{st.fabric_desc ?? "—"}</td>
                      <td className="hidden px-4 py-2.5 md:table-cell">{st.gsm ?? "—"}</td>
                      <td className="hidden px-4 py-2.5 lg:table-cell">
                        <div className="text-xs">{st.colors.join(", ") || "—"}</div>
                        <div className="text-xs text-muted-foreground">{st.sizes.join(", ") || "—"}</div>
                      </td>
                      <td className="px-4 py-2.5"><StatusBadge status={st.status} /></td>
                      <td className="px-2 text-right whitespace-nowrap">
                        <Button variant="ghost" size="sm" asChild>
                          <Link to="/styles/$styleId" params={{ styleId: st.id }}>BOM <ArrowRight className="ml-1 h-3 w-3" /></Link>
                        </Button>
                        {canWrite && <Button variant="ghost" size="icon" onClick={() => setEditing(st)} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>}
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
      {editing && <StyleDialog style={editing} onClose={() => setEditing(null)} />}
    </AppShell>
  );
}

function StyleDialog({ style, onClose }: { style: Partial<Style>; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: buyers } = useBuyerOptions();
  const [f, setF] = useState({ ...empty, ...Object.fromEntries(Object.entries(style).map(([k, v]) => [k, v ?? ""])) } as typeof empty & { id?: string });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const m = useMutation({
    mutationFn: async () => {
      const payload = {
        buyer_id: f.buyer_id,
        style_no: f.style_no.trim(),
        description: f.description.trim() || null,
        product_type: f.product_type,
        fabric_desc: f.fabric_desc.trim() || null,
        gsm: f.gsm ? Number(f.gsm) : null,
        colors: f.colors.split(",").map((c) => c.trim()).filter(Boolean),
        sizes: f.sizes.split(",").map((s) => s.trim()).filter(Boolean),
        status: f.status,
      };
      const { error } = f.id ? await supabase.from("styles").update(payload).eq("id", f.id) : await supabase.from("styles").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { toast.success(f.id ? "Style updated" : "Style added"); qc.invalidateQueries({ queryKey: ["styles"] }); onClose(); },
    onError: (e) => toast.error(errMsg(e)),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!f.buyer_id) er.buyer_id = "Select a buyer";
    if (!f.style_no.trim()) er.style_no = "Style number is required";
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
        <DialogHeader><DialogTitle>{f.id ? "Edit style" : "New style"}</DialogTitle></DialogHeader>
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
          {field("style_no", "Style number *", "ST-9004")}
          <div className="sm:col-span-2 space-y-1">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Mens basic crew tee, short sleeve…" rows={2} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="product_type">Product type</Label>
            <Select value={f.product_type} onValueChange={(v) => setF({ ...f, product_type: v })}>
              <SelectTrigger id="product_type"><SelectValue /></SelectTrigger>
              <SelectContent>{PRODUCT_TYPES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {field("gsm", "GSM", "180", "number")}
          {field("fabric_desc", "Fabric description", "Single jersey cotton")}
          {field("colors", "Colors (comma separated)", "White, Black, Navy")}
          <div className="sm:col-span-2">{field("sizes", "Sizes (comma separated)", "S, M, L, XL")}</div>
          <div className="space-y-1">
            <Label>Status</Label>
            <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STYLE_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
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
