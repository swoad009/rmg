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
import { canWriteMerch } from "@/lib/roles";
import { useMe } from "@/lib/use-me";

export const Route = createFileRoute("/_authenticated/buyers")({
  head: () => ({ meta: [{ title: "Buyers — SutoTrack RMG" }, { name: "description", content: "Manage buyers and brands." }] }),
  component: BuyersPage,
});

type Buyer = Tables<"buyers">;
const empty = { name: "", code: "", brand: "", country: "", contact_person: "", contact_email: "", phone: "", address: "", payment_terms: "", currency: "USD", status: "active" };

function BuyersPage() {
  const { data: me } = useMe();
  const canWrite = canWriteMerch(me?.roles ?? []);
  const q = useQuery({
    queryKey: ["buyers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("buyers").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<Partial<Buyer> | null>(null);

  const rows = useMemo(() => {
    const s = search.toLowerCase();
    return (q.data ?? []).filter(
      (b) => (status === "all" || b.status === status) && [b.name, b.code, b.brand, b.country, b.contact_person].some((v) => v?.toLowerCase().includes(s)),
    );
  }, [q.data, search, status]);
  const pageRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <AppShell>
      <PageHeader
        title="Buyers"
        subtitle="Brands and retailers you work with"
        action={canWrite && <Button onClick={() => setEditing({})}><Plus className="mr-1 h-4 w-4" /> New buyer</Button>}
      />
      <Toolbar
        search={search}
        onSearch={(v) => { setSearch(v); setPage(0); }}
        placeholder="Search name, code, country…"
        filter={status}
        onFilter={(v) => { setStatus(v); setPage(0); }}
        options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]}
      />
      <Card>
        {q.isLoading ? <LoadingRows /> : q.isError ? <ErrorState message={errMsg(q.error)} onRetry={() => q.refetch()} /> : rows.length === 0 ? (
          <EmptyState title={search || status !== "all" ? "No buyers match" : "No buyers yet"} hint="Add your first buyer to start taking inquiries." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                  <tr><th className="px-4 py-2.5">Buyer</th><th className="px-4 py-2.5">Country</th><th className="hidden px-4 py-2.5 md:table-cell">Contact</th><th className="hidden px-4 py-2.5 md:table-cell">Terms</th><th className="px-4 py-2.5">Status</th><th /></tr>
                </thead>
                <tbody>
                  {pageRows.map((b) => (
                    <tr key={b.id} className="border-t transition-colors hover:bg-muted/40">
                      <td className="px-4 py-2.5"><div className="font-medium">{b.name}</div><div className="text-xs text-muted-foreground">{b.code} {b.brand && `· ${b.brand}`}</div></td>
                      <td className="px-4 py-2.5">{b.country}</td>
                      <td className="hidden px-4 py-2.5 md:table-cell"><div>{b.contact_person ?? "—"}</div><div className="text-xs text-muted-foreground">{b.contact_email}</div></td>
                      <td className="hidden px-4 py-2.5 md:table-cell">{b.payment_terms ?? "—"} <span className="text-xs text-muted-foreground">({b.currency})</span></td>
                      <td className="px-4 py-2.5"><StatusBadge status={b.status} /></td>
                      <td className="px-2 text-right">{canWrite && <Button variant="ghost" size="icon" onClick={() => setEditing(b)} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager page={page} total={rows.length} onPage={setPage} />
          </>
        )}
      </Card>
      {editing && <BuyerDialog buyer={editing} onClose={() => setEditing(null)} />}
    </AppShell>
  );
}

function BuyerDialog({ buyer, onClose }: { buyer: Partial<Buyer>; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ ...empty, ...Object.fromEntries(Object.entries(buyer).map(([k, v]) => [k, v ?? ""])) } as typeof empty & { id?: string });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const m = useMutation({
    mutationFn: async () => {
      const payload = {
        name: f.name.trim(), code: f.code.trim() || null, brand: f.brand.trim() || null, country: f.country.trim(),
        contact_person: f.contact_person.trim() || null, contact_email: f.contact_email.trim() || null, phone: f.phone.trim() || null,
        address: f.address.trim() || null, payment_terms: f.payment_terms.trim() || null, currency: f.currency, status: f.status,
      };
      const { error } = f.id ? await supabase.from("buyers").update(payload).eq("id", f.id) : await supabase.from("buyers").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { toast.success(f.id ? "Buyer updated" : "Buyer added"); qc.invalidateQueries({ queryKey: ["buyers"] }); onClose(); },
    onError: (e) => toast.error(errMsg(e)),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!f.name.trim()) er.name = "Buyer name is required";
    if (!f.country.trim()) er.country = "Country is required";
    if (f.contact_email && !/^\S+@\S+\.\S+$/.test(f.contact_email)) er.contact_email = "Enter a valid email";
    setErrors(er);
    if (!Object.keys(er).length) m.mutate();
  }

  const field = (k: keyof typeof empty, label: string, ph?: string) => (
    <div className="space-y-1">
      <Label htmlFor={k}>{label}</Label>
      <Input id={k} value={f[k]} onChange={set(k)} placeholder={ph} aria-invalid={!!errors[k]} />
      {errors[k] && <p className="text-xs text-destructive">{errors[k]}</p>}
    </div>
  );

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>{f.id ? "Edit buyer" : "New buyer"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          {field("name", "Buyer name *", "H&M Hennes & Mauritz")}
          {field("code", "Code", "HM")}
          {field("brand", "Brand")}
          {field("country", "Country *", "Sweden")}
          {field("contact_person", "Contact person")}
          {field("contact_email", "Email")}
          {field("phone", "Phone")}
          {field("payment_terms", "Payment terms", "LC at sight")}
          <div className="space-y-1">
            <Label>Currency</Label>
            <Select value={f.currency} onValueChange={(v) => setF({ ...f, currency: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["USD", "EUR", "GBP", "BDT"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Status</Label>
            <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">{field("address", "Address")}</div>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={m.isPending}>{m.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
