/*
# Samples table + realistic Bangladeshi RMG seed data

1. New table: samples (sample submissions linked to styles)
2. RLS: org member read; merchandiser write; audit trigger
3. Seed data: adds inquiry/style/bom/costing/samples rows
*/

CREATE TABLE IF NOT EXISTS public.samples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.organizations(id) DEFAULT public.current_org_id(),
  style_id uuid NOT NULL REFERENCES public.styles(id) ON DELETE CASCADE,
  sample_type text NOT NULL DEFAULT 'proto',
  sent_date date,
  courier_ref text,
  buyer_comment text,
  status text NOT NULL DEFAULT 'pending',
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.samples ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS samples_org_id_idx ON public.samples (org_id);
CREATE INDEX IF NOT EXISTS samples_style_id_idx ON public.samples (style_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.samples TO authenticated;
GRANT ALL ON public.samples TO service_role;

DROP POLICY IF EXISTS "org read samples" ON public.samples;
CREATE POLICY "org read samples" ON public.samples FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));

DROP POLICY IF EXISTS "merch write samples" ON public.samples;
CREATE POLICY "merch write samples" ON public.samples FOR ALL TO authenticated
  USING (public.is_org_member(org_id) AND public.is_merch_writer())
  WITH CHECK (public.is_org_member(org_id) AND public.is_merch_writer());

DROP TRIGGER IF EXISTS audit_samples ON public.samples;
CREATE TRIGGER audit_samples AFTER INSERT OR UPDATE OR DELETE ON public.samples
  FOR EACH ROW EXECUTE FUNCTION public.audit_row();

DO $$
DECLARE
  default_org uuid := '00000000-0000-0000-0000-000000000001';
  hm_id uuid; zara_id uuid; tesco_id uuid;
  inq1 uuid; inq2 uuid; inq3 uuid;
  st1 uuid; st2 uuid; st3 uuid;
BEGIN
  SELECT id INTO hm_id FROM public.buyers WHERE name LIKE 'H&M%' ORDER BY created_at LIMIT 1;
  SELECT id INTO zara_id FROM public.buyers WHERE name LIKE 'Zara%' ORDER BY created_at LIMIT 1;
  SELECT id INTO tesco_id FROM public.buyers WHERE name LIKE 'Tesco%' ORDER BY created_at LIMIT 1;
  IF hm_id IS NULL THEN
    INSERT INTO public.buyers (org_id, name, code, brand, country, contact_person, contact_email, phone, payment_terms, currency, status)
    VALUES (default_org, 'H&M Hennes & Mauritz', 'HM', 'H&M', 'Sweden', 'Karl Jensen', 'karl.jensen@hm.com', '+46 8 555 100', 'LC at sight', 'USD', 'active') RETURNING id INTO hm_id;
  END IF;
  IF zara_id IS NULL THEN
    INSERT INTO public.buyers (org_id, name, code, brand, country, contact_person, contact_email, phone, payment_terms, currency, status)
    VALUES (default_org, 'Inditex / Zara', 'ZARA', 'Zara', 'Spain', 'Maria Lopez', 'maria.lopez@inditex.com', '+34 981 185 000', '30 days', 'EUR', 'active') RETURNING id INTO zara_id;
  END IF;
  IF tesco_id IS NULL THEN
    INSERT INTO public.buyers (org_id, name, code, brand, country, contact_person, contact_email, phone, payment_terms, currency, status)
    VALUES (default_org, 'Tesco Stores', 'TESCO', 'F&F', 'United Kingdom', 'David Smith', 'david.smith@tesco.co.uk', '+44 1992 632 222', 'LC at sight', 'GBP', 'active') RETURNING id INTO tesco_id;
  END IF;

  SELECT id INTO inq1 FROM public.inquiries WHERE inquiry_no = 'INQ-2026-001' LIMIT 1;
  SELECT id INTO inq2 FROM public.inquiries WHERE inquiry_no = 'INQ-2026-002' LIMIT 1;
  SELECT id INTO inq3 FROM public.inquiries WHERE inquiry_no = 'INQ-2026-003' LIMIT 1;
  IF inq1 IS NULL THEN
    INSERT INTO public.inquiries (org_id, buyer_id, inquiry_no, style_ref, product_type, target_qty, target_price, currency, target_ship_date, status, notes)
    VALUES (default_org, hm_id, 'INQ-2026-001', 'ST-9001', 'T-Shirt (Knit)', 50000, 3.20, 'USD', '2026-12-15', 'costing', 'SS26 basic tee, 180 GSM, reactive dye') RETURNING id INTO inq1;
  END IF;
  IF inq2 IS NULL THEN
    INSERT INTO public.inquiries (org_id, buyer_id, inquiry_no, style_ref, product_type, target_qty, target_price, currency, target_ship_date, status, notes)
    VALUES (default_org, zara_id, 'INQ-2026-002', 'ST-9002', 'Denim Pant', 20000, 9.80, 'EUR', '2027-01-20', 'quoted', 'Slim fit 11oz stretch denim, 3 washes') RETURNING id INTO inq2;
  END IF;
  IF inq3 IS NULL THEN
    INSERT INTO public.inquiries (org_id, buyer_id, inquiry_no, style_ref, product_type, target_qty, target_price, currency, target_ship_date, status, notes)
    VALUES (default_org, tesco_id, 'INQ-2026-003', 'ST-9003', 'Polo Shirt', 30000, 4.50, 'GBP', '2026-11-30', 'new', 'Mens pique polo, 3 colour options') RETURNING id INTO inq3;
  END IF;

  SELECT id INTO st1 FROM public.styles WHERE style_no = 'ST-9001' LIMIT 1;
  SELECT id INTO st2 FROM public.styles WHERE style_no = 'ST-9002' LIMIT 1;
  SELECT id INTO st3 FROM public.styles WHERE style_no = 'ST-9003' LIMIT 1;
  IF st1 IS NULL THEN
    INSERT INTO public.styles (org_id, buyer_id, inquiry_id, style_no, description, product_type, fabric_desc, gsm, colors, sizes, size_color_qty, status)
    VALUES (default_org, hm_id, inq1, 'ST-9001', 'Mens basic crew tee', 'T-Shirt (Knit)', 'Single jersey cotton', 180, ARRAY['White','Black','Navy'], ARRAY['S','M','L','XL'], '{"S":12000,"M":15000,"L":15000,"XL":8000}', 'approved') RETURNING id INTO st1;
  END IF;
  IF st2 IS NULL THEN
    INSERT INTO public.styles (org_id, buyer_id, inquiry_id, style_no, description, product_type, fabric_desc, gsm, colors, sizes, size_color_qty, status)
    VALUES (default_org, zara_id, inq2, 'ST-9002', 'Womens slim fit denim pant', 'Denim Pant', '11oz stretch denim', 330, ARRAY['Mid Blue','Dark Blue','Black'], ARRAY['28','30','32','34'], '{"28":4000,"30":6000,"32":6000,"34":4000}', 'sampling') RETURNING id INTO st2;
  END IF;
  IF st3 IS NULL THEN
    INSERT INTO public.styles (org_id, buyer_id, inquiry_id, style_no, description, product_type, fabric_desc, gsm, colors, sizes, size_color_qty, status)
    VALUES (default_org, tesco_id, inq3, 'ST-9003', 'Mens pique polo shirt', 'Polo Shirt', 'Cotton pique', 220, ARRAY['White','Navy','Green'], ARRAY['S','M','L','XL'], '{"S":7000,"M":9000,"L":9000,"XL":5000}', 'development') RETURNING id INTO st3;
  END IF;

  IF (SELECT count(*) FROM public.bom_items WHERE style_id = st1) = 0 AND st1 IS NOT NULL THEN
    INSERT INTO public.bom_items (org_id, style_id, category, item_name, description, unit, consumption_per_pc, wastage_pct, unit_price, supplier_name)
    VALUES
      (default_org, st1, 'fabric',    'Single jersey 180gsm',  '100% combed cotton',   'kg',  0.18, 5, 4.20, 'Square Fashions Ltd'),
      (default_org, st1, 'trim',      'Collar rib',            '1x1 rib cotton',       'm',   0.15, 3, 0.30, 'Nylon Zipper Co'),
      (default_org, st1, 'trim',      'Sewing thread',         'Polyester 40/2',       'cone',0.001,2, 1.10, 'Coats Bangladesh'),
      (default_org, st1, 'accessory', 'Main label',            'Woven brand label',    'pcs', 1.00, 1, 0.05, 'Avery Dennison BD'),
      (default_org, st1, 'accessory', 'Care label',            'Printed satin',        'pcs', 1.00, 1, 0.03, 'Avery Dennison BD'),
      (default_org, st1, 'packing',   'Poly bag',              '12x16 PP self-seal',   'pcs', 1.00, 2, 0.02, 'Local supplier'),
      (default_org, st1, 'packing',   'Carton',                '7-ply corrugated',     'pcs', 0.02, 1, 0.40, 'Packaging BD');
  END IF;

  IF (SELECT count(*) FROM public.bom_items WHERE style_id = st2) = 0 AND st2 IS NOT NULL THEN
    INSERT INTO public.bom_items (org_id, style_id, category, item_name, description, unit, consumption_per_pc, wastage_pct, unit_price, supplier_name)
    VALUES
      (default_org, st2, 'fabric',    '11oz stretch denim',    '98% cotton 2% elastane','m',   1.45, 6, 3.10, 'Square Denim Ltd'),
      (default_org, st2, 'trim',      'Zipper',                'YKK brass 4.5 inch',   'pcs', 1.00, 1, 0.22, 'YKK Bangladesh'),
      (default_org, st2, 'trim',      'Button',                'Metal rivet 17mm',     'pcs', 6.00, 1, 0.10, 'Local supplier'),
      (default_org, st2, 'accessory', 'Main label',            'Leather patch',        'pcs', 1.00, 1, 0.12, 'Avery Dennison BD'),
      (default_org, st2, 'packing',   'Poly bag',              '14x20 PP',             'pcs', 1.00, 2, 0.03, 'Local supplier');
  END IF;

  IF (SELECT count(*) FROM public.costings WHERE costing_no = 'CST-2026-001') = 0 AND inq1 IS NOT NULL THEN
    INSERT INTO public.costings (org_id, inquiry_id, style_id, costing_no, version, currency, fabric_cost, trims_cost, cm_cost, washing_cost, other_cost, commercial_pct, profit_pct, status, notes)
    VALUES (default_org, inq1, st1, 'CST-2026-001', 1, 'USD', 0.76, 0.41, 0.85, 0.00, 0.10, 3, 12, 'draft', 'Initial draft — awaiting merchandiser submit');
  END IF;
  IF (SELECT count(*) FROM public.costings WHERE costing_no = 'CST-2026-002') = 0 AND inq2 IS NOT NULL THEN
    INSERT INTO public.costings (org_id, inquiry_id, style_id, costing_no, version, currency, fabric_cost, trims_cost, cm_cost, washing_cost, other_cost, commercial_pct, profit_pct, status, notes)
    VALUES (default_org, inq2, st2, 'CST-2026-002', 1, 'EUR', 4.50, 0.55, 3.20, 0.80, 0.25, 4, 15, 'approved', 'Approved by owner — FOB within buyer target');
  END IF;

  IF (SELECT count(*) FROM public.samples) = 0 AND st1 IS NOT NULL THEN
    INSERT INTO public.samples (org_id, style_id, sample_type, sent_date, courier_ref, buyer_comment, status, remarks)
    VALUES
      (default_org, st1, 'proto', '2026-10-01', 'DHL-884521', 'Fit good, adjust sleeve length -1cm', 'approved', 'Proto approved; proceed to fit sample'),
      (default_org, st1, 'fit',   '2026-10-10', 'DHL-884977', NULL, 'sent', 'Awaiting buyer feedback'),
      (default_org, st2, 'proto', '2026-10-05', 'FEDEX-22014', 'Wash shade too light on mid blue', 'resubmit', 'Need darker wash, resubmit proto'),
      (default_org, st3, 'proto', NULL,          NULL,          NULL, 'pending', 'Proto in cutting, not yet sent');
  END IF;
END $$;