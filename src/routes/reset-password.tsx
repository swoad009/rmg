import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set new password — SutoTrack RMG" },
      { name: "description", content: "Choose a new password for your SutoTrack account." },
      { property: "og:title", content: "Set new password — SutoTrack RMG" },
      { property: "og:description", content: "Choose a new password for your SutoTrack account." },
    ],
  }),
  component: ResetPassword,
});

function strengthOf(p: string) {
  let s = 0;
  if (p.length >= 8) s++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return s;
}

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const strength = strengthOf(password);
  const mismatch = confirm.length > 0 && confirm !== password;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (strength < 2) { toast.error("Please choose a stronger password."); return; }
    if (password !== confirm) { toast.error("Passwords don't match."); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error("This reset link has expired or was already used. Please request a new one.");
      return;
    }
    toast.success("Password updated. You're signed in.");
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-300">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary animate-in zoom-in-50 duration-500">
          <KeyRound className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Set a new password</h1>
          <p className="mt-1 text-sm text-muted-foreground">Use at least 8 characters with letters and numbers.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="pw">New password</Label>
          <div className="relative">
            <Input id="pw" type={show ? "text" : "password"} autoComplete="new-password" minLength={8} className="h-12 pr-12" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} className="absolute inset-y-0 right-0 grid w-12 place-items-center text-muted-foreground hover:text-foreground">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {password && (
            <div className="flex gap-1 animate-in fade-in">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className={cn("h-1.5 flex-1 rounded-full bg-muted transition-colors duration-300", i < strength && (strength <= 1 ? "bg-destructive" : strength <= 2 ? "bg-warning" : "bg-success"))} />
              ))}
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="pw2">Confirm password</Label>
          <Input id="pw2" type={show ? "text" : "password"} autoComplete="new-password" className={cn("h-12", mismatch && "border-destructive")} value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          {mismatch && <p className="text-xs text-destructive animate-in fade-in">Passwords don't match.</p>}
        </div>
        <Button type="submit" className="h-12 w-full transition-transform active:scale-[0.98]" disabled={busy}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Update password
        </Button>
      </form>
    </div>
  );
}
