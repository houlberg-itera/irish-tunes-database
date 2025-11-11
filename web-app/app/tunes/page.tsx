// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import type { Database } from '@/lib/database.types'

type Tune = Database['public']['Tables']['tunes']['Row'] & {
  tune_type?: string
  key?: string
  practice_info?: {
    proficiency_level: number | null
    is_active: boolean
    is_favorite: boolean
    last_practiced_at: string | null
  }
}

export default function TunesPage() {
  const [tunes, setTunes] = useState<Tune[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'practicing' | 'favorites'>('all')

  useEffect(() => {
    fetchTunes()
  }, [filter])

  async function fetchTunes() {
    setLoading(true)
    try {
      // For demo purposes, using a mock user_id. Replace with actual auth.
      const userId = 'demo-user-123'

      // Fetch tunes with related data
      const { data: tunesData, error: tunesError } = await supabase
        .from('tunes')
        .select(`
          *,
          tune_types(name),
          musical_keys(name)
        `)
        .order('title')

      if (tunesError) throw tunesError

      // Fetch practice info separately
      const { data: practiceData } = await supabase
        .from('user_tune_practice')
        .select('*')
        .eq('user_id', userId)

      // Create a map of practice info by tune_id
      const practiceMap = new Map(
        (practiceData || []).map((p: any) => [p.tune_id, p])
      )

      // Transform the data
      const transformedData: Tune[] = (tunesData || []).map((tune: any) => ({
        ...tune,
        tune_type: tune.tune_types?.name,
        key: tune.musical_keys?.name,
        practice_info: practiceMap.get(tune.id) || null,
      }))

      // Apply filters
      let filtered = transformedData
      if (filter === 'practicing') {
        filtered = transformedData.filter(t => t.practice_info?.is_active)
      } else if (filter === 'favorites') {
        filtered = transformedData.filter(t => t.practice_info?.is_favorite)
      }

      setTunes(filtered)
    } catch (error) {
      console.error('Error fetching tunes:', error)
    } finally {
      setLoading(false)
    }
  }

  const getProficiencyLabel = (level: number | null) => {
    if (!level) return 'Not started'
    const labels = ['', 'Learning', 'Practicing', 'Competent', 'Proficient', 'Mastered']
    return labels[level] || 'Not started'
  }

  const getProficiencyColor = (level: number | null) => {
    if (!level) return 'bg-gray-100 text-gray-600'
    if (level <= 2) return 'bg-yellow-100 text-yellow-700'
    if (level === 3) return 'bg-blue-100 text-blue-700'
    if (level === 4) return 'bg-green-100 text-green-700'
    return 'bg-irish-green-100 text-irish-green-700'
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900">My Tunes</h1>
        <Link
          href="/tunes/add"
          className="px-6 py-3 bg-irish-green-600 text-white rounded-lg hover:bg-irish-green-700 transition-colors font-medium"
        >
          + Add New Tune
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'all'
              ? 'bg-irish-green-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          All Tunes
        </button>
        <button
          onClick={() => setFilter('practicing')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'practicing'
              ? 'bg-irish-green-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Currently Practicing
        </button>
        <button
          onClick={() => setFilter('favorites')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'favorites'
              ? 'bg-irish-green-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          ⭐ Favorites
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-irish-green-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading tunes...</p>
        </div>
      ) : tunes.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-xl text-gray-600 mb-4">No tunes found</p>
          <Link
            href="/tunes/add"
            className="text-irish-green-600 hover:text-irish-green-700 font-medium"
          >
            Add your first tune →
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {tunes.map((tune) => (
            <Link
              key={tune.id}
              href={`/tunes/${tune.id}`}
              className="block bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow border-2 border-transparent hover:border-irish-green-200"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-gray-900">
                      {tune.title}
                    </h3>
                    {tune.practice_info?.is_favorite && (
                      <span className="text-xl">⭐</span>
                    )}
                  </div>
                  <div className="flex gap-4 text-sm text-gray-600 mb-3">
                    {tune.tune_type && (
                      <span className="flex items-center gap-1">
                        🎵 {tune.tune_type}
                      </span>
                    )}
                    {tune.key && (
                      <span className="flex items-center gap-1">
                        🎹 {tune.key}
                      </span>
                    )}
                    {tune.time_signature && (
                      <span className="flex items-center gap-1">
                        ⏱️ {tune.time_signature}
                      </span>
                    )}
                    {tune.difficulty_level && (
                      <span className="flex items-center gap-1">
                        📊 Difficulty: {tune.difficulty_level}/5
                      </span>
                    )}
                  </div>
                  {tune.notes && (
                    <p className="text-gray-600 text-sm line-clamp-2">{tune.notes}</p>
                  )}
                </div>
                <div className="ml-4 text-right">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getProficiencyColor(
                      tune.practice_info?.proficiency_level || null
                    )}`}
                  >
                    {getProficiencyLabel(tune.practice_info?.proficiency_level || null)}
                  </span>
                  {tune.practice_info?.last_practiced_at && (
                    <p className="text-xs text-gray-500 mt-2">
                      Last practiced:{' '}
                      {new Date(tune.practice_info.last_practiced_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
