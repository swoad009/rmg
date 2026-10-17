# Stage 1 Audit and Plan — RMG Operations App

## 1. What exists today (verified)

**Important correction:** QR Inventory, Production, AI LC Check and QC are **not built as screens yet**. They exist only as database tables with sample data, and as greyed-out "Soon" items in the menu. The dashboard cards (Completed / Pending / Delayed) show placeholders ("—"), not real order numbers.

Pages:
- `/` landing page
- `/auth` sign in, create account, Google, forgot password (animated, secure)
- `/reset-password`
- `/dashboard` (protected) with a sidebar that changes by role and an animated mobile menu

Navigation (menu items by role): Dashboard (ready), Orders & Buyers, Inventory, QR Scan, Production, QC, LC Documents, Reports, Users & Roles — all except Dashboard are "Soon".

Database tables: `profiles`, `user_roles`, `buyers`, `orders`, `fabric_rolls`, `bundles` (with unique QR codes), `production_entries`, `qc_inspections`, `lc_documents`, `activity_log`. All have access rules. Sample data: 4 buyers, 5 orders, 7 rolls, 9 bundles, 6 production entries, 3 QC checks, 3 LCs.

Roles: owner, admin, merchandiser, store_officer, production_supervisor, qc_officer, commercial_officer. The first user becomes owner. Later users become merchandiser.

Gaps against your project rules: there is no organization (multi-company) support yet, and the activity log is not written automatically.

## 2. What can be reused

- Login, roles and the menu work as they are.
- `buyers` gets extra fields added. Nothing is removed.
- `orders` becomes the **Buyer PO**. Rolls, bundles, production, QC and LC records already point to `orders`, so the later modules link up with no rework.
- `activity_log` becomes the audit trail.

## 3. Missing for Stage 1

Organizations; buyer details; Inquiry; Costing (with line items); Style and BOM; Sample tracking; Buyer PO fields (link to style, costing, sizes and colors); T&A (time and action) calendar; a dashboard that shows real numbers; plus pages for each, with search, filters, paging, and loading, empty and error states.

## 4. Stage 1 tables

```text
organizations(id, name, country, created_at)
organization_members(org_id, user_id, unique)        -- roles stay in user_roles

buyers  + org_id, code, brand, address, payment_terms, currency, status
inquiries(id, org_id, buyer_id, inquiry_no, style_ref, product_type,
          target_qty, target_price, target_ship_date, status
          [new|costing|quoted|won|lost], merchandiser_id, notes, created_at)
styles(id, org_id, buyer_id, inquiry_id?, style_no, description,
       fabric_desc, gsm, size_range, colors[], image_url, status)
bom_items(id, style_id, category [fabric|trim|accessory|packing],
          item_name, description, unit, consumption_per_pc,
          wastage_pct, unit_price, supplier_name)
costings(id, org_id, inquiry_id, style_id, version, currency,
         fabric_cost, trims_cost, cm_cost, washing_cost, commercial_pct,
         profit_pct, fob_price [computed], status
         [draft|submitted|approved|rejected], approved_by, approved_at)
samples(id, org_id, style_id, sample_type
        [proto|fit|size_set|pp|shipment], sent_date, courier_ref,
        buyer_comment, status [pending|sent|approved|rejected|resubmit])
orders (= Buyer PO) + org_id, style_id, costing_id, inquiry_id,
        ship_mode, destination, size_color_breakdown jsonb
tna_templates(id, org_id, name) + tna_template_tasks(task, offset_days, owner_role)
tna_tasks(id, order_id, task_name, planned_date, actual_date,
          owner_role, status [pending|done|late], remarks)
```

Links: Buyer → Inquiry → Costing and Style → BOM and Samples → Buyer PO (`orders`) → T&A tasks. Every main record carries `org_id`, and the access rules limit people to their own organization.

## 5. Roles and permissions

- Owner and Admin: full access, and approve costings.
- Merchandiser: create and edit buyers, inquiries, styles, BOM, costings (draft and submit), samples, POs and T&A.
- Commercial: read POs and costings, edit LC records.
- Store, Production, QC: read POs and styles, and mark their own T&A tasks done.
- Everyone signed in sees the dashboard, with numbers limited to what their role can see.

## 6. Linking Buyer POs to existing modules safely

Keep `orders` as the PO table. Only add new columns that are optional, so current rows and links stay valid. Inventory, Production, QC and LC already use `order_id`, so when those screens are built they pick up the PO data automatically. Nothing gets renamed or deleted.

## 7. Safe build order (one at a time, with your approval after each)

1. Organizations and members. Put all current data into a default organization and update the access rules.
2. Automatic audit log on create, update, delete and approve actions.
3. Buyers page (list and form).
4. Inquiries.
5. Styles and BOM.
6. Costing with approval.
7. Samples.
8. Buyer PO, upgrading `orders`, plus the PO page.
9. T&A templates and per-PO calendar.
10. Dashboard upgrade: real counts, upcoming deadlines, late T&A tasks.

Each step adds only and keeps the current smooth animation style. I'll check that the app still works before moving to the next step.

## Open questions

1. App name: should it be "SutoTrack" or "RMGFlow"?
2. Should one user be able to belong to more than one organization?
3. Do you want a fixed costing formula, or should I build an editable costing sheet?
4. Which T&A milestones does your factory use? Default suggestion: lab dip, fabric booking, PP sample, cutting, sewing, final inspection, ex-factory.
