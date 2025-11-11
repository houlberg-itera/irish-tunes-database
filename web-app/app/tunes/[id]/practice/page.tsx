'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

type Tune = {
  id: string
  title: string
  tune_type?: { name: string }
}

export default function LogPracticePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [tune, setTune] = useState<Tune | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    duration_minutes: 30,
    notes: '',
    what_worked: '',
    what_needs_work: '',
    quality_rating: 3,
    tempo_bpm: null as number | null,
    memorized: false,
    played_full_speed: false,
  })

  useEffect(() => {
    fetchTune()
  }, [id])

  async function fetchTune() {
    try {
      const { data: tuneData, error } = await supabase
        .from('tunes')
        .select(`
          *,
          tune_types(name)
        `)
        .eq('id', id)
        .single()

      if (error) throw error

      setTune({
        id: tuneData.id,
        title: tuneData.title,
        tune_type: tuneData.tune_types,
      })
    } catch (error) {
      console.error('Error fetching tune:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      // Insert practice session
      const { error: sessionError } = await supabase
        .from('practice_sessions')
        .insert([
          {
            user_id: 'demo-user-123',
            tune_id: id,
            duration_minutes: formData.duration_minutes,
            notes: formData.notes || null,
            what_worked: formData.what_worked || null,
            what_needs_work: formData.what_needs_work || null,
            quality_rating: formData.quality_rating,
            tempo_bpm: formData.tempo_bpm,
            memorized: formData.memorized,
            played_full_speed: formData.played_full_speed,
            session_date: new Date().toISOString(),
          },
        ])

      if (sessionError) throw sessionError

      // Update last_practiced_at and increment practice count
      const { error: updateError } = await supabase.rpc('increment_practice_count', {
        p_user_id: 'demo-user-123',
        p_tune_id: id,
        p_duration: formData.duration_minutes,
      })

      // If the RPC doesn't exist, do it manually
      if (updateError) {
        console.warn('RPC not found, updating manually:', updateError)
        
        // Get current practice info
        const { data: current } = await supabase
          .from('user_tune_practice')
          .select('practice_count, total_practice_time_minutes')
          .eq('user_id', 'demo-user-123')
          .eq('tune_id', id)
          .single()

        if (current) {
          await supabase
            .from('user_tune_practice')
            .update({
              last_practiced_at: new Date().toISOString(),
              practice_count: (current.practice_count || 0) + 1,
              total_practice_time_minutes: (current.total_practice_time_minutes || 0) + formData.duration_minutes,
            })
            .eq('user_id', 'demo-user-123')
            .eq('tune_id', id)
        }
      }

      // Redirect back to tune detail
      router.push(`/tunes/${id}`)
    } catch (error) {
      console.error('Error logging practice session:', error)
      alert('Failed to log practice session')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-irish-green-600 border-r-transparent"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    )
  }

  if (!tune) {
    return (
      <div className="text-center py-12">
        <p className="text-xl text-gray-600 mb-4">Tune not found</p>
        <Link href="/tunes" className="text-irish-green-600 hover:text-irish-green-700">
          ← Back to tunes
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          href={`/tunes/${id}`}
          className="text-irish-green-600 hover:text-irish-green-700 mb-4 inline-block"
        >
          ← Back to {tune.title}
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Log Practice Session</h1>
        <p className="text-gray-600 mt-2">
          Track your practice for <span className="font-semibold">{tune.title}</span>
          {tune.tune_type && <span className="text-gray-500"> ({tune.tune_type.name})</span>}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Duration (minutes) *
          </label>
          <input
            type="number"
            required
            min="1"
            max="480"
            value={formData.duration_minutes}
            onChange={(e) =>
              setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 0 })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-irish-green-500 focus:border-transparent"
          />
          <p className="text-sm text-gray-500 mt-1">How long did you practice this tune?</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Quality Rating *
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => setFormData({ ...formData, quality_rating: rating })}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  formData.quality_rating === rating
                    ? 'bg-irish-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {rating}
              </button>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Poor</span>
            <span>Excellent</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            What Worked
          </label>
          <input
            type="text"
            value={formData.what_worked}
            onChange={(e) => setFormData({ ...formData, what_worked: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-irish-green-500 focus:border-transparent"
            placeholder="e.g., Smooth transitions, good timing..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            What Needs Work
          </label>
          <input
            type="text"
            value={formData.what_needs_work}
            onChange={(e) => setFormData({ ...formData, what_needs_work: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-irish-green-500 focus:border-transparent"
            placeholder="e.g., Tricky passages, ornaments..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tempo (BPM)
            </label>
            <input
              type="number"
              min="30"
              max="300"
              value={formData.tempo_bpm || ''}
              onChange={(e) =>
                setFormData({ ...formData, tempo_bpm: e.target.value ? parseInt(e.target.value) : null })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-irish-green-500 focus:border-transparent"
              placeholder="Optional"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.memorized}
              onChange={(e) => setFormData({ ...formData, memorized: e.target.checked })}
              className="w-4 h-4 text-irish-green-600 rounded focus:ring-irish-green-500"
            />
            <span className="text-sm font-medium text-gray-700">Played from memory</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.played_full_speed}
              onChange={(e) => setFormData({ ...formData, played_full_speed: e.target.checked })}
              className="w-4 h-4 text-irish-green-600 rounded focus:ring-irish-green-500"
            />
            <span className="text-sm font-medium text-gray-700">Played at full speed</span>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-irish-green-500 focus:border-transparent"
            placeholder="Any thoughts about this practice session..."
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 px-6 py-3 bg-irish-green-600 text-white rounded-lg hover:bg-irish-green-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Practice Session'}
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
