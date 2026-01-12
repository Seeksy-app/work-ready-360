-- Create storage bucket for podcast audio files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('podcasts', 'podcasts', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy for podcast uploads (service role)
CREATE POLICY "Service role can upload podcasts"
ON storage.objects
FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'podcasts');

-- Create storage policy for public podcast access
CREATE POLICY "Podcasts are publicly accessible"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'podcasts');

-- Create policy for users to manage their own podcast files
CREATE POLICY "Users can manage their own podcast files"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'podcasts' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'podcasts' AND auth.uid()::text = (storage.foldername(name))[1]);