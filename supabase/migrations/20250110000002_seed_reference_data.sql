-- Seed reference data for Irish Tunes Database
-- This populates the reference tables with common Irish tune types, keys, etc.

-- ============================================================================
-- TUNE TYPES
-- ============================================================================

INSERT INTO tune_types (name, description, typical_time_signature) VALUES
('Jig', 'A lively dance tune in compound time, one of the most common types', '6/8'),
('Reel', 'Fast-paced dance tune in simple time, very popular in sessions', '4/4'),
('Hornpipe', 'Dance tune with a distinctive dotted rhythm', '4/4'),
('Slip Jig', 'Graceful dance tune in 9/8 time', '9/8'),
('Polka', 'Lively dance tune in 2/4 time, popular in Cork and Kerry', '2/4'),
('Slide', 'Fast dance tune in 12/8 time, similar to jig but faster', '12/8'),
('Waltz', 'Dance tune in 3/4 time', '3/4'),
('Barndance', 'Dance tune in 4/4 time with a distinctive rhythm', '4/4'),
('Mazurka', 'Polish-origin dance tune in 3/4 time', '3/4'),
('Strathspey', 'Scottish-origin tune with dotted rhythms', '4/4'),
('March', 'Processional tune in 4/4 or 2/4 time', '4/4'),
('Air', 'Slow melodic tune, often sung', 'varies'),
('Slow Air', 'Very slow, expressive melody', 'varies'),
('Fling', 'Fast Scottish dance tune', '4/4'),
('Set Dance', 'Complex tune for traditional set dancing', 'varies')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- MUSICAL KEYS
-- ============================================================================

INSERT INTO musical_keys (name, mode, display_order) VALUES
-- Major keys
('D', 'major', 1),
('G', 'major', 2),
('A', 'major', 3),
('E', 'major', 4),
('C', 'major', 5),
('F', 'major', 6),
('Bb', 'major', 7),
('Eb', 'major', 8),

-- Minor keys
('Em', 'minor', 11),
('Am', 'minor', 12),
('Dm', 'minor', 13),
('Bm', 'minor', 14),
('F#m', 'minor', 15),
('Cm', 'minor', 16),
('Gm', 'minor', 17),

-- Modal keys (common in Irish music)
('D Dorian', 'dorian', 21),
('E Dorian', 'dorian', 22),
('G Dorian', 'dorian', 23),
('A Dorian', 'dorian', 24),
('D Mixolydian', 'mixolydian', 31),
('G Mixolydian', 'mixolydian', 32),
('A Mixolydian', 'mixolydian', 33),
('E Mixolydian', 'mixolydian', 34)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- COMMON TAGS
-- ============================================================================

INSERT INTO tags (name, category) VALUES
-- Mood tags
('Lively', 'mood'),
('Melancholy', 'mood'),
('Cheerful', 'mood'),
('Haunting', 'mood'),
('Energetic', 'mood'),
('Peaceful', 'mood'),

-- Occasion tags
('Session Tune', 'occasion'),
('Performance', 'occasion'),
('Wedding', 'occasion'),
('Funeral', 'occasion'),
('Dance', 'occasion'),

-- Region tags
('Donegal', 'region'),
('Sligo', 'region'),
('Clare', 'region'),
('Kerry', 'region'),
('Cork', 'region'),
('Galway', 'region'),
('Sliabh Luachra', 'region'),

-- Style tags
('Traditional', 'style'),
('Contemporary', 'style'),
('Old Style', 'style'),
('Modern Arrangement', 'style'),

-- Difficulty tags
('Beginner Friendly', 'difficulty'),
('Intermediate', 'difficulty'),
('Advanced', 'difficulty'),

-- Popularity tags
('Session Favorite', 'popularity'),
('Well Known', 'popularity'),
('Rare', 'popularity'),
('Classic', 'popularity')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- SAMPLE SOURCES
-- ============================================================================

INSERT INTO sources (title, author, publisher, publication_year, source_type) VALUES
('O''Neill''s Music of Ireland', 'Francis O''Neill', 'Lyon & Healy', 1903, 'book'),
('The Dance Music of Ireland', 'Francis O''Neill', 'Lyon & Healy', 1907, 'book'),
('Ceol Rince na hÉireann', 'Breandán Breathnach', 'An Gúm', 1963, 'book'),
('The Session', NULL, NULL, NULL, 'website'),
('Irish Traditional Music Archive', NULL, NULL, NULL, 'collection')
ON CONFLICT DO NOTHING;