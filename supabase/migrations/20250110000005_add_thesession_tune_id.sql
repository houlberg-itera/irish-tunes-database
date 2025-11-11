-- Add thesession_tune_id column to tunes table
ALTER TABLE tunes
ADD COLUMN thesession_tune_id INTEGER;

-- Add index for faster lookups
CREATE INDEX idx_tunes_thesession_tune_id ON tunes(thesession_tune_id);

-- Add comment
COMMENT ON COLUMN tunes.thesession_tune_id IS 'ID from The Session API (thesession.org) for imported tunes';
