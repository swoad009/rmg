import type { Database } from "@/integrations/supabase/types";
import {
  LayoutDashboard,
  Package,
  QrCode,
  Factory,
  ClipboardCheck,
  FileText,
  BarChart3,
  Users,
  ShoppingBag,
  Building2,
  MessageSquareQuote,
  Shirt,
  Calculator,
  Scissors,
  type LucideIcon,
} from "lucide-react";

export type AppRole = Database["public"]["Enums"]["app_role"];

export const ROLE_LABELS: Record<AppRole, string> = {
  owner: "Owner / Director",
  admin: "Admin",
  merchandiser: "Merchandiser",
  store_officer: "Store Officer",
  production_supervisor: "Production Supervisor",
  qc_officer: "QC Officer",
  commercial_officer: "Accounts / Commercial",
};

export type NavItem = {
  key: string;
  label: string;
  icon: LucideIcon;
  roles: AppRole[] | "all";
  ready: boolean;
  to?: "/dashboard" | "/buyers" | "/inquiries" | "/styles" | "/costings" | "/samples";
};

const ALL: AppRole[] | "all" = "all";
const MERCH_READ: AppRole[] = ["owner", "admin", "merchandiser", "commercial_officer"];

// Modules listed in the product brief. `ready` flips on as each step ships.
export const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ALL, ready: true, to: "/dashboard" },
  { key: "buyers", label: "Buyers", icon: Building2, roles: MERCH_READ, ready: true, to: "/buyers" },
  { key: "inquiries", label: "Inquiries / RFQ", icon: MessageSquareQuote, roles: MERCH_READ, ready: true, to: "/inquiries" },
  { key: "styles", label: "Styles & BOM", icon: Shirt, roles: ["owner", "admin", "merchandiser", "commercial_officer", "store_officer", "production_supervisor", "qc_officer"], ready: true, to: "/styles" },
  { key: "costings", label: "Costing", icon: Calculator, roles: MERCH_READ, ready: true, to: "/costings" },
  { key: "samples", label: "Samples", icon: Scissors, roles: MERCH_READ, ready: true, to: "/samples" },
  { key: "orders", label: "Buyer PO", icon: ShoppingBag, roles: ["owner", "admin", "merchandiser"], ready: false },
  { key: "inventory", label: "Inventory", icon: Package, roles: ["owner", "admin", "store_officer", "merchandiser"], ready: false },
  { key: "scan", label: "QR Scan", icon: QrCode, roles: ["owner", "admin", "store_officer", "production_supervisor", "qc_officer"], ready: false },
  { key: "production", label: "Production", icon: Factory, roles: ["owner", "admin", "production_supervisor", "merchandiser"], ready: false },
  { key: "qc", label: "QC", icon: ClipboardCheck, roles: ["owner", "admin", "qc_officer", "production_supervisor"], ready: false },
  { key: "lc", label: "LC Documents", icon: FileText, roles: ["owner", "admin", "commercial_officer"], ready: false },
  { key: "reports", label: "Reports", icon: BarChart3, roles: ["owner", "admin", "merchandiser", "commercial_officer"], ready: false },
  { key: "users", label: "Users & Roles", icon: Users, roles: ["owner", "admin"], ready: false },
];

export function canSee(item: NavItem, roles: AppRole[]) {
  return item.roles === "all" || roles.some((r) => (item.roles as AppRole[]).includes(r));
}

/** Can create/edit buyers, inquiries, styles, BOM and costings (DB enforces the same). */
export function canWriteMerch(roles: AppRole[]) {
  return roles.some((r) => r === "owner" || r === "admin" || r === "merchandiser");
}

/** Can approve or reject costings (DB trigger enforces the same). */
export function canApprove(roles: AppRole[]) {
  return roles.some((r) => r === "owner" || r === "admin");
}
