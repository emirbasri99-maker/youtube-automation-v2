-- Increase file size limit for 'videos' bucket to 1GB (1073741824 bytes)
UPDATE storage.buckets
SET file_size_limit = 1073741824,
    allowed_mime_types = ARRAY['video/mp4']
WHERE id = 'videos';

-- If the bucket doesn't exist (it should), create it with the limit
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('videos', 'videos', true, 1073741824, ARRAY['video/mp4'])
ON CONFLICT (id) DO UPDATE
SET file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Verify the change
SELECT id, name, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE id = 'videos';
