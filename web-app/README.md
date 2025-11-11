# Irish Tunes Practice Tracker - Web Application

A Next.js web application for tracking your Irish traditional music practice sessions and building your tune repertoire.

## Features

- 📚 **Tune Library** - Store and organize your tunes with ABC notation
- 🎵 **Sheet Music Rendering** - View ABC notation as beautiful sheet music
- 📊 **Practice Tracking** - Track proficiency levels and practice sessions
- 🎼 **Tune Sets** - Create sets of tunes for sessions or performances
- ⭐ **Favorites** - Mark your favorite tunes for quick access
- 📈 **Progress Tracking** - Monitor your learning journey

## Proficiency Levels

1. **Learning** - Just started learning the tune
2. **Practicing** - Working on getting it right
3. **Competent** - Can play it reasonably well
4. **Proficient** - Play it confidently
5. **Mastered** - Know it inside and out

## Setup Instructions

### 1. Install Dependencies

```bash
cd web-app
npm install
```

### 2. Configure Supabase

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the migrations from the `../supabase/migrations` directory in your Supabase SQL editor:
   - `20250110000001_initial_schema.sql`
   - `20250110000002_seed_reference_data.sql`
   - `20250110000003_views_and_functions.sql`

3. Copy the example environment file:
```bash
cp .env.local.example .env.local
```

4. Edit `.env.local` and add your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

You can find these values in your Supabase project settings under "API".

### 3. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
web-app/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout with navigation
│   ├── page.tsx           # Home page
│   ├── globals.css        # Global styles
│   ├── tunes/             # Tunes management
│   │   ├── page.tsx       # List all tunes
│   │   ├── add/
│   │   │   └── page.tsx   # Add new tune
│   │   └── [id]/
│   │       └── page.tsx   # View/edit tune (to be created)
│   ├── sets/              # Tune sets (to be created)
│   │   └── page.tsx
│   └── practice/          # Practice stats (to be created)
│       └── page.tsx
├── components/             # Reusable components
│   ├── Navigation.tsx     # Top navigation bar
│   └── ABCNotationRenderer.tsx # ABC to sheet music
├── lib/                    # Utilities
│   ├── supabase.ts        # Supabase client
│   └── database.types.ts  # TypeScript types
└── public/                 # Static assets
```

## Usage Guide

### Adding a Tune

1. Click "Add New Tune" from the home page or navigation
2. Fill in the basic information:
   - **Title** (required)
   - **Tune Type** (Jig, Reel, etc.)
   - **Key** (D, G, Em, etc.)
   - **Time Signature** (6/8, 4/4, etc.)
   - **Region** (Sligo, Clare, etc.)
   - **Difficulty Level** (1-5)
3. Add ABC notation (optional but recommended for sheet music)
4. Click "Add Tune"

The tune will automatically be added to your practice list with proficiency level "Learning".

### ABC Notation Format

Example ABC notation for "The Kesh Jig":

```abc
X:1
T:The Kesh Jig
R:jig
M:6/8
L:1/8
K:Gmaj
|:G2G GAB|ABA ABd|edd gdd|edB dBA|
G2G GAB|ABA ABd|edd gdd|BAF G3:|
|:BAB dBd|ege dBA|BAB dBG|ABA AGA|
BAB dBd|ege dBA|BAG FGA|BAF G3:|
```

You can find ABC notation for thousands of tunes at [thesession.org](https://thesession.org).

### Managing Practice

- **View All Tunes** - See your complete collection
- **Filter by Status** - "All Tunes", "Currently Practicing", or "Favorites"
- **Track Proficiency** - Update your skill level as you improve
- **Add Notes** - Keep track of trouble spots and learning tips

### Creating Tune Sets

Create sets of tunes that work well together for:
- Session playing
- Performances
- Teaching
- Personal practice routines

## Development

### Build for Production

```bash
npm run build
npm start
```

### Type Checking

The project uses TypeScript with strict mode enabled. Run type checking with:

```bash
npm run type-check
```

## Next Steps

Features to implement:
- [ ] Individual tune detail/edit page
- [ ] Practice session logging
- [ ] Practice statistics dashboard
- [ ] Tune sets management
- [ ] Audio playback with abcjs
- [ ] Search and filtering
- [ ] Import tunes from The Session API
- [ ] Export tunes to PDF
- [ ] User authentication

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [abcjs Documentation](https://paulrosen.github.io/abcjs/)
- [The Session](https://thesession.org) - Source for Irish tunes
- [ABC Notation](https://abcnotation.com) - ABC standard

## License

MIT
