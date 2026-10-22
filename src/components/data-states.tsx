import { AlertTriangle, ChevronLeft, ChevronRight, Inbox, Search } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-bold">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Toolbar({
  search,
  onSearch,
  placeholder,
  filter,
  onFilter,
  options,
}: {
  search: string;
  onSearch: (v: string) => void;
  placeholder: string;
  filter?: string;
  onFilter?: (v: string) => void;
  options?: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => onSearch(e.target.value)} placeholder={placeholder} className="pl-9" />
      </div>
      {options && onFilter && (
        <Select value={filter ?? "all"} onValueChange={onFilter}>
          <SelectTrigger className="sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

export function LoadingRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="animate-in fade-in flex flex-col items-center gap-2 px-4 py-14 text-center duration-300">
      <Inbox className="h-10 w-10 text-muted-foreground/60" />
      <div className="font-semibold">{title}</div>
      {hint && <p className="max-w-sm text-sm text-muted-foreground">{hint}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="animate-in fade-in flex flex-col items-center gap-2 px-4 py-14 text-center duration-300">
      <AlertTriangle className="h-10 w-10 text-destructive" />
      <div className="font-semibold">Couldn't load this list</div>
      <p className="max-w-sm text-sm text-muted-foreground">{message ?? "Please check your connection and try again."}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export const PAGE_SIZE = 10;

export function Pager({ page, total, onPage }: { page: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (total === 0) return null;
  return (
    <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
      <span>
        {page * PAGE_SIZE + 1}–{Math.min(total, (page + 1) * PAGE_SIZE)} of {total}
      </span>
      <div className="flex gap-1">
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 0} onClick={() => onPage(page - 1)} aria-label="Previous page">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= pages - 1} onClick={() => onPage(page + 1)} aria-label="Next page">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

const STATUS_TONE: Record<string, string> = {
  active: "bg-success/15 text-success",
  approved: "bg-success/15 text-success",
  won: "bg-success/15 text-success",
  quoted: "bg-primary/15 text-primary",
  submitted: "bg-primary/15 text-primary",
  sampling: "bg-primary/15 text-primary",
  costing: "bg-warning/25 text-warning-foreground",
  development: "bg-warning/25 text-warning-foreground",
  new: "bg-accent text-accent-foreground",
  draft: "bg-muted text-muted-foreground",
  inactive: "bg-muted text-muted-foreground",
  lost: "bg-destructive/15 text-destructive",
  rejected: "bg-destructive/15 text-destructive",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize", STATUS_TONE[status] ?? "bg-muted text-muted-foreground")}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("overflow-hidden rounded-xl border bg-card shadow-card", className)}>{children}</div>;
}

export function errMsg(e: unknown) {
  return e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : "Something went wrong";
}
