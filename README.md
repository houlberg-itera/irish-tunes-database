# Irish Tunes Database

A comprehensive database for cataloging and managing Irish traditional music tunes, built with Supabase.

## Overview

This project provides a structured database schema for storing Irish traditional music tunes, including:
- Tune metadata (title, type, key, mode)
- Composers and sources
- ABC notation and sheet music
- Recordings and references
- Sets and collections

## Database Schema

The database includes the following main tables:

### Core Tables
- **tunes** - Main table storing tune information
- **tune_types** - Types of tunes (jig, reel, hornpipe, etc.)
- **musical_keys** - Musical keys (D, G, Em, etc.)
- **composers** - Composers and tune writers
- **sources** - Books, collections, and other sources

### Supporting Tables
- **tune_recordings** - Links to recordings of tunes
- **tune_aliases** - Alternative names for tunes
- **tune_sets** - Groups of tunes commonly played together
- **tune_tags** - Flexible tagging system

## Setup

### Prerequisites
- Supabase account
- Supabase CLI installed (`npm install -g supabase`)

### Database Setup

1. Link your Supabase project:
```bash
supabase link --project-ref kjlnvwajrnaqfqksabgb
```

2. Run the migrations:
```bash
supabase db push
```

Or manually run the SQL files in order from the `supabase/migrations/` directory.

## Schema Details

### Tunes Table
The main `tunes` table stores:
- Title and alternative titles
- Tune type (jig, reel, etc.)
- Key and mode
- Time signature
- ABC notation
- Composer information
- Source references
- Difficulty rating
- Popularity metrics

### ABC Notation
Tunes can be stored in ABC notation format, which is a text-based music notation system widely used for traditional music.

## Usage Examples

### Adding a Tune
```sql
INSERT INTO tunes (title, tune_type_id, key_id, abc_notation, time_signature)
VALUES (
  'The Kesh Jig',
  (SELECT id FROM tune_types WHERE name = 'Jig'),
  (SELECT id FROM musical_keys WHERE name = 'G'),
  'X:1\nT:The Kesh Jig\nM:6/8\nL:1/8\nK:Gmaj\n...',
  '6/8'
);
```

### Finding Reels in D
```sql
SELECT t.title, tk.name as key, tt.name as type
FROM tunes t
JOIN musical_keys tk ON t.key_id = tk.id
JOIN tune_types tt ON t.tune_type_id = tt.id
WHERE tt.name = 'Reel' AND tk.name = 'D';
```

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

MIT License - feel free to use this schema for your own Irish tune database.