-- Create videos table
CREATE TABLE IF NOT EXISTS public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('long', 'shorts')),
  script TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes & RLS
CREATE INDEX IF NOT EXISTS idx_videos_user_id ON public.videos(user_id);
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- Policies (Drop existing to avoid conflicts if re-running)
DROP POLICY IF EXISTS "Users can view own videos" ON public.videos;
DROP POLICY IF EXISTS "Users can insert own videos" ON public.videos;
DROP POLICY IF EXISTS "Users can update own videos" ON public.videos;
DROP POLICY IF EXISTS "Users can delete own videos" ON public.videos;

CREATE POLICY "Users can view own videos" ON public.videos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own videos" ON public.videos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own videos" ON public.videos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own videos" ON public.videos FOR DELETE USING (auth.uid() = user_id);

-- Storage Bucket (if not exists)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('videos', 'videos', true) 
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
-- Note: We need to handle potential policy conflicts gracefully or drop/create
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload" ON storage.objects;
DROP POLICY IF EXISTS "Owner update" ON storage.objects;
DROP POLICY IF EXISTS "Owner delete" ON storage.objects;

CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'videos' );
CREATE POLICY "Authenticated upload" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'videos' AND auth.role() = 'authenticated' );
CREATE POLICY "Owner update" ON storage.objects FOR UPDATE USING ( bucket_id = 'videos' AND auth.uid() = owner );
CREATE POLICY "Owner delete" ON storage.objects FOR DELETE USING ( bucket_id = 'videos' AND auth.uid() = owner );
