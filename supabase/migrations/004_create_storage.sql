-- ============================================
-- 4. STORAGE BUCKET
-- ============================================
-- Create a public bucket for videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('videos', 'videos', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for storage
-- Allow public access to view files
CREATE POLICY "Public Access"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'videos' );

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload videos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'videos' 
    AND auth.role() = 'authenticated'
  );

-- Allow users to delete their own files (optional, but good practice)
CREATE POLICY "Users can delete own videos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'videos' 
    AND auth.uid() = owner
  );

SELECT '✅ Storage bucket "videos" configured!' as result;
