-- Views and helper functions for Irish Tunes Database

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View: tunes_with_details
-- Comprehensive view of tunes with joined reference data
CREATE OR REPLACE VIEW tunes_with_details AS
SELECT 
    t.id,
    t.title,
    tt.name AS tune_type,
    mk.name AS key,
    t.mode,
    t.time_signature,
    c.name AS composer,
    t.composition_year,
    t.region,
    t.difficulty_level,
    t.popularity_score,
    t.play_count,
    t.abc_notation,
    t.notes,
    t.historical_notes,
    t.created_at,
    t.updated_at,
    -- Aggregate aliases
    ARRAY(
        SELECT alias_name 
        FROM tune_aliases ta 
        WHERE ta.tune_id = t.id
    ) AS aliases,
    -- Aggregate tags
    ARRAY(
        SELECT tg.name 
        FROM tune_tags tt_inner 
        JOIN tags tg ON tt_inner.tag_id = tg.id 
        WHERE tt_inner.tune_id = t.id
    ) AS tags,
    -- Count of recordings
    (
        SELECT COUNT(*) 
        FROM tune_recordings tr 
        WHERE tr.tune_id = t.id
    ) AS recording_count
FROM tunes t
LEFT JOIN tune_types tt ON t.tune_type_id = tt.id
LEFT JOIN musical_keys mk ON t.key_id = mk.id
LEFT JOIN composers c ON t.composer_id = c.id;

COMMENT ON VIEW tunes_with_details IS 'Comprehensive view of tunes with all related information';

-- View: popular_tunes
-- Most popular tunes
CREATE OR REPLACE VIEW popular_tunes AS
SELECT 
    t.id,
    t.title,
    tt.name AS tune_type,
    mk.name AS key,
    t.popularity_score,
    t.play_count
FROM tunes t
LEFT JOIN tune_types tt ON t.tune_type_id = tt.id
LEFT JOIN musical_keys mk ON t.key_id = mk.id
WHERE t.popularity_score > 0
ORDER BY t.popularity_score DESC, t.play_count DESC;

COMMENT ON VIEW popular_tunes IS 'Most popular tunes ranked by popularity score';

-- View: tunes_by_type
-- Count of tunes by type
CREATE OR REPLACE VIEW tunes_by_type AS
SELECT 
    tt.name AS tune_type,
    tt.description,
    COUNT(t.id) AS tune_count
FROM tune_types tt
LEFT JOIN tunes t ON t.tune_type_id = tt.id
GROUP BY tt.id, tt.name, tt.description
ORDER BY tune_count DESC;

COMMENT ON VIEW tunes_by_type IS 'Statistics on number of tunes per type';

-- View: tunes_by_key
-- Count of tunes by key
CREATE OR REPLACE VIEW tunes_by_key AS
SELECT 
    mk.name AS key,
    mk.mode,
    COUNT(t.id) AS tune_count
FROM musical_keys mk
LEFT JOIN tunes t ON t.key_id = mk.id
GROUP BY mk.id, mk.name, mk.mode
ORDER BY tune_count DESC;

COMMENT ON VIEW tunes_by_key IS 'Statistics on number of tunes per key';

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function: search_tunes
-- Full-text search for tunes
CREATE OR REPLACE FUNCTION search_tunes(search_query TEXT)
RETURNS TABLE (
    id UUID,
    title VARCHAR(300),
    tune_type VARCHAR(50),
    key VARCHAR(10),
    relevance REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.title,
        tt.name AS tune_type,
        mk.name AS key,
        ts_rank(t.search_vector, plainto_tsquery('english', search_query)) AS relevance
    FROM tunes t
    LEFT JOIN tune_types tt ON t.tune_type_id = tt.id
    LEFT JOIN musical_keys mk ON t.key_id = mk.id
    WHERE t.search_vector @@ plainto_tsquery('english', search_query)
    ORDER BY relevance DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION search_tunes IS 'Full-text search across tune titles and notes';

-- Function: get_tunes_in_key
-- Get all tunes in a specific key
CREATE OR REPLACE FUNCTION get_tunes_in_key(key_name VARCHAR(10))
RETURNS TABLE (
    id UUID,
    title VARCHAR(300),
    tune_type VARCHAR(50),
    mode VARCHAR(20),
    time_signature VARCHAR(10)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.title,
        tt.name AS tune_type,
        t.mode,
        t.time_signature
    FROM tunes t
    LEFT JOIN tune_types tt ON t.tune_type_id = tt.id
    JOIN musical_keys mk ON t.key_id = mk.id
    WHERE mk.name = key_name
    ORDER BY t.title;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_tunes_in_key IS 'Get all tunes in a specific key';

-- Function: get_tunes_by_type
-- Get all tunes of a specific type
CREATE OR REPLACE FUNCTION get_tunes_by_type(type_name VARCHAR(50))
RETURNS TABLE (
    id UUID,
    title VARCHAR(300),
    key VARCHAR(10),
    mode VARCHAR(20),
    time_signature VARCHAR(10)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.title,
        mk.name AS key,
        t.mode,
        t.time_signature
    FROM tunes t
    LEFT JOIN musical_keys mk ON t.key_id = mk.id
    JOIN tune_types tt ON t.tune_type_id = tt.id
    WHERE tt.name = type_name
    ORDER BY t.title;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_tunes_by_type IS 'Get all tunes of a specific type';

-- Function: increment_play_count
-- Increment the play count for a tune
CREATE OR REPLACE FUNCTION increment_play_count(tune_uuid UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE tunes 
    SET 
        play_count = play_count + 1,
        popularity_score = popularity_score + 1
    WHERE id = tune_uuid;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION increment_play_count IS 'Increment play count and popularity for a tune';

-- Function: get_tune_set_tunes
-- Get all tunes in a set in order
CREATE OR REPLACE FUNCTION get_tune_set_tunes(set_uuid UUID)
RETURNS TABLE (
    position INTEGER,
    tune_id UUID,
    title VARCHAR(300),
    tune_type VARCHAR(50),
    key VARCHAR(10),
    time_signature VARCHAR(10)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tsi.position,
        t.id AS tune_id,
        t.title,
        tt.name AS tune_type,
        mk.name AS key,
        t.time_signature
    FROM tune_set_items tsi
    JOIN tunes t ON tsi.tune_id = t.id
    LEFT JOIN tune_types tt ON t.tune_type_id = tt.id
    LEFT JOIN musical_keys mk ON t.key_id = mk.id
    WHERE tsi.set_id = set_uuid
    ORDER BY tsi.position;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_tune_set_tunes IS 'Get all tunes in a set ordered by position';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on tables (optional - comment out if not using Supabase auth)
-- ALTER TABLE tunes ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE tune_sets ENABLE ROW LEVEL SECURITY;

-- Example policy: Public read access to tunes
-- CREATE POLICY "Public tunes are viewable by everyone" 
--     ON tunes FOR SELECT 
--     USING (true);

-- Example policy: Users can create their own sets
-- CREATE POLICY "Users can create their own sets" 
--     ON tune_sets FOR INSERT 
--     WITH CHECK (auth.uid() = created_by);