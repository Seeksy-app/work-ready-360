
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE;

-- Generate a token for existing profiles
UPDATE public.profiles SET share_token = encode(gen_random_bytes(12), 'hex') WHERE share_token IS NULL;

-- Make future profiles auto-generate a token
ALTER TABLE public.profiles ALTER COLUMN share_token SET DEFAULT encode(gen_random_bytes(12), 'hex');

-- Allow anyone to read profiles by share_token (for public summary)
CREATE POLICY "Anyone can view profiles by share token"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (share_token IS NOT NULL);
