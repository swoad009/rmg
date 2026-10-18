CREATE TYPE public.app_role AS ENUM ('owner','admin','merchandiser','store_officer','production_supervisor','qc_officer','commercial_officer');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE is_first boolean;
BEGIN
  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles) INTO is_first;
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)), NEW.email);
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN is_first THEN 'owner'::public.app_role ELSE 'merchandiser'::public.app_role END);
  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.buyers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  country text NOT NULL,
  contact_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.buyers TO authenticated;
GRANT ALL ON public.buyers TO service_role;
ALTER TABLE public.buyers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated read buyers" ON public.buyers FOR SELECT TO authenticated USING (true);
CREATE POLICY "merch write buyers" ON public.buyers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'merchandiser'))
  WITH CHECK (public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'merchandiser'));

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES public.buyers(id),
  po_number text NOT NULL,
  style text NOT NULL DEFAULT '',
  quantity integer NOT NULL DEFAULT 0,
  unit_price numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  order_date date NOT NULL DEFAULT now()::date,
  delivery_date date NOT NULL DEFAULT now()::date,
  description text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated read orders" ON public.orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "merch write orders" ON public.orders FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'merchandiser'))
  WITH CHECK (public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'merchandiser'));

CREATE TABLE public.fabric_rolls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roll_no text NOT NULL,
  fabric_type text NOT NULL,
  color text NOT NULL,
  weight_kg numeric NOT NULL DEFAULT 0,
  width_inch integer,
  gsm integer,
  order_id uuid REFERENCES public.orders(id),
  received_date date NOT NULL DEFAULT now()::date,
  status text NOT NULL DEFAULT 'received',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fabric_rolls TO authenticated;
GRANT ALL ON public.fabric_rolls TO service_role;
ALTER TABLE public.fabric_rolls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated read fabric_rolls" ON public.fabric_rolls FOR SELECT TO authenticated USING (true);
CREATE POLICY "store write fabric_rolls" ON public.fabric_rolls FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'store_officer'))
  WITH CHECK (public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'store_officer'));

CREATE TABLE public.bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id),
  bundle_no text NOT NULL,
  qr_code text NOT NULL UNIQUE,
  size text NOT NULL,
  color text NOT NULL,
  quantity integer NOT NULL DEFAULT 0,
  lay_no integer,
  status text NOT NULL DEFAULT 'cut',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bundles TO authenticated;
GRANT ALL ON public.bundles TO service_role;
ALTER TABLE public.bundles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated read bundles" ON public.bundles FOR SELECT TO authenticated USING (true);
CREATE POLICY "store write bundles" ON public.bundles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'store_officer') OR public.has_role(auth.uid(),'production_supervisor'))
  WITH CHECK (public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'store_officer') OR public.has_role(auth.uid(),'production_supervisor'));

CREATE TABLE public.production_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id),
  line_no text NOT NULL,
  operation text NOT NULL,
  quantity integer NOT NULL DEFAULT 0,
  entry_date date NOT NULL DEFAULT now()::date,
  operator_name text,
  bundle_id uuid REFERENCES public.bundles(id),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_entries TO authenticated;
GRANT ALL ON public.production_entries TO service_role;
ALTER TABLE public.production_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated read production_entries" ON public.production_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "prod write production_entries" ON public.production_entries FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'production_supervisor'))
  WITH CHECK (public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'production_supervisor'));

CREATE TABLE public.qc_inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id),
  bundle_id uuid REFERENCES public.bundles(id),
  stage text NOT NULL,
  inspection_date date NOT NULL DEFAULT now()::date,
  checked_qty integer NOT NULL DEFAULT 0,
  passed_qty integer NOT NULL DEFAULT 0,
  defect_qty integer,
  defects text[],
  inspector_name text,
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.qc_inspections TO authenticated;
GRANT ALL ON public.qc_inspections TO service_role;
ALTER TABLE public.qc_inspections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated read qc_inspections" ON public.qc_inspections FOR SELECT TO authenticated USING (true);
CREATE POLICY "qc write qc_inspections" ON public.qc_inspections FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'qc_officer'))
  WITH CHECK (public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'qc_officer'));

CREATE TABLE public.lc_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id),
  lc_number text NOT NULL,
  issuing_bank text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  issue_date date NOT NULL DEFAULT now()::date,
  expiry_date date NOT NULL DEFAULT now()::date,
  status text NOT NULL DEFAULT 'draft',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lc_documents TO authenticated;
GRANT ALL ON public.lc_documents TO service_role;
ALTER TABLE public.lc_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated read lc_documents" ON public.lc_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "commercial write lc_documents" ON public.lc_documents FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'commercial_officer'))
  WITH CHECK (public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'commercial_officer'));

CREATE TABLE public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.activity_log TO authenticated;
GRANT ALL ON public.activity_log TO service_role;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated read activity_log" ON public.activity_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated insert activity_log" ON public.activity_log FOR INSERT TO authenticated WITH CHECK (true);