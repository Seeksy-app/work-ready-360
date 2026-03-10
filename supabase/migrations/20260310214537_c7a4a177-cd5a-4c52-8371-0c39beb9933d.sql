
-- Update admin policies on other tables to use is_admin function for consistency

DROP POLICY IF EXISTS "Admins can view all block responses" ON public.wip_block_responses;
CREATE POLICY "Admins can view all block responses" ON public.wip_block_responses
FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can view all scale scores" ON public.wip_scale_scores;
CREATE POLICY "Admins can view all scale scores" ON public.wip_scale_scores
FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can view all wip sessions" ON public.wip_sessions;
CREATE POLICY "Admins can view all wip sessions" ON public.wip_sessions
FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can view all item scores" ON public.wip_item_scores;
CREATE POLICY "Admins can view all item scores" ON public.wip_item_scores
FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can view all importance responses" ON public.wip_importance_responses;
CREATE POLICY "Admins can view all importance responses" ON public.wip_importance_responses
FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
