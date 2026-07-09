
REVOKE EXECUTE ON FUNCTION public.handle_new_user_role() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;

DROP POLICY IF EXISTS "requests_public_insert" ON public.requests;
CREATE POLICY "requests_public_insert" ON public.requests FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(national_id) BETWEEN 8 AND 15
    AND length(phone) BETWEEN 8 AND 20
    AND age_years BETWEEN 0 AND 120
  );
