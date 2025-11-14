// @ts-nocheck
'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import ABCNotationRenderer from '@/components/ABCNotationRenderer'
import Link from 'next/link'
import abcjs from 'abcjs'

type Tune = {
  id: string
  title: string
  tune_type?: { name: string }
  musical_key?: { name: string }
  time_signature?: string
  abc_notation?: string
  difficulty_level?: number
  notes?: string
  region?: string
  thesession_tune_id?: number
}

type TheSessionSet = {
  id: number
  name: string
  url: string
  date: string
}

export default function TuneDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [tune, setTune] = useState<Tune | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [transposeSteps, setTransposeSteps] = useState(0)
  const [transposedAbc, setTransposedAbc] = useState<string | null>(null)
  const [youtubeLinks, setYoutubeLinks] = useState<Array<{title: string, url: string}>>([])
  const [showYouTube, setShowYouTube] = useState(false)
  const [tuneSets, setTuneSets] = useState<Array<{id: string, name: string, position: number}>>([])
  const [sessionSets, setSessionSets] = useState<TheSessionSet[]>([])
  const [loadingSessionSets, setLoadingSessionSets] = useState(false)

  useEffect(() => {
    fetchTune()
    fetchTuneSets()
  }, [id])

  useEffect(() => {
    if (tune?.abc_notation) {
      transposeAbc()
    }
  }, [transposeSteps, tune?.abc_notation])

  useEffect(() => {
    if (tune?.title) {
      generateYouTubeLinks(tune.title)
    }
  }, [tune?.title])

  useEffect(() => {
    if (tune?.thesession_tune_id) {
      fetchSessionSets(tune.thesession_tune_id)
    }
  }, [tune?.thesession_tune_id])

  function transposeAbc() {
    if (!tune?.abc_notation || transposeSteps === 0) {
      setTransposedAbc(null)
      return
    }

    try {
      const tuneBook = abcjs.parseOnly(tune.abc_notation)
      if (tuneBook && tuneBook[0]) {
        const transposed = abcjs.transpose(tuneBook[0], transposeSteps)
        setTransposedAbc(transposed)
      }
    } catch (error) {
      console.error('Error transposing ABC:', error)
      setTransposedAbc(null)
    }
  }

  const handleTransposeChange = (steps: number) => {
    setTransposeSteps(steps)
  }

  function generateYouTubeLinks(tuneName: string) {
    const searchVariations = [
      `${tuneName} irish traditional music`,
      `${tuneName} traditional irish tune`,
      `${tuneName} session tune`,
      `${tuneName} slow tutorial`,
      `${tuneName} played on fiddle`,
    ]

    const links = searchVariations.map((query) => ({
      title: query,
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
    }))

    setYoutubeLinks(links)
  }

  async function fetchTuneSets() {
    try {
      const { data, error } = await supabase
        .from('tune_set_items')
        .select(`
          position,
          tune_sets(id, name)
        `)
        .eq('tune_id', id)
        .order('position')

      if (error) throw error

      const sets = data
        ?.filter(item => item.tune_sets)
        .map(item => ({
          id: item.tune_sets.id,
          name: item.tune_sets.name,
          position: item.position
        })) || []

      setTuneSets(sets)
    } catch (error) {
      console.error('Error fetching tune sets:', error)
    }
  }

  async function fetchSessionSets(tuneId: number) {
    setLoadingSessionSets(true)
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
      setLoadingSessionSets(false)
    }
  }

  async function fetchTune() {
    try {
      const { data: tuneData, error: tuneError } = await supabase
        .from('tunes')
        .select(`
          *,
          tune_types(name),
          musical_keys(name)
        `)
        .eq('id', id)
        .single()

      if (tuneError) throw tuneError

      setTune({
        ...tuneData,
        tune_type: tuneData.tune_types,
        musical_key: tuneData.musical_keys,
      })
    } catch (error) {
      console.error('Error fetching tune:', error)
    } finally {
      setLoading(false)
    }
  }

  async function deleteTune() {
    if (!confirm(`Are you sure you want to delete "${tune?.title}"? This cannot be undone.`)) {
      return
    }

    try {
      setDeleting(true)

      const { error } = await supabase
        .from('tunes')
        .delete()
        .eq('id', id)

      if (error) throw error

      router.push('/tunes')
    } catch (error) {
      console.error('Error deleting tune:', error)
      alert('Failed to delete tune')
      setDeleting(false)
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

  if (!tune) {
    return (
      <div className="text-center py-12">
        <p className="text-xl text-gray-600 mb-4">Tune not found</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">{tune.title}</h1>
            <div className="flex flex-wrap gap-3 sm:gap-4 text-sm sm:text-base text-gray-600">
              {tune.tune_type && <span>🎵 {tune.tune_type.name}</span>}
              {tune.musical_key && <span>🎹 {tune.musical_key.name}</span>}
              {tune.time_signature && <span>⏱️ {tune.time_signature}</span>}
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Link
              href={`/tunes/${id}/edit`}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
            >
              ✏️ Edit
            </Link>
            <button
              onClick={deleteTune}
              disabled={deleting}
              className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium disabled:opacity-50"
            >
              🗑️ Delete
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Main Content */}
        <div className="space-y-6">
          {/* Sheet Music */}
          {tune.abc_notation && (
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Sheet Music</h2>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Transpose:</label>
                  <select
                    value={transposeSteps}
                    onChange={(e) => handleTransposeChange(Number(e.target.value))}
                    className="px-3 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="-6">-6 semitones</option>
                    <option value="-5">-5 semitones</option>
                    <option value="-4">-4 semitones</option>
                    <option value="-3">-3 semitones</option>
                    <option value="-2">-2 semitones</option>
                    <option value="-1">-1 semitone</option>
                    <option value="0">Original Key</option>
                    <option value="1">+1 semitone</option>
                    <option value="2">+2 semitones</option>
                    <option value="3">+3 semitones</option>
                    <option value="4">+4 semitones</option>
                    <option value="5">+5 semitones</option>
                    <option value="6">+6 semitones</option>
                  </select>
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg overflow-x-auto">
                <ABCNotationRenderer abc={transposedAbc || tune.abc_notation} />
              </div>
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-900">
                  View ABC Notation
                </summary>
                <pre className="mt-2 p-4 bg-gray-100 rounded text-sm font-mono overflow-x-auto">
                  {transposedAbc || tune.abc_notation}
                </pre>
              </details>
            </div>
          )}

          {/* Notes */}
          {tune.notes && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Notes</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{tune.notes}</p>
            </div>
          )}

          {/* Appears in Sets */}
          {tuneSets.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Appears in Sets</h2>
              <div className="space-y-2">
                {tuneSets.map((set) => (
                  <Link
                    key={set.id}
                    href={`/sets/${set.id}`}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-irish-green-300 hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-medium text-gray-900">{set.name}</span>
                    <span className="px-2 py-1 text-xs font-medium bg-irish-green-100 text-irish-green-800 rounded">
                      Position {set.position}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* The Session Sets */}
          {tune.thesession_tune_id && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">📚 Sets on The Session</h2>
              {loadingSessionSets ? (
                <div className="text-center py-8">
                  <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-irish-green-600 border-r-transparent"></div>
                  <p className="mt-2 text-sm text-gray-600">Loading sets from The Session...</p>
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
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-gray-50 transition-colors group"
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

          {/* Additional Info */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Additional Information</h2>
            <dl className="grid grid-cols-2 gap-4">
              {tune.region && (
                <>
                  <dt className="text-sm font-medium text-gray-500">Region</dt>
                  <dd className="text-sm text-gray-900">{tune.region}</dd>
                </>
              )}
              {tune.thesession_tune_id && (
                <>
                  <dt className="text-sm font-medium text-gray-500">The Session</dt>
                  <dd className="text-sm">
                    <a
                      href={`https://thesession.org/tunes/${tune.thesession_tune_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-irish-green-600 hover:text-irish-green-700"
                    >
                      View on The Session →
                    </a>
                  </dd>
                </>
              )}
            </dl>
          </div>

          {/* YouTube Links */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">🎥 YouTube Videos</h2>
              <button
                onClick={() => setShowYouTube(!showYouTube)}
                className="text-sm text-irish-green-600 hover:text-irish-green-700 font-medium"
              >
                {showYouTube ? 'Hide' : 'Show'}
              </button>
            </div>
            
            {showYouTube && youtubeLinks.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 mb-3">
                  Search YouTube for "{tune.title}":
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
                          {link.title}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-irish-green-600 font-medium group-hover:text-irish-green-700">
                      Open →
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
