ALTER TABLE generated_report ADD COLUMN pdf_path TEXT;
ALTER TABLE generated_report ADD COLUMN zip_path TEXT;
ALTER TABLE generated_report ADD COLUMN config_hash TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_generated_report_block_date ON generated_report(block_id, report_date);
