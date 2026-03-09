
-- WIP Assessment Sessions
CREATE TABLE public.wip_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'in_progress',
  consistency_score float,
  consistency_flag boolean DEFAULT false,
  zero_point_raw_votes integer,
  zero_point_z float,
  top_scale_1 text,
  top_scale_2 text,
  result_payload jsonb
);

ALTER TABLE public.wip_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own wip sessions"
  ON public.wip_sessions FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow admins to read all sessions (for admin dashboard)
CREATE POLICY "Admins can view all wip sessions"
  ON public.wip_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- WIP Block Responses (raw rankings per block)
CREATE TABLE public.wip_block_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.wip_sessions(id) ON DELETE CASCADE,
  block_number integer NOT NULL,
  item_id integer NOT NULL,
  assigned_rank integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, block_number, item_id)
);

ALTER TABLE public.wip_block_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own block responses"
  ON public.wip_block_responses FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.wip_sessions
      WHERE wip_sessions.id = wip_block_responses.session_id
      AND wip_sessions.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.wip_sessions
      WHERE wip_sessions.id = wip_block_responses.session_id
      AND wip_sessions.user_id = auth.uid()
    )
  );

-- WIP Importance Responses (Yes/No per item)
CREATE TABLE public.wip_importance_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.wip_sessions(id) ON DELETE CASCADE,
  item_id integer NOT NULL,
  is_important boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, item_id)
);

ALTER TABLE public.wip_importance_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own importance responses"
  ON public.wip_importance_responses FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.wip_sessions
      WHERE wip_sessions.id = wip_importance_responses.session_id
      AND wip_sessions.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.wip_sessions
      WHERE wip_sessions.id = wip_importance_responses.session_id
      AND wip_sessions.user_id = auth.uid()
    )
  );

-- WIP Item Scores (computed per item)
CREATE TABLE public.wip_item_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.wip_sessions(id) ON DELETE CASCADE,
  item_id integer NOT NULL,
  raw_votes integer NOT NULL,
  adjusted_votes float NOT NULL,
  proportion_p float NOT NULL,
  initial_z float NOT NULL,
  final_score float NOT NULL,
  UNIQUE (session_id, item_id)
);

ALTER TABLE public.wip_item_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own item scores"
  ON public.wip_item_scores FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.wip_sessions
      WHERE wip_sessions.id = wip_item_scores.session_id
      AND wip_sessions.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.wip_sessions
      WHERE wip_sessions.id = wip_item_scores.session_id
      AND wip_sessions.user_id = auth.uid()
    )
  );

-- WIP Scale Scores (6 work values per session)
CREATE TABLE public.wip_scale_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.wip_sessions(id) ON DELETE CASCADE,
  scale_key text NOT NULL,
  scale_label text NOT NULL,
  score float NOT NULL,
  rank_order integer NOT NULL,
  UNIQUE (session_id, scale_key)
);

ALTER TABLE public.wip_scale_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own scale scores"
  ON public.wip_scale_scores FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.wip_sessions
      WHERE wip_sessions.id = wip_scale_scores.session_id
      AND wip_sessions.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.wip_sessions
      WHERE wip_sessions.id = wip_scale_scores.session_id
      AND wip_sessions.user_id = auth.uid()
    )
  );

-- Admin read policies for all scoring tables
CREATE POLICY "Admins can view all block responses"
  ON public.wip_block_responses FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Admins can view all importance responses"
  ON public.wip_importance_responses FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Admins can view all item scores"
  ON public.wip_item_scores FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Admins can view all scale scores"
  ON public.wip_scale_scores FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'));
