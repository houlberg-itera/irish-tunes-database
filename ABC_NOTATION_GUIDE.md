# ABC Notation and Sheet Music Rendering

## Overview

This database stores tunes in ABC notation format, which can be rendered as sheet music in your application.

## What is ABC Notation?

ABC notation is a text-based music notation system that's widely used for folk and traditional music. It's compact, human-readable, and perfect for storing in databases.

### Example ABC Notation

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

## JavaScript Libraries for Rendering ABC to Sheet Music

### 1. **abcjs** (Recommended)
The most popular and actively maintained library.

**Installation:**
```bash
npm install abcjs
```

**Basic Usage (React):**
```jsx
import React, { useEffect, useRef } from 'react';
import abcjs from 'abcjs';

function SheetMusic({ abcNotation }) {
  const paperRef = useRef(null);

  useEffect(() => {
    if (paperRef.current && abcNotation) {
      abcjs.renderAbc(paperRef.current, abcNotation, {
        responsive: 'resize',
        staffwidth: 740,
      });
    }
  }, [abcNotation]);

  return <div ref={paperRef}></div>;
}

export default SheetMusic;
```

**Advanced Features:**
```jsx
// With playback controls
import abcjs from 'abcjs';

function InteractiveSheetMusic({ abcNotation }) {
  const visualObj = abcjs.renderAbc("paper", abcNotation, {
    responsive: 'resize'
  })[0];

  // Add audio playback
  const synthControl = new abcjs.synth.SynthController();
  synthControl.load("#audio", null, {
    displayLoop: true,
    displayRestart: true,
    displayPlay: true,
    displayProgress: true,
    displayWarp: true
  });

  synthControl.setTune(visualObj, false);

  return (
    <div>
      <div id="paper"></div>
      <div id="audio"></div>
    </div>
  );
}
```

**CDN (for simple HTML):**
```html
<script src="https://cdn.jsdelivr.net/npm/abcjs@latest/dist/abcjs-basic-min.js"></script>
<div id="paper"></div>
<script>
  const abc = `X:1
T:Example Tune
M:4/4
L:1/8
K:D
|:D2F2 A2d2|f4 e4|...`;
  
  ABCJS.renderAbc("paper", abc);
</script>
```

### 2. **abc2svg**
Another solid option with good SVG rendering.

**Installation:**
```bash
npm install abc2svg
```

### 3. **VexFlow** (with ABC parser)
More complex but highly customizable.

## Features to Implement in Your Application

### Essential Features:
1. **Display Sheet Music** - Render ABC notation as readable sheet music
2. **Transpose** - Change key on the fly
3. **Playback** - Audio playback of the tune (abcjs supports this)
4. **Print** - Export to PDF or print directly
5. **Mobile Responsive** - Adjust staff width for different screens

### Advanced Features:
1. **Annotations** - Mark trouble spots on the sheet music
2. **Loop Sections** - Practice specific parts
3. **Tempo Control** - Slow down for practice
4. **Metronome** - Built-in click track
5. **MIDI Export** - Export to MIDI file
6. **Multi-voice** - Display harmony parts

## Example Implementation (Next.js/React)

```jsx
// components/TuneSheet.jsx
'use client';
import { useEffect, useRef, useState } from 'react';
import abcjs from 'abcjs';

export default function TuneSheet({ tune }) {
  const paperRef = useRef(null);
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [synthControl, setSynthControl] = useState(null);

  useEffect(() => {
    if (paperRef.current && tune.abc_notation) {
      // Render the sheet music
      const visualObj = abcjs.renderAbc(paperRef.current, tune.abc_notation, {
        responsive: 'resize',
        staffwidth: 740,
        scale: 1.2,
        paddingleft: 15,
        paddingright: 15,
      })[0];

      // Set up audio playback
      if (audioRef.current && abcjs.synth.supportsAudio()) {
        const control = new abcjs.synth.SynthController();
        control.load(audioRef.current, null, {
          displayLoop: true,
          displayRestart: true,
          displayPlay: true,
          displayProgress: true,
          displayWarp: true,
        });
        control.setTune(visualObj, false);
        setSynthControl(control);
      }
    }
  }, [tune.abc_notation]);

  return (
    <div className="tune-sheet">
      <div className="tune-header">
        <h2>{tune.title}</h2>
        <p>
          {tune.tune_type} in {tune.key} - {tune.time_signature}
        </p>
      </div>
      
      <div ref={paperRef} className="sheet-music"></div>
      
      {abcjs.synth.supportsAudio() && (
        <div ref={audioRef} className="audio-controls"></div>
      )}
      
      <style jsx>{`
        .tune-sheet {
          padding: 20px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .sheet-music {
          margin: 20px 0;
          overflow-x: auto;
        }
        .audio-controls {
          margin-top: 20px;
        }
      `}</style>
    </div>
  );
}
```

## Mobile Considerations

For mobile apps, consider:
- **React Native**: Use `react-native-webview` with abcjs in HTML
- **Responsive sizing**: Adjust staff width based on screen size
- **Touch controls**: Larger buttons for playback controls
- **Offline support**: Cache rendered SVGs

## API Integration with The Session

When fetching from The Session API, their tune data includes ABC notation:

```javascript
// Example: Fetch tune from The Session
async function fetchTuneFromTheSession(tuneId) {
  const response = await fetch(
    `https://thesession.org/tunes/${tuneId}?format=json`
  );
  const data = await response.json();
  
  // The Session provides settings (versions) of tunes
  const firstSetting = data.settings[0];
  const abcNotation = firstSetting.abc;
  
  return {
    title: data.name,
    tune_type: data.type,
    abc_notation: abcNotation,
    thesession_tune_id: data.id,
  };
}
```

## Resources

- **abcjs Documentation**: https://paulrosen.github.io/abcjs/
- **ABC Notation Standard**: https://abcnotation.com/
- **The Session ABC Examples**: https://thesession.org/tunes/
- **ABC Tutorial**: https://abcnotation.com/learn

## Next Steps

1. Install `abcjs` in your frontend application
2. Create a component to render ABC notation
3. Add playback controls for practice
4. Implement transposition for different instruments
5. Add tempo control for slower practice sessions
