// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function ToLearnPage() {
  const [tunes, setTunes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTunesToLearn()
  }, [])

  async function fetchTunesToLearn() {
    try {
      const { data, error } = await supabase
        .from('tunes')
        .select(`
          id,
          title,
          tune_types(name),
          musical_keys(name),
          time_signature
        `)
        .eq('to_be_learned', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      setTunes(data || [])
    } catch (error) {
      console.error('Error fetching tunes to learn:', error)
    } finally {
      setLoading(false)
    }
  }

  async function markAsLearned(tuneId: string) {
    try {
      const { error } = await supabase
        .from('tunes')
        .update({ to_be_learned: false })
        .eq('id', tuneId)

      if (error) throw error

      // Remove from list
      setTunes(tunes.filter(t => t.id !== tuneId))
    } catch (error) {
      console.error('Error marking tune as learned:', error)
      alert('Failed to update tune')
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Tunes To Learn</h1>
        <p className="text-gray-600">
          Tunes you've marked for learning. Mark them as learned when you're ready.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-irish-green-600 border-r-transparent"></div>
        </div>
      ) : tunes.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600 mb-4">No tunes to learn</p>
          <Link
            href="/tunes/add"
            className="inline-block px-6 py-3 bg-irish-green-600 text-white rounded-lg hover:bg-irish-green-700 font-medium"
          >
            Add a Tune
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="divide-y divide-gray-200">
            {tunes.map((tune) => (
              <div key={tune.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between gap-4">
                  <Link href={`/tunes/${tune.id}`} className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate">
                      {tune.title}
                    </h3>
                    <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                      {tune.tune_types && (
                        <span className="flex items-center gap-1">
                          🎵 {tune.tune_types.name}
                        </span>
                      )}
                      {tune.musical_keys && (
                        <span className="flex items-center gap-1">
                          🎹 {tune.musical_keys.name}
                        </span>
                      )}
                      {tune.time_signature && (
                        <span className="flex items-center gap-1">
                          ⏱️ {tune.time_signature}
                        </span>
                      )}
                    </div>
                  </Link>
                  <button
                    onClick={() => markAsLearned(tune.id)}
                    className="flex-shrink-0 px-4 py-2 bg-irish-green-600 text-white rounded-lg hover:bg-irish-green-700 font-medium text-sm transition-colors"
                  >
                    ✓ Mark as Learned
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
