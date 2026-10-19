import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, MailCheck, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

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

type Mode = "signin" | "signup" | "forgot" | "sent";
const RESET_COOLDOWN = 60;

function passwordStrength(p: string) {
  let s = 0;
  if (p.length >= 8) s++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return s;
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.66 4.1-5.5 4.1-3.3 0-6-2.74-6-6.1s2.7-6.1 6-6.1c1.88 0 3.14.8 3.86 1.49l2.63-2.54C16.8 3.4 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.54 0 9.2-3.9 9.2-9.38 0-.63-.07-1.11-.16-1.6H12z" />
    </svg>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState<"form" | "google" | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const strength = passwordStrength(password);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy("form");
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw new Error("Email or password is incorrect, or the email isn't confirmed yet.");
        toast.success("Welcome back");
        navigate({ to: "/dashboard" });
      } else if (mode === "signup") {
        if (strength < 2) throw new Error("Please choose a stronger password (8+ characters, mix letters and numbers).");
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin + "/auth", data: { full_name: name.trim() } },
        });
        if (error) throw error;
        setMode("sent");
      } else if (mode === "forgot") {
        if (cooldown > 0) return;
        // Always show the same message so nobody can check which emails have accounts.
        await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        setCooldown(RESET_COOLDOWN);
        setMode("sent");
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function google() {
    if (busy) return;
    setBusy("google");
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) {
      toast.error("Google sign-in didn't finish. Please try again.");
      setBusy(null);
      return;
    }
    if (r.redirected) return;
    navigate({ to: "/dashboard" });
  }

  function go(m: Mode) {
    setShow(false);
    setMode(m);
  }

  const title = { signin: "Welcome back", signup: "Create your account", forgot: "Reset your password", sent: "Check your email" }[mode];
  const subtitle = {
    signin: "Sign in to continue to your factory.",
    signup: "Set up access for your team in a minute.",
    forgot: "Enter your account email and we'll send a secure reset link.",
    sent: "",
  }[mode];

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-brand p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 animate-pulse rounded-full bg-primary-foreground/10 blur-3xl" />
        <div className="font-display text-2xl font-bold animate-in fade-in slide-in-from-left-4 duration-700">SutoTrack</div>
        <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
          <h2 className="text-4xl font-bold leading-tight">One system for fabric, production, QC and LC documents.</h2>
          <p className="mt-4 opacity-80">Built for garment factories and buying houses in Bangladesh.</p>
        </div>
        <div className="text-sm opacity-60">Replace Excel, WhatsApp and paper.</div>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 font-display text-2xl font-bold text-primary animate-in fade-in duration-500 lg:hidden">SutoTrack</div>

          <div key={mode} className="animate-in fade-in slide-in-from-bottom-3 duration-300 ease-out">
            {mode === "sent" ? (
              <div className="space-y-5 text-center">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary animate-in zoom-in-50 duration-500">
                  <MailCheck className="h-8 w-8" />
                </div>
                <h1 className="text-2xl font-bold">{title}</h1>
                <p className="text-sm text-muted-foreground">
                  If <span className="font-medium text-foreground">{email}</span> is valid, we've sent a link to it. Open it on this device to continue. The link expires soon, so use it quickly.
                </p>
                <Button className="h-12 w-full" onClick={() => go("signin")}>Back to sign in</Button>
                <button
                  type="button"
                  disabled={cooldown > 0}
                  onClick={() => go("forgot")}
                  className="text-sm text-primary transition-opacity disabled:opacity-50"
                >
                  {cooldown > 0 ? `Didn't get it? Resend in ${cooldown}s` : "Didn't get it? Send again"}
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-5">
                <div>
                  <h1 className="text-2xl font-bold">{title}</h1>
                  <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
                </div>

                {mode === "signup" && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <Label htmlFor="name">Full name</Label>
                    <Input id="name" autoComplete="name" className="h-12 transition-shadow focus-visible:shadow-md" value={name} onChange={(e) => setName(e.target.value)} required />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" autoComplete="email" className="h-12 transition-shadow focus-visible:shadow-md" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>

                {mode !== "forgot" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      {mode === "signin" && (
                        <button type="button" className="text-xs text-primary hover:underline" onClick={() => go("forgot")}>
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        type={show ? "text" : "password"}
                        autoComplete={mode === "signup" ? "new-password" : "current-password"}
                        minLength={mode === "signup" ? 8 : 6}
                        className="h-12 pr-12 transition-shadow focus-visible:shadow-md"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShow((s) => !s)}
                        aria-label={show ? "Hide password" : "Show password"}
                        className="absolute inset-y-0 right-0 grid w-12 place-items-center text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {mode === "signup" && password && (
                      <div className="space-y-1 animate-in fade-in duration-200">
                        <div className="flex gap-1">
                          {[0, 1, 2, 3].map((i) => (
                            <div
                              key={i}
                              className={cn(
                                "h-1.5 flex-1 rounded-full bg-muted transition-colors duration-300",
                                i < strength && (strength <= 1 ? "bg-destructive" : strength <= 2 ? "bg-warning" : "bg-success"),
                              )}
                            />
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {["Too weak", "Weak", "Okay", "Strong", "Very strong"][strength]}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <Button type="submit" className="h-12 w-full text-base transition-transform active:scale-[0.98]" disabled={!!busy || (mode === "forgot" && cooldown > 0)}>
                  {busy === "form" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : cooldown > 0 ? `Wait ${cooldown}s` : "Send reset link"}
                </Button>

                {mode !== "forgot" && (
                  <>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
                    </div>
                    <Button type="button" variant="outline" className="h-12 w-full gap-3 transition-all hover:shadow-md active:scale-[0.98]" onClick={google} disabled={!!busy}>
                      {busy === "google" ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
                      Continue with Google
                    </Button>
                  </>
                )}

                <p className="text-center text-sm text-muted-foreground">
                  {mode === "signin" ? (
                    <>New here? <button type="button" className="font-medium text-primary hover:underline" onClick={() => go("signup")}>Create an account</button></>
                  ) : mode === "signup" ? (
                    <>Already have an account? <button type="button" className="font-medium text-primary hover:underline" onClick={() => go("signin")}>Sign in</button></>
                  ) : (
                    <button type="button" className="font-medium text-primary hover:underline" onClick={() => go("signin")}>Back to sign in</button>
                  )}
                </p>

                {mode === "forgot" && (
                  <p className="flex items-start gap-2 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    For your security, we never say whether an email has an account. The reset link works once and expires.
                  </p>
                )}
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
