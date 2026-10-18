CREATE OR REPLACE FUNCTION public.audit_row()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb; o jsonb; act text;
BEGIN
  IF TG_OP = 'DELETE' THEN r := to_jsonb(OLD); act := 'deleted';
  ELSE r := to_jsonb(NEW); act := lower(TG_OP) || 'd'; END IF;
  IF TG_OP = 'UPDATE' THEN
    o := to_jsonb(OLD);
    IF (o->>'status') IS DISTINCT FROM (r->>'status') THEN act := 'status_' || (r->>'status'); END IF;
  END IF;
  INSERT INTO public.activity_log (user_id, action, entity_type, entity_id, details, org_id)
  VALUES (auth.uid(), act, TG_TABLE_NAME, (r->>'id')::uuid, r, (r->>'org_id')::uuid);
  RETURN NULL;
END $$;