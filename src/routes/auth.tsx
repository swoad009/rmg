import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — SutoTrack RMG" },
      { name: "description", content: "Sign in to SutoTrack, the RMG factory operations system." },
      { property: "og:title", content: "Sign in — SutoTrack RMG" },
      { property: "og:description", content: "Sign in to SutoTrack, the RMG factory operations system." },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard" });
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/auth", data: { full_name: name } },
        });
        if (error) throw error;
        toast.success("Account created. Open the confirmation link in your email, then sign in here.", { duration: 8000 });
        setMode("signin");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Password reset link sent to your email.");
        setMode("signin");
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setBusy(true);
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) {
      toast.error(r.error.message);
      setBusy(false);
      return;
    }
    if (r.redirected) return;
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden bg-brand p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="font-display text-2xl font-bold">SutoTrack</div>
        <div>
          <h2 className="text-4xl font-bold leading-tight">
            One system for fabric, production, QC and LC documents.
          </h2>
          <p className="mt-4 opacity-80">Built for garment factories and buying houses in Bangladesh.</p>
        </div>
        <div className="text-sm opacity-60">Replace Excel, WhatsApp and paper.</div>
      </div>

      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5">
          <div>
            <div className="mb-6 font-display text-2xl font-bold text-primary lg:hidden">SutoTrack</div>
            <h1 className="text-2xl font-bold">
              {mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Reset password"}
            </h1>
          </div>

          {mode === "signup" && (
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" className="h-12" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" className="h-12" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          {mode !== "forgot" && (
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" minLength={6} className="h-12" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
          )}

          <Button type="submit" className="h-12 w-full text-base" disabled={busy}>
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
          </Button>

          {mode !== "forgot" && (
            <Button type="button" variant="outline" className="h-12 w-full" onClick={google} disabled={busy}>
              Continue with Google
            </Button>
          )}

          <div className="flex justify-between text-sm">
            {mode === "signin" ? (
              <>
                <button type="button" className="text-primary" onClick={() => setMode("forgot")}>Forgot password?</button>
                <button type="button" className="text-primary" onClick={() => setMode("signup")}>Create account</button>
              </>
            ) : (
              <button type="button" className="text-primary" onClick={() => setMode("signin")}>Back to sign in</button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
