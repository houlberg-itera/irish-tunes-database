// @ts-nocheck
'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import ABCNotationRenderer from '@/components/ABCNotationRenderer'
import abcjs from 'abcjs'

export default function EditTunePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [transposeSteps, setTransposeSteps] = useState(0)
  const [originalKeyId, setOriginalKeyId] = useState('')
  const [formData, setFormData] = useState({
    title: '',
    tune_type_id: '',
    key_id: '',
    time_signature: '',
    abc_notation: '',
    notes: '',
    region: '',
  })
  const [tuneTypes, setTuneTypes] = useState<any[]>([])
  const [musicalKeys, setMusicalKeys] = useState<any[]>([])

  useEffect(() => {
    fetchData()
  }, [id])

  async function fetchData() {
    try {
      // Fetch reference data
      const [typesResult, keysResult] = await Promise.all([
        supabase.from('tune_types').select('*').order('name'),
        supabase.from('musical_keys').select('*').order('display_order'),
      ])

      if (typesResult.data) setTuneTypes(typesResult.data)
      if (keysResult.data) setMusicalKeys(keysResult.data)

      // Fetch tune data
      const { data: tune, error } = await supabase
        .from('tunes')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error

      setOriginalKeyId(tune.key_id || '')
      setFormData({
        title: tune.title || '',
        tune_type_id: tune.tune_type_id || '',
        key_id: tune.key_id || '',
        time_signature: tune.time_signature || '',
        abc_notation: tune.abc_notation || '',
        notes: tune.notes || '',
        region: tune.region || '',
      })
    } catch (error) {
      console.error('Error fetching data:', error)
      alert('Failed to load tune')
    } finally {
      setLoading(false)
    }
  }

  function getKeyTranspositionSteps(fromKeyId: string, toKeyId: string): number {
    if (!fromKeyId || !toKeyId || fromKeyId === toKeyId) return 0
    if (!musicalKeys || musicalKeys.length === 0) return 0

    // Map key names to semitone offsets from C
    const keyToSemitones: { [key: string]: number } = {
      'C': 0, 'C Maj': 0, 'A Min': 0, 'A minor': 0,
      'C#': 1, 'Db': 1, 'A# Min': 1, 'Bb Min': 1,
      'D': 2, 'D Maj': 2, 'B Min': 2, 'B minor': 2,
      'D#': 3, 'Eb': 3, 'C Min': 3, 'C minor': 3,
      'E': 4, 'E Maj': 4, 'C# Min': 4, 'Db Min': 4,
      'F': 5, 'F Maj': 5, 'D Min': 5, 'D minor': 5,
      'F#': 6, 'Gb': 6, 'D# Min': 6, 'Eb Min': 6,
      'G': 7, 'G Maj': 7, 'E Min': 7, 'E minor': 7,
      'G#': 8, 'Ab': 8, 'F Min': 8, 'F minor': 8,
      'A': 9, 'A Maj': 9, 'F# Min': 9, 'Gb Min': 9,
      'A#': 10, 'Bb': 10, 'G Min': 10, 'G minor': 10,
      'B': 11, 'B Maj': 11, 'G# Min': 11, 'Ab Min': 11,
      // Modes
      'D Dorian': 2, 'D Dor': 2,
      'E Dorian': 4, 'E Dor': 4,
      'G Mixolydian': 7, 'G Mixo': 7,
      'A Dorian': 9, 'A Dor': 9,
      'D Mixolydian': 2, 'D Mixo': 2,
      'E Mixolydian': 4, 'E Mixo': 4,
      'A Mixolydian': 9, 'A Mixo': 9,
    }

    const fromKey = musicalKeys.find(k => k.id === fromKeyId)
    const toKey = musicalKeys.find(k => k.id === toKeyId)

    if (!fromKey || !toKey) return 0

    const fromSemitones = keyToSemitones[fromKey.name] ?? 0
    const toSemitones = keyToSemitones[toKey.name] ?? 0

    return toSemitones - fromSemitones
  }

  function handleKeyChange(newKeyId: string) {
    // If no ABC or keys data not loaded, just update the key
    if (!formData.abc_notation || musicalKeys.length === 0) {
      setFormData({ ...formData, key_id: newKeyId })
      return
    }

    // If no original key set, just update
    if (!originalKeyId || !newKeyId) {
      setFormData({ ...formData, key_id: newKeyId })
      if (newKeyId && !originalKeyId) {
        setOriginalKeyId(newKeyId)
      }
      return
    }

    const steps = getKeyTranspositionSteps(originalKeyId, newKeyId)
    console.log('Transposing from', originalKeyId, 'to', newKeyId, '=', steps, 'steps')
    
    if (steps !== 0) {
      try {
        // Use abcjs's built-in transpose by recreating the tune with transpose applied
        const parsed = abcjs.parseOnly(formData.abc_notation, { 
          visualTranspose: steps 
        })
        
        if (parsed && parsed.length > 0 && parsed[0].lines) {
          // Rebuild ABC from the transposed tune object
          let newAbc = ''
          
          for (const line of parsed[0].lines) {
            if (line.staff) {
              // Music line - extract the transposed notes
              for (const voice of line.staff) {
                if (voice.voices) {
                  for (const v of voice.voices) {
                    for (const note of v) {
                      if (note.el_type === 'note') {
                        // This is a note - it's already transposed in the parsed object
                        // We need to convert it back to ABC
                      }
                    }
                  }
                }
              }
            }
          }
          
          // Actually, let's use a different approach - manually transpose the notes
          const transposedAbc = transposeAbcString(formData.abc_notation, steps, newKeyId)
          if (transposedAbc) {
            setFormData({ ...formData, key_id: newKeyId, abc_notation: transposedAbc })
            setOriginalKeyId(newKeyId)
            return
          }
        }
      } catch (error) {
        console.log('Transpose error:', error)
      }
    }
    
    // If no transposition needed or failed, just update key
    setFormData({ ...formData, key_id: newKeyId })
    setOriginalKeyId(newKeyId)
  }

  function transposeAbcString(abc: string, steps: number, newKeyId: string): string | null {
    try {
      const lines = abc.split('\n')
      const transposedLines = []
      
      // Get current key from ABC
      let currentKeyLine = lines.find(l => l.startsWith('K:'))
      let currentKey = currentKeyLine ? currentKeyLine.substring(2).trim() : 'C'
      
      // Get key signatures (sharps/flats for each key)
      const keySignatures: { [key: string]: { [note: string]: number } } = {
        'C': {}, 'C Maj': {}, 'A Min': {}, 'A minor': {},
        'G': { F: 1 }, 'G Maj': { F: 1 }, 'E Min': { F: 1 }, 'E minor': { F: 1 },
        'D': { F: 1, C: 1 }, 'D Maj': { F: 1, C: 1 }, 'B Min': { F: 1, C: 1 }, 'B minor': { F: 1, C: 1 },
        'A': { F: 1, C: 1, G: 1 }, 'A Maj': { F: 1, C: 1, G: 1 }, 'F# Min': { F: 1, C: 1, G: 1 },
        'E': { F: 1, C: 1, G: 1, D: 1 }, 'E Maj': { F: 1, C: 1, G: 1, D: 1 },
        'B': { F: 1, C: 1, G: 1, D: 1, A: 1 }, 'B Maj': { F: 1, C: 1, G: 1, D: 1, A: 1 },
        'F': { B: -1 }, 'F Maj': { B: -1 }, 'D Min': { B: -1 }, 'D minor': { B: -1 },
        'Bb': { B: -1, E: -1 }, 'Bb Maj': { B: -1, E: -1 }, 'G Min': { B: -1, E: -1 }, 'G minor': { B: -1, E: -1 },
        'Eb': { B: -1, E: -1, A: -1 }, 'Eb Maj': { B: -1, E: -1, A: -1 },
        'Ab': { B: -1, E: -1, A: -1, D: -1 }, 'Ab Maj': { B: -1, E: -1, A: -1, D: -1 },
        // Modes
        'D Dor': { B: -1 }, 'D Dorian': { B: -1 },
        'E Dor': { F: 1 }, 'E Dorian': { F: 1 },
        'G Mixo': {}, 'G Mixolydian': {}, 'G Mixolydian': { F: 1 },
        'A Dor': { F: 1, C: 1 }, 'A Dorian': { F: 1, C: 1 },
        'D Mixo': {}, 'D Mixolydian': {},
        'E Mixo': { F: 1 }, 'E Mixolydian': { F: 1 },
        'A Mixo': { F: 1, C: 1 }, 'A Mixolydian': { F: 1, C: 1 },
      }
      
      const currentKeySig = keySignatures[currentKey] || {}
      
      // Get new key
      const newKey = musicalKeys.find(k => k.id === newKeyId)
      const newKeySig = keySignatures[newKey?.name || 'C'] || {}
      
      // Chromatic scale
      const chromaticScale = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
      
      function getNoteValue(noteLetter: string, accidental: string, keySig: any): number {
        // Get base semitone value
        const baseValues: { [key: string]: number } = {
          'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11
        }
        
        let semitone = baseValues[noteLetter.toUpperCase()] || 0
        
        // Apply key signature
        const keySigMod = keySig[noteLetter.toUpperCase()] || 0
        
        // Apply explicit accidental (overrides key signature)
        if (accidental === '^') semitone += 1
        else if (accidental === '^^') semitone += 2
        else if (accidental === '_') semitone -= 1
        else if (accidental === '__') semitone -= 2
        else if (accidental === '=') semitone += 0 // natural - no key sig
        else semitone += keySigMod // apply key signature
        
        return semitone
      }
      
      function semitoneToNote(semitone: number, preferSharps: boolean): { note: string, accidental: string } {
        // Normalize to 0-11
        while (semitone < 0) semitone += 12
        while (semitone >= 12) semitone -= 12
        
        const noteNames = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
        const semitoneMap = [0, 2, 4, 5, 7, 9, 11]
        
        // Find exact match
        const exactIndex = semitoneMap.indexOf(semitone)
        if (exactIndex >= 0) {
          return { note: noteNames[exactIndex], accidental: '' }
        }
        
        // Need accidental
        if (preferSharps) {
          // Use sharp
          const baseIndex = semitoneMap.findIndex(s => s === semitone - 1)
          if (baseIndex >= 0) {
            return { note: noteNames[baseIndex], accidental: '^' }
          }
        } else {
          // Use flat
          const baseIndex = semitoneMap.findIndex(s => s === semitone + 1)
          if (baseIndex >= 0) {
            return { note: noteNames[baseIndex], accidental: '_' }
          }
        }
        
        // Fallback
        return { note: 'C', accidental: '' }
      }
      
      // Determine if new key prefers sharps or flats
      const preferSharps = (newKey?.name || '').includes('#') || 
                          ['G', 'D', 'A', 'E', 'B'].some(k => (newKey?.name || '').startsWith(k))
      
      for (let line of lines) {
        if (line.startsWith('K:')) {
          // Update key
          transposedLines.push(`K:${newKey?.name || 'C'}`)
        } else if (line.match(/^[A-Z]:/) || line.trim() === '') {
          // Header or empty line - keep as is
          transposedLines.push(line)
        } else {
          // Music line - transpose notes
          let transposedLine = ''
          let i = 0
          
          while (i < line.length) {
            const char = line[i]
            
            // Check if this is a note
            if (/[A-Ga-g]/.test(char)) {
              // Extract accidental (look backward)
              let accidental = ''
              let j = i - 1
              while (j >= 0 && /[\^_=]/.test(line[j])) {
                accidental = line[j] + accidental
                j--
              }
              
              const isLower = char === char.toLowerCase()
              const noteLetter = char.toUpperCase()
              
              // Calculate current semitone value
              let semitone = getNoteValue(noteLetter, accidental, currentKeySig)
              
              // Extract octave info from following characters
              let octaveChars = ''
              let k = i + 1
              while (k < line.length && (line[k] === ',' || line[k] === "'")) {
                octaveChars += line[k]
                k++
              }
              
              // Adjust for octave notation in ABC (lowercase = higher, uppercase = lower)
              let octaveOffset = 0
              if (isLower) {
                octaveOffset = 1 // lowercase notes are one octave higher
                octaveOffset += octaveChars.split("'").length - 1 // each ' adds an octave
                octaveOffset -= octaveChars.split(',').length - 1 // each , removes an octave
              } else {
                octaveOffset = 0
                octaveOffset -= octaveChars.split(',').length - 1 // each , removes an octave
                octaveOffset += octaveChars.split("'").length - 1 // each ' adds an octave
              }
              
              // Transpose
              semitone += steps
              
              // Handle octave wrapping
              while (semitone < 0) {
                semitone += 12
                octaveOffset--
              }
              while (semitone >= 12) {
                semitone -= 12
                octaveOffset++
              }
              
              // Get new note
              const { note: newNote, accidental: newAccidental } = semitoneToNote(semitone, preferSharps)
              
              // Determine new octave notation
              let finalNote = ''
              let finalOctave = ''
              
              if (octaveOffset >= 1) {
                // Use lowercase with possible apostrophes
                finalNote = newNote.toLowerCase()
                if (octaveOffset > 1) finalOctave = "'".repeat(octaveOffset - 1)
              } else if (octaveOffset === 0) {
                // Use uppercase
                finalNote = newNote
              } else {
                // Use uppercase with commas
                finalNote = newNote
                finalOctave = ','.repeat(-octaveOffset)
              }
              
              // Build transposed note
              transposedLine += newAccidental + finalNote + finalOctave
              
              // Skip the octave characters we already processed
              i = k - 1
            } else if (!/[\^_=]/.test(char)) {
              // Not an accidental, keep as is
              transposedLine += char
            }
            // Skip accidentals that are followed by notes (they're handled with the note)
            else if (i + 1 < line.length && /[A-Ga-g]/.test(line[i + 1])) {
              // This accidental will be handled with its note, skip it
            } else {
              // Standalone accidental character
              transposedLine += char
            }
            
            i++
          }
          
          transposedLines.push(transposedLine)
        }
      }
      
      return transposedLines.join('\n')
    } catch (error) {
      console.log('Manual transpose error:', error)
      return null
    }
  }

  function handleTranspose(steps: number) {
    if (!formData.abc_notation || steps === 0) {
      setTransposeSteps(0)
      return
    }

    try {
      const parsed = abcjs.parseOnly(formData.abc_notation)
      if (parsed && parsed.length > 0) {
        const transposedAbc = abcjs.transpose(parsed[0], { steps })
        if (transposedAbc) {
          setFormData({ ...formData, abc_notation: transposedAbc })
          setTransposeSteps(0)
        }
      }
    } catch (error) {
      alert('Failed to transpose ABC notation')
      setTransposeSteps(0)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      const { error } = await supabase
        .from('tunes')
        .update({
          title: formData.title,
          tune_type_id: formData.tune_type_id || null,
          key_id: formData.key_id || null,
          time_signature: formData.time_signature || null,
          abc_notation: formData.abc_notation || null,
          notes: formData.notes || null,
          region: formData.region || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (error) throw error

      router.push(`/tunes/${id}`)
    } catch (error) {
      console.error('Error updating tune:', error)
      alert('Failed to update tune')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-irish-green-600 border-r-transparent"></div>
        <p className="mt-4 text-gray-600">Loading tune...</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Edit Tune</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Basic Information</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tune Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-irish-green-500 focus:border-transparent"
              />
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tune Type
                </label>
                <select
                  value={formData.tune_type_id}
                  onChange={(e) =>
                    setFormData({ ...formData, tune_type_id: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-irish-green-500 focus:border-transparent"
                >
                  <option value="">Select type...</option>
                  {tuneTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Key
                </label>
                <select
                  value={formData.key_id}
                  onChange={(e) => handleKeyChange(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-irish-green-500 focus:border-transparent"
                >
                  <option value="">Select key...</option>
                  {musicalKeys.map((key) => (
                    <option key={key.id} value={key.id}>
                      {key.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time Signature
                </label>
                <input
                  type="text"
                  value={formData.time_signature}
                  onChange={(e) =>
                    setFormData({ ...formData, time_signature: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-irish-green-500 focus:border-transparent"
                  placeholder="e.g., 6/8, 4/4"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Region
              </label>
              <input
                type="text"
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-irish-green-500 focus:border-transparent"
                placeholder="e.g., Ireland, Scotland"
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">ABC Notation</h2>
          <textarea
            value={formData.abc_notation}
            onChange={(e) => setFormData({ ...formData, abc_notation: e.target.value })}
            rows={10}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-irish-green-500 focus:border-transparent font-mono text-sm"
            placeholder="Enter ABC notation..."
          />
          {formData.abc_notation && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Preview:</h3>
              <div className="bg-gray-50 p-4 rounded-lg overflow-x-auto">
                <ABCNotationRenderer abc={formData.abc_notation} />
              </div>
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Notes</h2>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-irish-green-500 focus:border-transparent"
            placeholder="Additional notes about this tune..."
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-irish-green-600 text-white rounded-lg hover:bg-irish-green-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <Link
            href={`/tunes/${id}`}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium text-center"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
