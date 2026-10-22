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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { canWriteMerch } from "@/lib/roles";
import { useMe } from "@/lib/use-me";
import { useBuyerOptions } from "@/lib/use-buyers";
import { STYLE_STATUS } from "@/lib/rmg";

export const Route = createFileRoute("/_authenticated/styles")({
  head: () => ({ meta: [{ title: "Styles & BOM — SutoTrack RMG" }, { name: "description", content: "Styles, colour-size breakdown and bill of materials." }] }),
  component: StylesPage,
});


const splitList = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

function StylesPage() {
  const { data: me } = useMe();
  const canWrite = canWriteMerch(me?.roles ?? []);
  const q = useQuery({
    queryKey: ["styles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("styles").select("*, buyers(name), bom_items(count)").order("created_at", { ascending: false });
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
    return (q.data ?? []).filter((r) => (status === "all" || r.status === status) && [r.style_no, r.description, r.buyers?.name, r.fabric_desc].some((v) => v?.toLowerCase().includes(s)));
  }, [q.data, search, status]);
  const pageRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const total = (m: unknown) => Object.values((m ?? {}) as Record<string, Record<string, number>>).reduce((a, c) => a + Object.values(c).reduce((x, y) => x + Number(y || 0), 0), 0);

  return (
    <AppShell>
      <PageHeader title="Styles & BOM" subtitle="Colour-size breakdown and materials for every style"
        action={canWrite && <Button onClick={() => setCreating(true)}><Plus className="mr-1 h-4 w-4" /> New style</Button>} />
      <Toolbar search={search} onSearch={(v) => { setSearch(v); setPage(0); }} placeholder="Search style no, buyer, fabric…"
        filter={status} onFilter={(v) => { setStatus(v); setPage(0); }} options={STYLE_STATUS.map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }))} />
      <Card>
        {q.isLoading ? <LoadingRows /> : q.isError ? <ErrorState message={errMsg(q.error)} onRetry={() => q.refetch()} /> : rows.length === 0 ? (
          <EmptyState title={search || status !== "all" ? "No styles match" : "No styles yet"} hint="Create a style to build its colour-size matrix and BOM." />
        ) : (
          <>
            <ul>
              {pageRows.map((r) => (
                <li key={r.id} className="border-t first:border-t-0">
                  <Link to="/styles/$id" params={{ id: r.id }} className="group flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/40">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2"><span className="font-medium">{r.style_no}</span><StatusBadge status={r.status} /></div>
                      <div className="truncate text-xs text-muted-foreground">{r.buyers?.name} · {r.description} · {r.fabric_desc} {r.gsm ? `${r.gsm} GSM` : ""}</div>
                    </div>
                    <div className="hidden text-right text-xs text-muted-foreground sm:block">
                      <div className="font-medium text-foreground tabular-nums">{total(r.size_color_qty).toLocaleString()} pcs</div>
                      <div>{r.colors.length} colours · {r.sizes.length} sizes · {r.bom_items?.[0]?.count ?? 0} BOM lines</div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </li>
              ))}
            </ul>
            <Pager page={page} total={rows.length} onPage={setPage} />
          </>
        )}
      </Card>
      {creating && <NewStyleDialog onClose={() => setCreating(false)} />}
    </AppShell>
  );
}

function NewStyleDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const buyers = useBuyerOptions();
  const inquiries = useQuery({
    queryKey: ["inquiries", "options"],
    queryFn: async () => {
      const { data, error } = await supabase.from("inquiries").select("id,inquiry_no,buyer_id,product_type").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const [f, setF] = useState({ buyer_id: "", inquiry_id: "none", style_no: "", description: "", fabric_desc: "", gsm: "", colors: "", sizes: "S, M, L, XL" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const m = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from("styles").insert({
        buyer_id: f.buyer_id, inquiry_id: f.inquiry_id === "none" ? null : f.inquiry_id, style_no: f.style_no.trim(),
        description: f.description.trim() || null, fabric_desc: f.fabric_desc.trim() || null, gsm: f.gsm ? Number(f.gsm) : null,
        colors: splitList(f.colors), sizes: splitList(f.sizes),
      }).select("id").single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: (id) => { toast.success("Style created"); qc.invalidateQueries({ queryKey: ["styles"] }); onClose(); navigate({ to: "/styles/$id", params: { id } }); },
    onError: (e) => toast.error(errMsg(e)),
  });
  function submit(e: React.FormEvent) {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!f.buyer_id) er.buyer_id = "Choose a buyer";
    if (!f.style_no.trim()) er.style_no = "Required";
    if (!splitList(f.colors).length) er.colors = "Add at least one colour";
    if (!splitList(f.sizes).length) er.sizes = "Add at least one size";
    setErrors(er);
    if (!Object.keys(er).length) m.mutate();
  }
  const inp = (k: keyof typeof f, label: string, ph?: string, type = "text") => (
    <div className="space-y-1">
      <Label htmlFor={k}>{label}</Label>
      <Input id={k} type={type} value={f[k]} placeholder={ph} onChange={(e) => setF({ ...f, [k]: e.target.value })} aria-invalid={!!errors[k]} />
      {errors[k] && <p className="text-xs text-destructive">{errors[k]}</p>}
    </div>
  );
  const inqForBuyer = (inquiries.data ?? []).filter((i) => !f.buyer_id || i.buyer_id === f.buyer_id);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>New style</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Buyer *</Label>
            <Select value={f.buyer_id} onValueChange={(v) => setF({ ...f, buyer_id: v, inquiry_id: "none" })}>
              <SelectTrigger aria-invalid={!!errors.buyer_id}><SelectValue placeholder="Choose buyer" /></SelectTrigger>
              <SelectContent>{buyers.data?.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
            </Select>
            {errors.buyer_id && <p className="text-xs text-destructive">{errors.buyer_id}</p>}
          </div>
          <div className="space-y-1">
            <Label>From inquiry</Label>
            <Select value={f.inquiry_id} onValueChange={(v) => setF({ ...f, inquiry_id: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="none">None</SelectItem>{inqForBuyer.map((i) => <SelectItem key={i.id} value={i.id}>{i.inquiry_no} · {i.product_type}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {inp("style_no", "Style no *", "HM-TS-2207")}
          {inp("description", "Description", "Men's crew-neck tee")}
          {inp("fabric_desc", "Fabric", "100% Cotton S/J")}
          {inp("gsm", "GSM", "160", "number")}
          <div className="sm:col-span-2">{inp("colors", "Colours * (comma separated)", "White, Black, Navy")}</div>
          <div className="sm:col-span-2">{inp("sizes", "Sizes * (comma separated)", "S, M, L, XL")}</div>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={m.isPending}>{m.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Create</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
