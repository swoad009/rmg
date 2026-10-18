ALTER TABLE public.buyers
  ADD COLUMN code text,
  ADD COLUMN brand text,
  ADD COLUMN contact_person text,
  ADD COLUMN phone text,
  ADD COLUMN address text,
  ADD COLUMN payment_terms text,
  ADD COLUMN currency text NOT NULL DEFAULT 'USD',
  ADD COLUMN status text NOT NULL DEFAULT 'active';

CREATE OR REPLACE FUNCTION public.is_merch_writer()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT has_role(auth.uid(),'owner') OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'merchandiser')
$$;

CREATE TABLE public.inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.organizations(id) DEFAULT public.current_org_id(),
  buyer_id uuid NOT NULL REFERENCES public.buyers(id),
  inquiry_no text NOT NULL,
  style_ref text,
  product_type text NOT NULL,
  target_qty integer NOT NULL DEFAULT 0,
  target_price numeric,
  currency text NOT NULL DEFAULT 'USD',
  target_ship_date date,
  status text NOT NULL DEFAULT 'new',
  merchandiser_id uuid DEFAULT auth.uid(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.styles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.organizations(id) DEFAULT public.current_org_id(),
  buyer_id uuid NOT NULL REFERENCES public.buyers(id),
  inquiry_id uuid REFERENCES public.inquiries(id),
  style_no text NOT NULL,
  description text,
  product_type text,
  fabric_desc text,
  gsm integer,
  colors text[] NOT NULL DEFAULT '{}',
  sizes text[] NOT NULL DEFAULT '{}',
  size_color_qty jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'development',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.bom_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.organizations(id) DEFAULT public.current_org_id(),
  style_id uuid NOT NULL REFERENCES public.styles(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'fabric',
  item_name text NOT NULL,
  description text,
  unit text NOT NULL DEFAULT 'pcs',
  consumption_per_pc numeric NOT NULL DEFAULT 0,
  wastage_pct numeric NOT NULL DEFAULT 0,
  unit_price numeric NOT NULL DEFAULT 0,
  supplier_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.costings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.organizations(id) DEFAULT public.current_org_id(),
  inquiry_id uuid REFERENCES public.inquiries(id),
  style_id uuid REFERENCES public.styles(id),
  costing_no text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  currency text NOT NULL DEFAULT 'USD',
  fabric_cost numeric NOT NULL DEFAULT 0,
  trims_cost numeric NOT NULL DEFAULT 0,
  cm_cost numeric NOT NULL DEFAULT 0,
  washing_cost numeric NOT NULL DEFAULT 0,
  other_cost numeric NOT NULL DEFAULT 0,
  commercial_pct numeric NOT NULL DEFAULT 0,
  profit_pct numeric NOT NULL DEFAULT 0,
  fob_price numeric GENERATED ALWAYS AS (
    round((fabric_cost+trims_cost+cm_cost+washing_cost+other_cost)*(1+commercial_pct/100)*(1+profit_pct/100), 3)
  ) STORED,
  status text NOT NULL DEFAULT 'draft',
  notes text,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['inquiries','styles','bom_items','costings'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE INDEX ON public.%I (org_id)', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.is_org_member(org_id))', 'org read '||t, t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_org_member(org_id) AND public.is_merch_writer()) WITH CHECK (public.is_org_member(org_id) AND public.is_merch_writer())', 'merch write '||t, t);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.guard_costing_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IN ('approved','rejected') AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    IF auth.uid() IS NOT NULL AND NOT (has_role(auth.uid(),'owner') OR has_role(auth.uid(),'admin')) THEN
      RAISE EXCEPTION 'Only an Owner or Admin can approve or reject a costing';
    END IF;
    NEW.approved_by := auth.uid();
    NEW.approved_at := now();
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER costings_approval BEFORE INSERT OR UPDATE ON public.costings
  FOR EACH ROW EXECUTE FUNCTION public.guard_costing_approval();

CREATE OR REPLACE FUNCTION public.audit_row()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb; act text;
BEGIN
  IF TG_OP = 'DELETE' THEN r := to_jsonb(OLD); act := 'deleted';
  ELSE r := to_jsonb(NEW); act := lower(TG_OP) || 'd'; END IF;
  IF TG_OP = 'UPDATE' AND TG_TABLE_NAME = 'costings' AND OLD.status IS DISTINCT FROM NEW.status THEN
    act := 'status_' || (r->>'status');
  END IF;
  INSERT INTO public.activity_log (user_id, action, entity_type, entity_id, details, org_id)
  VALUES (auth.uid(), act, TG_TABLE_NAME, (r->>'id')::uuid, r, (r->>'org_id')::uuid);
  RETURN NULL;
END $$;
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['buyers','inquiries','styles','bom_items','costings'] LOOP
    EXECUTE format('CREATE TRIGGER audit_%s AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.audit_row()', t, t);
  END LOOP;
END $$;