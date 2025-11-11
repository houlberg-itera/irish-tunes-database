-- Irish Tunes Database Schema
-- Initial migration: Core tables and reference data

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- REFERENCE TABLES
-- ============================================================================

-- Table: tune_types
-- Stores different types of Irish tunes (jig, reel, hornpipe, etc.)
CREATE TABLE tune_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    typical_time_signature VARCHAR(10),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE tune_types IS 'Types of Irish traditional tunes';

-- Table: musical_keys
-- Stores musical keys (D, G, Em, etc.)
CREATE TABLE musical_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(10) NOT NULL UNIQUE,
    mode VARCHAR(20) DEFAULT 'major',
    display_order INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE musical_keys IS 'Musical keys for tunes';

-- Table: composers
-- Stores information about tune composers and arrangers
CREATE TABLE composers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    birth_year INTEGER,
    death_year INTEGER,
    nationality VARCHAR(100),
    biography TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE composers IS 'Composers and tune writers';

-- Table: sources
-- Stores books, collections, and other sources
CREATE TABLE sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(300) NOT NULL,
    author VARCHAR(200),
    publisher VARCHAR(200),
    publication_year INTEGER,
    isbn VARCHAR(20),
    url TEXT,
    source_type VARCHAR(50), -- 'book', 'website', 'collection', 'manuscript'
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE sources IS 'Books, websites, and collections where tunes are found';

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Table: tunes
-- Main table storing tune information
CREATE TABLE tunes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(300) NOT NULL,
    tune_type_id UUID REFERENCES tune_types(id) ON DELETE SET NULL,
    key_id UUID REFERENCES musical_keys(id) ON DELETE SET NULL,
    mode VARCHAR(20) DEFAULT 'major', -- 'major', 'minor', 'dorian', 'mixolydian', etc.
    time_signature VARCHAR(10), -- '4/4', '6/8', '9/8', etc.
    
    -- ABC notation and music data
    abc_notation TEXT,
    abc_header TEXT, -- Separate header information
    
    -- Metadata
    composer_id UUID REFERENCES composers(id) ON DELETE SET NULL,
    composition_year INTEGER,
    region VARCHAR(100), -- County or region in Ireland
    difficulty_level INTEGER CHECK (difficulty_level BETWEEN 1 AND 5),
    
    -- Popularity and usage
    popularity_score INTEGER DEFAULT 0,
    play_count INTEGER DEFAULT 0,
    
    -- Notes and references
    notes TEXT,
    historical_notes TEXT,
    
    -- External references
    thesession_tune_id INTEGER UNIQUE, -- TheSession.org tune ID
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID, -- For user tracking if needed
    
    -- Search
    search_vector tsvector
);

COMMENT ON TABLE tunes IS 'Main table storing Irish traditional tunes';
COMMENT ON COLUMN tunes.abc_notation IS 'Full ABC notation of the tune';
COMMENT ON COLUMN tunes.difficulty_level IS 'Difficulty rating from 1 (easiest) to 5 (hardest)';
COMMENT ON COLUMN tunes.popularity_score IS 'Calculated popularity based on various factors';

-- Create index for full-text search
CREATE INDEX idx_tunes_search ON tunes USING GIN(search_vector);
CREATE INDEX idx_tunes_title ON tunes(title);
CREATE INDEX idx_tunes_type ON tunes(tune_type_id);
CREATE INDEX idx_tunes_key ON tunes(key_id);
CREATE INDEX idx_tunes_composer ON tunes(composer_id);
CREATE INDEX idx_tunes_thesession_id ON tunes(thesession_tune_id);

-- Table: tune_aliases
-- Stores alternative names for tunes
CREATE TABLE tune_aliases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tune_id UUID NOT NULL REFERENCES tunes(id) ON DELETE CASCADE,
    alias_name VARCHAR(300) NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE tune_aliases IS 'Alternative names for tunes';
CREATE INDEX idx_tune_aliases_tune ON tune_aliases(tune_id);
CREATE INDEX idx_tune_aliases_name ON tune_aliases(alias_name);

-- Table: tune_parts
-- Stores individual parts of tunes (A part, B part, etc.)
CREATE TABLE tune_parts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tune_id UUID NOT NULL REFERENCES tunes(id) ON DELETE CASCADE,
    part_label VARCHAR(10) NOT NULL, -- 'A', 'B', 'C', etc.
    part_order INTEGER NOT NULL,
    abc_notation TEXT NOT NULL,
    repeats INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE tune_parts IS 'Individual parts of tunes';
CREATE INDEX idx_tune_parts_tune ON tune_parts(tune_id);

-- Table: tune_recordings
-- Links to recordings of tunes
CREATE TABLE tune_recordings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tune_id UUID NOT NULL REFERENCES tunes(id) ON DELETE CASCADE,
    artist VARCHAR(200),
    album VARCHAR(200),
    url TEXT,
    recording_year INTEGER,
    platform VARCHAR(50), -- 'youtube', 'spotify', 'soundcloud', etc.
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE tune_recordings IS 'Recordings and performances of tunes';
CREATE INDEX idx_tune_recordings_tune ON tune_recordings(tune_id);

-- Table: tune_sources
-- Junction table linking tunes to sources
CREATE TABLE tune_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tune_id UUID NOT NULL REFERENCES tunes(id) ON DELETE CASCADE,
    source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    page_number VARCHAR(20),
    tune_number VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tune_id, source_id)
);

COMMENT ON TABLE tune_sources IS 'Links tunes to their sources';
CREATE INDEX idx_tune_sources_tune ON tune_sources(tune_id);
CREATE INDEX idx_tune_sources_source ON tune_sources(source_id);

-- ============================================================================
-- SETS AND COLLECTIONS
-- ============================================================================

-- Table: tune_sets
-- Groups of tunes commonly played together
CREATE TABLE tune_sets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(300),
    description TEXT,
    created_by UUID,
    is_public BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE tune_sets IS 'Sets of tunes commonly played together';

-- Table: tune_set_items
-- Junction table for tunes in sets
CREATE TABLE tune_set_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    set_id UUID NOT NULL REFERENCES tune_sets(id) ON DELETE CASCADE,
    tune_id UUID NOT NULL REFERENCES tunes(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(set_id, tune_id, position)
);

COMMENT ON TABLE tune_set_items IS 'Tunes within sets, with ordering';
CREATE INDEX idx_tune_set_items_set ON tune_set_items(set_id);
CREATE INDEX idx_tune_set_items_tune ON tune_set_items(tune_id);

-- ============================================================================
-- TAGGING AND CATEGORIZATION
-- ============================================================================

-- Table: tags
-- Flexible tagging system
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50), -- 'mood', 'occasion', 'region', 'style', etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE tags IS 'Tags for categorizing tunes';

-- Table: tune_tags
-- Junction table for tune tags
CREATE TABLE tune_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tune_id UUID NOT NULL REFERENCES tunes(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tune_id, tag_id)
);

COMMENT ON TABLE tune_tags IS 'Tags associated with tunes';
CREATE INDEX idx_tune_tags_tune ON tune_tags(tune_id);
CREATE INDEX idx_tune_tags_tag ON tune_tags(tag_id);

-- ============================================================================
-- PRACTICE TRACKING
-- ============================================================================

-- Table: user_tune_practice
-- Tracks user's practice sessions and proficiency for each tune
CREATE TABLE user_tune_practice (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL, -- Reference to your auth user
    tune_id UUID NOT NULL REFERENCES tunes(id) ON DELETE CASCADE,
    
    -- Proficiency tracking
    proficiency_level INTEGER CHECK (proficiency_level BETWEEN 1 AND 5), -- 1=Learning, 2=Practicing, 3=Competent, 4=Proficient, 5=Mastered
    proficiency_notes TEXT,
    
    -- Practice statistics
    total_practice_time_minutes INTEGER DEFAULT 0,
    practice_count INTEGER DEFAULT 0,
    last_practiced_at TIMESTAMPTZ,
    
    -- Learning progress
    started_learning_at TIMESTAMPTZ DEFAULT NOW(),
    achieved_proficiency_at TIMESTAMPTZ, -- When reached level 4 or 5
    
    -- Personal notes
    learning_notes TEXT,
    trouble_spots TEXT, -- Specific sections that need work
    
    -- Practice goals
    target_proficiency_level INTEGER CHECK (target_proficiency_level BETWEEN 1 AND 5),
    target_date DATE,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE, -- Whether actively practicing this tune
    is_favorite BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, tune_id)
);

COMMENT ON TABLE user_tune_practice IS 'Tracks user practice sessions and proficiency levels for tunes';
COMMENT ON COLUMN user_tune_practice.proficiency_level IS '1=Learning, 2=Practicing, 3=Competent, 4=Proficient, 5=Mastered';

CREATE INDEX idx_user_tune_practice_user ON user_tune_practice(user_id);
CREATE INDEX idx_user_tune_practice_tune ON user_tune_practice(tune_id);
CREATE INDEX idx_user_tune_practice_proficiency ON user_tune_practice(proficiency_level);
CREATE INDEX idx_user_tune_practice_active ON user_tune_practice(is_active) WHERE is_active = TRUE;

-- Table: practice_sessions
-- Individual practice session logs
CREATE TABLE practice_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    tune_id UUID NOT NULL REFERENCES tunes(id) ON DELETE CASCADE,
    
    -- Session details
    session_date TIMESTAMPTZ DEFAULT NOW(),
    duration_minutes INTEGER,
    tempo_bpm INTEGER, -- Beats per minute practiced at
    
    -- Session quality/notes
    quality_rating INTEGER CHECK (quality_rating BETWEEN 1 AND 5),
    notes TEXT,
    what_worked TEXT,
    what_needs_work TEXT,
    
    -- Progress indicators
    memorized BOOLEAN DEFAULT FALSE,
    played_full_speed BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE practice_sessions IS 'Individual practice session logs for detailed tracking';

CREATE INDEX idx_practice_sessions_user ON practice_sessions(user_id);
CREATE INDEX idx_practice_sessions_tune ON practice_sessions(tune_id);
CREATE INDEX idx_practice_sessions_date ON practice_sessions(session_date);

-- ============================================================================
-- TRIGGERS AND FUNCTIONS
-- ============================================================================

-- Function: update_updated_at
-- Updates the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_tunes_updated_at
    BEFORE UPDATE ON tunes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_tune_types_updated_at
    BEFORE UPDATE ON tune_types
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_composers_updated_at
    BEFORE UPDATE ON composers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_sources_updated_at
    BEFORE UPDATE ON sources
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_tune_sets_updated_at
    BEFORE UPDATE ON tune_sets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_user_tune_practice_updated_at
    BEFORE UPDATE ON user_tune_practice
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Function: update_tune_search_vector
-- Updates the search vector for full-text search
CREATE OR REPLACE FUNCTION update_tune_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.notes, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.historical_notes, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tunes_search_vector
    BEFORE INSERT OR UPDATE ON tunes
    FOR EACH ROW
    EXECUTE FUNCTION update_tune_search_vector();