-- Add to_be_learned column to tunes table
ALTER TABLE tunes
ADD COLUMN to_be_learned BOOLEAN DEFAULT false;

-- Add comment
COMMENT ON COLUMN tunes.to_be_learned IS 'Indicates if the tune is marked for learning (not yet learned)';
