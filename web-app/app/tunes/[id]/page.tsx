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

type PracticeInfo = {
  proficiency_level: number | null
  is_active: boolean
  is_favorite: boolean
  last_practiced_at: string | null
  learning_notes: string | null
  trouble_spots: string | null
  total_practice_time_minutes: number
  practice_count: number
}

export default function TuneDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [tune, setTune] = useState<Tune | null>(null)
  const [practiceInfo, setPracticeInfo] = useState<PracticeInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [transposeSteps, setTransposeSteps] = useState(0)
  const [transposedAbc, setTransposedAbc] = useState<string | null>(null)

  useEffect(() => {
    fetchTune()
  }, [id])

  useEffect(() => {
    if (tune?.abc_notation) {
      transposeAbc()
    }
  }, [transposeSteps, tune?.abc_notation])

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

      // Fetch practice info
      const userId = 'demo-user-123' // Replace with actual auth
      const { data: practiceData } = await supabase
        .from('user_tune_practice')
        .select('*')
        .eq('tune_id', id)
        .eq('user_id', userId)
        .single()

      if (practiceData) {
        setPracticeInfo(practiceData)
      }
    } catch (error) {
      console.error('Error fetching tune:', error)
    } finally {
      setLoading(false)
    }
  }

  async function updatePracticeInfo(updates: Partial<PracticeInfo>) {
    setUpdating(true)
    try {
      const userId = 'demo-user-123'
      
      if (practiceInfo) {
        // Update existing practice info
        const { error } = await supabase
          .from('user_tune_practice')
          .update(updates)
          .eq('tune_id', id)
          .eq('user_id', userId)

        if (error) throw error
      } else {
        // Create new practice info
        const { error } = await supabase
          .from('user_tune_practice')
          .insert({
            user_id: userId,
            tune_id: id,
            ...updates,
          })

        if (error) throw error
      }

      await fetchTune()
    } catch (error) {
      console.error('Error updating practice info:', error)
    } finally {
      setUpdating(false)
    }
  }

  async function toggleFavorite() {
    await updatePracticeInfo({ is_favorite: !practiceInfo?.is_favorite })
  }

  async function toggleActive() {
    await updatePracticeInfo({ is_active: !practiceInfo?.is_active })
  }

  async function updateProficiency(level: number) {
    await updatePracticeInfo({ proficiency_level: level })
  }

  async function deleteTune() {
    if (!confirm(`Are you sure you want to delete "${tune?.title}"? This cannot be undone.`)) {
      return
    }

    try {
      setUpdating(true)

      // Delete practice info first (foreign key constraint)
      await supabase
        .from('user_tune_practice')
        .delete()
        .eq('tune_id', id)
        .eq('user_id', 'demo-user-123')

      // Delete the tune
      const { error } = await supabase
        .from('tunes')
        .delete()
        .eq('id', id)

      if (error) throw error

      // Redirect to tunes list
      router.push('/tunes')
    } catch (error) {
      console.error('Error deleting tune:', error)
      alert('Failed to delete tune')
      setUpdating(false)
    }
  }

  const getProficiencyLabel = (level: number | null) => {
    if (!level) return 'Not started'
    const labels = ['', 'Learning', 'Practicing', 'Competent', 'Proficient', 'Mastered']
    return labels[level] || 'Not started'
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
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">{tune.title}</h1>
            <div className="flex gap-4 text-gray-600">
              {tune.tune_type && <span>🎵 {tune.tune_type.name}</span>}
              {tune.musical_key && <span>🎹 {tune.musical_key.name}</span>}
              {tune.time_signature && <span>⏱️ {tune.time_signature}</span>}
              {tune.difficulty_level && (
                <span>📊 Difficulty: {tune.difficulty_level}/5</span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={toggleFavorite}
              disabled={updating}
              className={`p-2 rounded-lg transition-colors ${
                practiceInfo?.is_favorite
                  ? 'bg-yellow-100 text-yellow-600'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title={practiceInfo?.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              ⭐
            </button>
            <button
              onClick={toggleActive}
              disabled={updating}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                practiceInfo?.is_active
                  ? 'bg-irish-green-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {practiceInfo?.is_active ? '✓ Practicing' : 'Start Practicing'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
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
        </div>

        {/* Sidebar - Practice Info */}
        <div className="space-y-6">
          {/* Proficiency Level */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Proficiency Level</h2>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((level) => (
                <button
                  key={level}
                  onClick={() => updateProficiency(level)}
                  disabled={updating}
                  className={`w-full px-4 py-2 rounded-lg font-medium transition-colors text-left ${
                    practiceInfo?.proficiency_level === level
                      ? 'bg-irish-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {level}. {getProficiencyLabel(level)}
                </button>
              ))}
            </div>
          </div>

          {/* Practice Stats */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Practice Stats</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Practice Sessions</dt>
                <dd className="text-2xl font-bold text-gray-900">
                  {practiceInfo?.practice_count || 0}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Total Practice Time</dt>
                <dd className="text-2xl font-bold text-gray-900">
                  {practiceInfo?.total_practice_time_minutes || 0} min
                </dd>
              </div>
              {practiceInfo?.last_practiced_at && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Last Practiced</dt>
                  <dd className="text-sm text-gray-900">
                    {new Date(practiceInfo.last_practiced_at).toLocaleDateString()}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Quick Actions */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <Link
                href={`/tunes/${id}/edit`}
                className="block w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-center font-medium"
              >
                ✏️ Edit Tune
              </Link>
              <Link
                href={`/tunes/${id}/practice`}
                className="block w-full px-4 py-2 bg-irish-green-600 text-white rounded-lg hover:bg-irish-green-700 transition-colors text-center font-medium"
              >
                📝 Log Practice Session
              </Link>
              <button
                onClick={deleteTune}
                disabled={updating}
                className="w-full px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium disabled:opacity-50"
              >
                🗑️ Delete Tune
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
