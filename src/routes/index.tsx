import { createFileRoute, Link } from "@tanstack/react-router";
import { QrCode, Factory, ClipboardCheck, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SutoTrack — RMG factory operations software" },
      { name: "description", content: "QR inventory, production tracking, QC and AI LC checking for Bangladesh garment factories." },
      { property: "og:title", content: "SutoTrack — RMG factory operations software" },
      { property: "og:description", content: "QR inventory, production tracking, QC and AI LC checking for Bangladesh garment factories." },
    ],
  }),
  component: Index,
});

const features = [
  { icon: QrCode, t: "QR inventory", d: "Track every fabric roll, trim, bundle and carton." },
  { icon: Factory, t: "Production", d: "Live WIP by line, style and order." },
  { icon: ClipboardCheck, t: "QC", d: "Record defects and DHU from the floor." },
  { icon: FileText, t: "AI LC check", d: "Catch document mismatches before the bank does." },
];

function Index() {
  return (
    <div className="min-h-screen bg-brand text-primary-foreground">
      <div className="mx-auto flex max-w-5xl flex-col gap-12 px-6 py-10">
        <header className="flex items-center justify-between">
          <span className="font-display text-xl font-bold">SutoTrack</span>
          <Button asChild variant="secondary"><Link to="/auth">Sign in</Link></Button>
        </header>
        <section className="max-w-2xl space-y-5 pt-8">
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
            Run your garment factory from one screen.
          </h1>
          <p className="text-lg opacity-80">Replace Excel sheets, WhatsApp updates and paper records.</p>
          <Button asChild size="lg" className="h-12 bg-accent px-8 text-accent-foreground hover:bg-accent/90">
            <Link to="/auth">Get started</Link>
          </Button>
        </section>
        <section className="grid gap-4 sm:grid-cols-2">
          {features.map((f) => (
            <div key={f.t} className="rounded-xl bg-primary-foreground/10 p-5">
              <f.icon className="h-6 w-6 text-accent" />
              <h3 className="mt-3 font-semibold">{f.t}</h3>
              <p className="text-sm opacity-75">{f.d}</p>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
