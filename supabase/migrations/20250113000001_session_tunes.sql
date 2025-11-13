-- Create table for tunes from The Session
-- Using JSONB to store all data flexibly since the structure varies
CREATE TABLE IF NOT EXISTS session_tunes (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT,
    abc TEXT,
    data JSONB, -- Store all other fields here
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index on type for faster filtering
CREATE INDEX IF NOT EXISTS idx_session_tunes_type ON session_tunes(type);

-- Add index on name for searching
CREATE INDEX IF NOT EXISTS idx_session_tunes_name ON session_tunes(name);

-- Enable RLS (but allow public read access for random sets)
ALTER TABLE session_tunes ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read session tunes
CREATE POLICY "Allow public read access to session tunes"
    ON session_tunes
    FOR SELECT
    TO public
    USING (true);

-- SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
