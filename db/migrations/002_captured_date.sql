ALTER TABLE photo ADD COLUMN captured_date TEXT;
UPDATE photo SET captured_date = date(captured_at, 'localtime') WHERE captured_date IS NULL;
CREATE INDEX IF NOT EXISTS idx_photo_captured_date ON photo(captured_date);
