// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import ABCNotationRenderer from '@/components/ABCNotationRenderer'
import { cleanAndCompleteABC } from '@/lib/abc-utils'

type TheSessionTune = {
  id: number
  name: string
  type: string
  settings: Array<{
    id: number
    abc: string
    key: string
    date: string
  }>
}

type TheSessionSet = {
  id: number
  name: string
  url: string
  date: string
}

export default function AddTunePage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<TheSessionTune[]>([])
  const [searching, setSearching] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [youtubeLinks, setYoutubeLinks] = useState<Array<{title: string, url: string, thumbnail: string}>>([])
  const [loadingYoutube, setLoadingYoutube] = useState(false)
  const [sessionSets, setSessionSets] = useState<TheSessionSet[]>([])
  const [loadingSets, setLoadingSets] = useState(false)
  
  const [formData, setFormData] = useState({
    title: '',
    tune_type_id: '',
    key_id: '',
    time_signature: '',
    abc_notation: '',
    notes: '',
    region: '',
    thesession_tune_id: null as number | null,
    to_be_learned: false,
  })
  const [tuneTypes, setTuneTypes] = useState<any[]>([])
  const [musicalKeys, setMusicalKeys] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchReferenceData()
  }, [])

  useEffect(() => {
    if (formData.title.length > 2) {
      const timer = setTimeout(() => {
        searchYouTube(formData.title)
      }, 1000) // Debounce 1 second
      return () => clearTimeout(timer)
    } else {
      setYoutubeLinks([])
    }
  }, [formData.title])

  async function fetchReferenceData() {
    const [typesResult, keysResult] = await Promise.all([
      supabase.from('tune_types').select('*').order('name'),
      supabase.from('musical_keys').select('*').order('display_order'),
    ])

    if (typesResult.data) setTuneTypes(typesResult.data)
    if (keysResult.data) setMusicalKeys(keysResult.data)
  }

  async function searchYouTube(tuneName: string) {
    if (!tuneName.trim()) {
      setYoutubeLinks([])
      return
    }

    setLoadingYoutube(true)
    try {
      // Create direct YouTube search links with different search variations
      const searchVariations = [
        `${tuneName} irish traditional music`,
        `${tuneName} traditional irish tune`,
        `${tuneName} session tune`,
        `${tuneName} slow tutorial`,
        `${tuneName} played on fiddle`,
      ]

      const links = searchVariations.map((query, index) => ({
        title: query,
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
        thumbnail: '', // No thumbnail for search links
      }))

      setYoutubeLinks(links)
    } catch (err) {
      console.error('Error creating YouTube links:', err)
      setYoutubeLinks([])
    } finally {
      setLoadingYoutube(false)
    }
  }

  async function searchTheSession() {
    if (!searchQuery.trim()) return

    setSearching(true)
    setError('')
    try {
      const response = await fetch(
        `https://thesession.org/tunes/search?q=${encodeURIComponent(searchQuery)}&format=json`
      )
      const data = await response.json()
      
      console.log('The Session API response:', data) // Debug log
      
      // The Session returns data in { tunes: [...] } format
      if (data.tunes && Array.isArray(data.tunes)) {
        setSearchResults(data.tunes)
      } else {
        setSearchResults([])
        setError('No tunes found')
      }
    } catch (err) {
      console.error('Error searching The Session:', err)
      setError('Failed to search The Session')
    } finally {
      setSearching(false)
    }
  }

  async function selectTheSessionTune(tune: TheSessionTune) {
    setSearching(true)
    setError('')
    
    try {
      // Fetch full tune details including settings
      const response = await fetch(
        `https://thesession.org/tunes/${tune.id}?format=json`
      )
      const fullTuneData = await response.json()
      
      console.log('Full tune data:', fullTuneData) // Debug log
      
      if (!fullTuneData.settings || fullTuneData.settings.length === 0) {
        setError('This tune has no ABC notation available')
        return
      }

      // Fetch sets that include this tune
      fetchSessionSets(tune.id)

      const firstSetting = fullTuneData.settings[0]
      
      console.log('First setting data:', JSON.stringify(firstSetting, null, 2)) // Debug log with full data
      console.log('Full tune data type:', fullTuneData.type) // Check tune type for meter inference
      
      // Extract time signature - prefer meter field, fallback to ABC notation
      let timeSignature = ''
      
      // First try the meter field from The Session
      if (firstSetting.meter) {
        timeSignature = firstSetting.meter
      }
      
      // If no meter field, try to extract from ABC notation (M: line)
      if (!timeSignature && firstSetting.abc) {
        const meterMatch = firstSetting.abc.match(/M:\s*(\d+\/\d+)/i)
        if (meterMatch) {
          timeSignature = meterMatch[1]
        }
      }
      
      // If still no time signature, infer from tune type
      if (!timeSignature && fullTuneData.type) {
        const tuneTypeLower = fullTuneData.type.toLowerCase()
        if (tuneTypeLower === 'jig') {
          timeSignature = '6/8'
        } else if (tuneTypeLower === 'reel' || tuneTypeLower === 'hornpipe' || tuneTypeLower === 'polka') {
          timeSignature = '4/4'
        } else if (tuneTypeLower === 'slip jig') {
          timeSignature = '9/8'
        } else if (tuneTypeLower === 'waltz') {
          timeSignature = '3/4'
        }
      }
      
      console.log('Time signature:', timeSignature, 'from meter:', firstSetting.meter, 'ABC has M: line:', firstSetting.abc?.includes('M:'), 'inferred from type:', fullTuneData.type)
      
      // Try to find matching tune type
      const tuneType = tuneTypes.find(
        (t) => t.name.toLowerCase() === fullTuneData.type.toLowerCase()
      )
      
      // Try to find matching key - be more flexible with matching
      let matchedKey = null
      if (firstSetting.key) {
        const sessionKey = firstSetting.key.toLowerCase()
        
        // First try exact match
        matchedKey = musicalKeys.find(
          (k) => k.name.toLowerCase() === sessionKey
        )
        
        // If no exact match, extract note (e.g., "Dmixolydian" → "D")
        if (!matchedKey) {
          // Extract the note letter(s) - handle sharps/flats
          const noteMatch = sessionKey.match(/^([a-g][#b]?)/i)
          if (noteMatch) {
            const note = noteMatch[1].toUpperCase()
            
            // Check for mode/quality patterns
            if (sessionKey.includes('mixo') || sessionKey.includes('mixolydian')) {
              matchedKey = musicalKeys.find(k => 
                k.name.toLowerCase().includes(note.toLowerCase()) && 
                k.name.toLowerCase().includes('mixo')
              )
            } else if (sessionKey.includes('dor') || sessionKey.includes('dorian')) {
              matchedKey = musicalKeys.find(k => 
                k.name.toLowerCase().includes(note.toLowerCase()) && 
                k.name.toLowerCase().includes('dor')
              )
            } else if (sessionKey.includes('min') || sessionKey.includes('minor')) {
              matchedKey = musicalKeys.find(k => 
                k.name.toLowerCase().includes(note.toLowerCase()) && 
                k.name.toLowerCase().includes('min')
              )
            }
            
            // If still no match, just match the note
            if (!matchedKey) {
              matchedKey = musicalKeys.find(k => 
                k.name.toLowerCase() === note.toLowerCase() ||
                k.name.toLowerCase().startsWith(note.toLowerCase() + ' ')
              )
            }
          }
        }
        
        console.log('Session key:', firstSetting.key, 'Matched key:', matchedKey)
      }

      setFormData({
        ...formData,
        title: fullTuneData.name,
        tune_type_id: tuneType?.id ? String(tuneType.id) : '',
        key_id: matchedKey?.id ? String(matchedKey.id) : '',
        time_signature: timeSignature,
        abc_notation: cleanAndCompleteABC(
          firstSetting.abc || '',
          fullTuneData.name,
          firstSetting.key,
          firstSetting.meter
        ),
        thesession_tune_id: fullTuneData.id,
        notes: `Imported from The Session (tune #${fullTuneData.id})${firstSetting.key ? `\nOriginal key: ${firstSetting.key}` : ''}`,
      })
      
      setShowSearch(false)
      setSearchResults([])
      setSearchQuery('')
    } catch (err) {
      console.error('Error fetching tune details:', err)
      setError('Failed to load tune details from The Session')
    } finally {
      setSearching(false)
    }
  }

  async function fetchSessionSets(tuneId: number) {
    setLoadingSets(true)
    try {
      const response = await fetch(
        `https://thesession.org/tunes/${tuneId}/sets?format=json`
      )
      const data = await response.json()
      
      if (data.sets && Array.isArray(data.sets)) {
        setSessionSets(data.sets.map((set: any) => ({
          id: set.id,
          name: set.name,
          url: set.url,
          date: set.date
        })))
      } else {
        setSessionSets([])
      }
    } catch (err) {
      console.error('Error fetching sets from The Session:', err)
      setSessionSets([])
    } finally {
      setLoadingSets(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('You must be logged in to add tunes')
        setLoading(false)
        return
      }

      const { data: tune, error: tuneError } = await supabase
        .from('tunes')
        .insert([
          {
            title: formData.title,
            tune_type_id: formData.tune_type_id || null,
            key_id: formData.key_id || null,
            time_signature: formData.time_signature || null,
            abc_notation: formData.abc_notation || null,
            notes: formData.notes || null,
            region: formData.region || null,
            thesession_tune_id: formData.thesession_tune_id,
            to_be_learned: formData.to_be_learned,
            user_id: user.id,
          },
        ])
        .select()
        .single()

      if (tuneError) throw tuneError

      router.push(`/tunes/${(tune as any).id}`)
    } catch (err: any) {
      setError(err.message || 'Failed to add tune')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">Add New Tune</h1>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* The Session Search */}
      <div className="mb-6 bg-gradient-to-r from-irish-green-50 to-blue-50 p-6 rounded-lg border border-irish-green-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold text-gray-900">
            🔍 Search The Session
          </h2>
          <button
            type="button"
            onClick={() => setShowSearch(!showSearch)}
            className="text-sm text-irish-green-600 hover:text-irish-green-700 font-medium"
          >
            {showSearch ? 'Hide' : 'Show'} Search
          </button>
        </div>
        
        {showSearch && (
          <div>
            <p className="text-sm text-gray-600 mb-3">
              Search thousands of Irish tunes from TheSession.org and import them instantly
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchTheSession()}
                placeholder="e.g., The Kesh Jig"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-irish-green-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={searchTheSession}
                disabled={searching || !searchQuery.trim()}
                className="px-6 py-2 bg-irish-green-600 text-white rounded-lg hover:bg-irish-green-700 transition-colors font-medium disabled:opacity-50"
              >
                {searching ? 'Searching...' : 'Search'}
              </button>
            </div>

            {searchResults.length > 0 && (
              <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
                {searchResults.map((tune) => (
                  <button
                    key={tune.id}
                    type="button"
                    onClick={() => selectTheSessionTune(tune)}
                    className="w-full text-left p-4 bg-white rounded-lg border border-gray-200 hover:border-irish-green-400 hover:shadow-md transition-all"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-gray-900">{tune.name}</h3>
                        <p className="text-sm text-gray-600">
                          {tune.type}
                          {tune.settings && tune.settings.length > 0 && (
                            <>
                              {' • '}{tune.settings.length} setting{tune.settings.length !== 1 ? 's' : ''}
                              {tune.settings[0]?.key && ` • Key: ${tune.settings[0].key}`}
                            </>
                          )}
                        </p>
                      </div>
                      <span className="text-xs text-gray-500">#{tune.id}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
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
                placeholder="e.g., The Kesh Jig"
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
                  onChange={(e) => setFormData({ ...formData, key_id: e.target.value })}
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
                  placeholder="e.g., 6/8"
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
                placeholder="e.g., Sligo, Clare"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-irish-green-500 focus:border-transparent"
                placeholder="Any notes about this tune..."
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="to_be_learned"
                checked={formData.to_be_learned}
                onChange={(e) => setFormData({ ...formData, to_be_learned: e.target.checked })}
                className="w-4 h-4 text-irish-green-600 border-gray-300 rounded focus:ring-irish-green-500"
              />
              <label htmlFor="to_be_learned" className="text-sm font-medium text-gray-700 cursor-pointer">
                Mark as "To be learned" (tune not yet learned)
              </label>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">ABC Notation</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ABC Notation
              </label>
              <textarea
                value={formData.abc_notation}
                onChange={(e) =>
                  setFormData({ ...formData, abc_notation: e.target.value })
                }
                rows={10}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-irish-green-500 focus:border-transparent font-mono text-sm"
                placeholder={`X:1\nT:Tune Title\nR:jig\nM:6/8\nL:1/8\nK:Gmaj\n|:G2G GAB|ABA ABd|...`}
              />
            </div>

            {formData.abc_notation && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Preview:</h3>
                <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                  <ABCNotationRenderer abc={formData.abc_notation} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* YouTube Links */}
        {formData.title && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">🎥 YouTube Videos</h2>
            {loadingYoutube ? (
              <div className="text-center py-8">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-irish-green-600 border-r-transparent"></div>
                <p className="mt-2 text-sm text-gray-600">Preparing YouTube searches...</p>
              </div>
            ) : youtubeLinks.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 mb-3">
                  Click any link below to search YouTube for "{formData.title}":
                </p>
                {youtubeLinks.map((link, index) => (
                  <a
                    key={index}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-irish-green-300 hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex-shrink-0 w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-sm font-medium">
                        ▶
                      </span>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          Search: {link.title}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-irish-green-600 font-medium group-hover:text-irish-green-700">
                      Open YouTube →
                    </span>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm py-4">
                Enter a tune name above to get YouTube search links.
              </p>
            )}
          </div>
        )}

        {/* The Session Sets */}
        {formData.thesession_tune_id && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">📚 Sets on The Session</h2>
            {loadingSets ? (
              <div className="text-center py-8">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-irish-green-600 border-r-transparent"></div>
                <p className="mt-2 text-sm text-gray-600">Loading sets...</p>
              </div>
            ) : sessionSets.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-gray-600 mb-3">
                  This tune appears in {sessionSets.length} set{sessionSets.length !== 1 ? 's' : ''} on The Session:
                </p>
                {sessionSets.map((set) => (
                  <a
                    key={set.id}
                    href={set.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-irish-green-300 hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-medium">
                        🎵
                      </span>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          {set.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          Added {new Date(set.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-irish-green-600 font-medium group-hover:text-irish-green-700">
                      View on The Session →
                    </span>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm py-4">
                This tune is not in any sets on The Session.
              </p>
            )}
          </div>
        )}

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-6 py-3 bg-irish-green-600 text-white rounded-lg hover:bg-irish-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Adding Tune...' : 'Add Tune'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
