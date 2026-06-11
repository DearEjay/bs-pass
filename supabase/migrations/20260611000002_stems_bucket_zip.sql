-- Update stems bucket to accept ZIP files instead of audio formats
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'application/zip',
  'application/x-zip-compressed',
  'application/x-zip',
  'application/octet-stream'
]
WHERE id = 'stems';
