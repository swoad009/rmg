CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  country text NOT NULL DEFAULT 'Bangladesh',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, user_id)
);
GRANT SELECT ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
GRANT SELECT ON public.organization_members TO authenticated;
GRANT ALL ON public.organization_members TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_org_member(_org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members WHERE org_id = _org AND user_id = auth.uid())
$$;
CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT org_id FROM public.organization_members WHERE user_id = auth.uid() ORDER BY created_at LIMIT 1
$$;

CREATE POLICY "members read org" ON public.organizations FOR SELECT TO authenticated USING (public.is_org_member(id));
CREATE POLICY "owners update org" ON public.organizations FOR UPDATE TO authenticated
  USING (public.is_org_member(id) AND public.has_role(auth.uid(),'owner')) WITH CHECK (public.is_org_member(id));
CREATE POLICY "read own org members" ON public.organization_members FOR SELECT TO authenticated USING (public.is_org_member(org_id));

-- default organization + backfill existing users
INSERT INTO public.organizations (id, name) VALUES ('00000000-0000-0000-0000-000000000001', 'My Factory');
INSERT INTO public.organization_members (org_id, user_id)
  SELECT '00000000-0000-0000-0000-000000000001', id FROM public.profiles;

-- org_id on every business table
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['buyers','orders','fabric_rolls','bundles','production_entries','qc_inspections','lc_documents','activity_log'] LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN org_id uuid REFERENCES public.organizations(id) DEFAULT public.current_org_id()', t);
    EXECUTE format('UPDATE public.%I SET org_id = %L WHERE org_id IS NULL', t, '00000000-0000-0000-0000-000000000001');
    EXECUTE format('CREATE INDEX ON public.%I (org_id)', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'authenticated read ' || t, t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.is_org_member(org_id))', 'org read ' || t, t);
  END LOOP;
END $$;

-- tighten write policies to own org
DROP POLICY "merch write buyers" ON public.buyers;
CREATE POLICY "merch write buyers" ON public.buyers FOR ALL TO authenticated
  USING (public.is_org_member(org_id) AND (has_role(auth.uid(),'owner') OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'merchandiser')))
  WITH CHECK (public.is_org_member(org_id) AND (has_role(auth.uid(),'owner') OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'merchandiser')));
DROP POLICY "merch write orders" ON public.orders;
CREATE POLICY "merch write orders" ON public.orders FOR ALL TO authenticated
  USING (public.is_org_member(org_id) AND (has_role(auth.uid(),'owner') OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'merchandiser')))
  WITH CHECK (public.is_org_member(org_id) AND (has_role(auth.uid(),'owner') OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'merchandiser')));
DROP POLICY "store write fabric_rolls" ON public.fabric_rolls;
CREATE POLICY "store write fabric_rolls" ON public.fabric_rolls FOR ALL TO authenticated
  USING (public.is_org_member(org_id) AND (has_role(auth.uid(),'owner') OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'store_officer')))
  WITH CHECK (public.is_org_member(org_id) AND (has_role(auth.uid(),'owner') OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'store_officer')));
DROP POLICY "store write bundles" ON public.bundles;
CREATE POLICY "store write bundles" ON public.bundles FOR ALL TO authenticated
  USING (public.is_org_member(org_id) AND (has_role(auth.uid(),'owner') OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'store_officer') OR has_role(auth.uid(),'production_supervisor')))
  WITH CHECK (public.is_org_member(org_id) AND (has_role(auth.uid(),'owner') OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'store_officer') OR has_role(auth.uid(),'production_supervisor')));
DROP POLICY "prod write production_entries" ON public.production_entries;
CREATE POLICY "prod write production_entries" ON public.production_entries FOR ALL TO authenticated
  USING (public.is_org_member(org_id) AND (has_role(auth.uid(),'owner') OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'production_supervisor')))
  WITH CHECK (public.is_org_member(org_id) AND (has_role(auth.uid(),'owner') OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'production_supervisor')));
DROP POLICY "qc write qc_inspections" ON public.qc_inspections;
CREATE POLICY "qc write qc_inspections" ON public.qc_inspections FOR ALL TO authenticated
  USING (public.is_org_member(org_id) AND (has_role(auth.uid(),'owner') OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'qc_officer')))
  WITH CHECK (public.is_org_member(org_id) AND (has_role(auth.uid(),'owner') OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'qc_officer')));
DROP POLICY "commercial write lc_documents" ON public.lc_documents;
CREATE POLICY "commercial write lc_documents" ON public.lc_documents FOR ALL TO authenticated
  USING (public.is_org_member(org_id) AND (has_role(auth.uid(),'owner') OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'commercial_officer')))
  WITH CHECK (public.is_org_member(org_id) AND (has_role(auth.uid(),'owner') OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'commercial_officer')));
DROP POLICY "authenticated insert activity_log" ON public.activity_log;
CREATE POLICY "org insert activity_log" ON public.activity_log FOR INSERT TO authenticated WITH CHECK (public.is_org_member(org_id));

-- new signups join the default organization
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE is_first boolean; default_org uuid;
BEGIN
  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles) INTO is_first;
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)), NEW.email);
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN is_first THEN 'owner'::public.app_role ELSE 'merchandiser'::public.app_role END);
  SELECT id INTO default_org FROM public.organizations ORDER BY created_at LIMIT 1;
  IF default_org IS NULL THEN
    INSERT INTO public.organizations (name) VALUES ('My Factory') RETURNING id INTO default_org;
  END IF;
  INSERT INTO public.organization_members (org_id, user_id) VALUES (default_org, NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;