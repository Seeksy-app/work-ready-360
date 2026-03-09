ALTER TABLE public.wip_sessions 
ADD COLUMN IF NOT EXISTS source text DEFAULT 'assessment',
ADD COLUMN IF NOT EXISTS is_demo boolean DEFAULT false;