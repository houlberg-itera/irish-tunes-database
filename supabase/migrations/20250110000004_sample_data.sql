-- Sample data for Irish Tunes Database
-- A few well-known Irish tunes to get started

-- Get reference IDs for use in inserts
DO $$
DECLARE
    reel_type_id UUID;
    jig_type_id UUID;
    hornpipe_type_id UUID;
    d_key_id UUID;
    g_key_id UUID;
    em_key_id UUID;
    a_key_id UUID;
BEGIN
    -- Get tune type IDs
    SELECT id INTO reel_type_id FROM tune_types WHERE name = 'Reel';
    SELECT id INTO jig_type_id FROM tune_types WHERE name = 'Jig';
    SELECT id INTO hornpipe_type_id FROM tune_types WHERE name = 'Hornpipe';
    
    -- Get key IDs
    SELECT id INTO d_key_id FROM musical_keys WHERE name = 'D';
    SELECT id INTO g_key_id FROM musical_keys WHERE name = 'G';
    SELECT id INTO em_key_id FROM musical_keys WHERE name = 'Em';
    SELECT id INTO a_key_id FROM musical_keys WHERE name = 'A';
    
    -- Insert sample tunes
    
    -- The Kesh Jig
    INSERT INTO tunes (title, tune_type_id, key_id, mode, time_signature, difficulty_level, popularity_score, notes)
    VALUES (
        'The Kesh Jig',
        jig_type_id,
        g_key_id,
        'major',
        '6/8',
        2,
        100,
        'One of the most popular and well-known Irish jigs, often one of the first tunes beginners learn.'
    );
    
    -- The Irish Washerwoman
    INSERT INTO tunes (title, tune_type_id, key_id, mode, time_signature, difficulty_level, popularity_score, notes)
    VALUES (
        'The Irish Washerwoman',
        jig_type_id,
        g_key_id,
        'major',
        '6/8',
        2,
        95,
        'A classic Irish jig known worldwide, often used in performances and competitions.'
    );
    
    -- The Silver Spear
    INSERT INTO tunes (title, tune_type_id, key_id, mode, time_signature, difficulty_level, popularity_score, notes)
    VALUES (
        'The Silver Spear',
        reel_type_id,
        d_key_id,
        'major',
        '4/4',
        2,
        90,
        'A very common session reel, popular across Ireland and beyond.'
    );
    
    -- The Wind That Shakes the Barley
    INSERT INTO tunes (title, tune_type_id, key_id, mode, time_signature, difficulty_level, popularity_score, notes)
    VALUES (
        'The Wind That Shakes the Barley',
        reel_type_id,
        d_key_id,
        'major',
        '4/4',
        2,
        85,
        'A beautiful and popular reel, named after the 1798 rebellion song.'
    );
    
    -- The Siege of Ennis
    INSERT INTO tunes (title, tune_type_id, key_id, mode, time_signature, difficulty_level, popularity_score, notes)
    VALUES (
        'The Siege of Ennis',
        jig_type_id,
        g_key_id,
        'major',
        '6/8',
        2,
        80,
        'A popular céilí tune, associated with the dance of the same name.'
    );
    
    -- The Boys of Bluehill
    INSERT INTO tunes (title, tune_type_id, key_id, mode, time_signature, difficulty_level, popularity_score, notes)
    VALUES (
        'The Boys of Bluehill',
        hornpipe_type_id,
        d_key_id,
        'major',
        '4/4',
        3,
        75,
        'A well-known hornpipe with a distinctive melody.'
    );
    
    -- The Swallow''s Tail
    INSERT INTO tunes (title, tune_type_id, key_id, mode, time_signature, difficulty_level, popularity_score, notes)
    VALUES (
        'The Swallow''s Tail',
        reel_type_id,
        em_key_id,
        'minor',
        '4/4',
        3,
        85,
        'A popular reel in E minor with a distinctive melodic pattern.'
    );
    
    -- The Butterfly
    INSERT INTO tunes (title, tune_type_id, key_id, mode, time_signature, difficulty_level, popularity_score, notes)
    VALUES (
        'The Butterfly',
        jig_type_id,
        em_key_id,
        'minor',
        '6/8',
        3,
        80,
        'A beloved slip jig with a flowing, graceful melody.'
    );
    
END $$;

-- Add some aliases for tunes
INSERT INTO tune_aliases (tune_id, alias_name)
SELECT id, 'The Washerwoman' 
FROM tunes 
WHERE title = 'The Irish Washerwoman';

-- Add some tags to tunes
DO $$
DECLARE
    session_tag_id UUID;
    beginner_tag_id UUID;
    classic_tag_id UUID;
BEGIN
    SELECT id INTO session_tag_id FROM tags WHERE name = 'Session Favorite';
    SELECT id INTO beginner_tag_id FROM tags WHERE name = 'Beginner Friendly';
    SELECT id INTO classic_tag_id FROM tags WHERE name = 'Classic';
    
    -- Tag The Kesh as session favorite, beginner friendly, and classic
    INSERT INTO tune_tags (tune_id, tag_id)
    SELECT t.id, session_tag_id
    FROM tunes t
    WHERE t.title = 'The Kesh Jig';
    
    INSERT INTO tune_tags (tune_id, tag_id)
    SELECT t.id, beginner_tag_id
    FROM tunes t
    WHERE t.title = 'The Kesh Jig';
    
    INSERT INTO tune_tags (tune_id, tag_id)
    SELECT t.id, classic_tag_id
    FROM tunes t
    WHERE t.title = 'The Kesh Jig';
END $$;