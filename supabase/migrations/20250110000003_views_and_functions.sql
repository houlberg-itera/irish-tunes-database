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
-- PRACTICE TRACKING VIEWS
-- ============================================================================

-- View: my_practice_tunes
-- User's tunes with practice status and proficiency
CREATE OR REPLACE VIEW my_practice_tunes AS
SELECT 
    t.id,
    t.title,
    tt.name AS tune_type,
    mk.name AS key,
    t.mode,
    t.time_signature,
    t.difficulty_level,
    t.abc_notation,
    utp.proficiency_level,
    CASE utp.proficiency_level
        WHEN 1 THEN 'Learning'
        WHEN 2 THEN 'Practicing'
        WHEN 3 THEN 'Competent'
        WHEN 4 THEN 'Proficient'
        WHEN 5 THEN 'Mastered'
    END AS proficiency_status,
    utp.total_practice_time_minutes,
    utp.practice_count,
    utp.last_practiced_at,
    utp.is_active,
    utp.is_favorite,
    utp.learning_notes,
    utp.trouble_spots,
    utp.target_proficiency_level,
    utp.target_date,
    utp.user_id
FROM user_tune_practice utp
JOIN tunes t ON utp.tune_id = t.id
LEFT JOIN tune_types tt ON t.tune_type_id = tt.id
LEFT JOIN musical_keys mk ON t.key_id = mk.id;

COMMENT ON VIEW my_practice_tunes IS 'User tunes with practice tracking and proficiency levels';

-- View: active_practice_tunes
-- Currently active practice tunes
CREATE OR REPLACE VIEW active_practice_tunes AS
SELECT 
    t.id,
    t.title,
    tt.name AS tune_type,
    mk.name AS key,
    utp.proficiency_level,
    utp.last_practiced_at,
    utp.total_practice_time_minutes,
    utp.user_id
FROM user_tune_practice utp
JOIN tunes t ON utp.tune_id = t.id
LEFT JOIN tune_types tt ON t.tune_type_id = tt.id
LEFT JOIN musical_keys mk ON t.key_id = mk.id
WHERE utp.is_active = TRUE
ORDER BY utp.last_practiced_at DESC NULLS LAST;

COMMENT ON VIEW active_practice_tunes IS 'Currently active practice tunes';

-- View: practice_statistics
-- Overall practice statistics per user
CREATE OR REPLACE VIEW practice_statistics AS
SELECT 
    user_id,
    COUNT(*) AS total_tunes,
    COUNT(*) FILTER (WHERE is_active = TRUE) AS active_tunes,
    COUNT(*) FILTER (WHERE proficiency_level >= 4) AS proficient_tunes,
    COUNT(*) FILTER (WHERE proficiency_level = 5) AS mastered_tunes,
    SUM(total_practice_time_minutes) AS total_practice_minutes,
    SUM(practice_count) AS total_practice_sessions,
    MAX(last_practiced_at) AS last_practice_date
FROM user_tune_practice
GROUP BY user_id;

COMMENT ON VIEW practice_statistics IS 'Overall practice statistics per user';

-- View: my_tune_sets_with_tunes
-- User's sets with their tunes and practice status
CREATE OR REPLACE VIEW my_tune_sets_with_tunes AS
SELECT 
    ts.id AS set_id,
    ts.name AS set_name,
    ts.description AS set_description,
    ts.created_by,
    tsi.position,
    t.id AS tune_id,
    t.title AS tune_title,
    tt.name AS tune_type,
    mk.name AS key,
    t.time_signature,
    t.abc_notation,
    utp.proficiency_level,
    utp.is_active AS is_practicing
FROM tune_sets ts
JOIN tune_set_items tsi ON ts.id = tsi.set_id
JOIN tunes t ON tsi.tune_id = t.id
LEFT JOIN tune_types tt ON t.tune_type_id = tt.id
LEFT JOIN musical_keys mk ON t.key_id = mk.id
LEFT JOIN user_tune_practice utp ON t.id = utp.tune_id AND ts.created_by = utp.user_id
ORDER BY ts.id, tsi.position;

COMMENT ON VIEW my_tune_sets_with_tunes IS 'User sets with tunes and practice status';

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