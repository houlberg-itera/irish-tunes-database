// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import ABCNotationRenderer from '@/components/ABCNotationRenderer'

type TuneSet = {
  id: string
  name: string
  description: string | null
  created_at: string
  tune_count: number
  tunes: Array<{ title: string; abc_notation: string | null; key: string | null }>
}

export default function SetsPage() {
  const [sets, setSets] = useState<TuneSet[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newSetName, setNewSetName] = useState('')
  const [newSetDescription, setNewSetDescription] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetchSets()
  }, [])

  async function fetchSets() {
    try {
      // Fetch sets
      const { data: setsData, error } = await supabase
        .from('tune_sets')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      // Get tunes for each set
      const setsWithTunes = await Promise.all(
        (setsData || []).map(async (set) => {
          // Get tune items for this set
          const { data: items, error: itemsError } = await supabase
            .from('tune_set_items')
            .select('tune_id, position')
            .eq('set_id', set.id)
            .order('position')

          if (itemsError) {
            console.error('Items error for set', set.id, itemsError)
            return {
              ...set,
              tune_count: 0,
              tunes: [],
            }
          }

          // Get tune details
          const tuneDetails = await Promise.all(
            (items || []).map(async (item) => {
              const { data: tune } = await supabase
                .from('tunes')
                .select(`
                  title,
                  abc_notation,
                  musical_keys(name)
                `)
                .eq('id', item.tune_id)
                .single()

              return { 
                title: tune?.title || 'Unknown',
                abc_notation: tune?.abc_notation || null,
                key: tune?.musical_keys?.name || null
              }
            })
          )

          return {
            ...set,
            tune_count: items?.length || 0,
            tunes: tuneDetails,
          }
        })
      )

      setSets(setsWithTunes)
    } catch (error) {
      console.error('Error fetching sets:', error)
    } finally {
      setLoading(false)
    }
  }

  async function createSet() {
    if (!newSetName.trim()) return

    setCreating(true)
    try {
      const { error } = await supabase.from('tune_sets').insert([
        {
          name: newSetName,
          description: newSetDescription || null,
        },
      ])

      if (error) {
        console.error('Insert error:', error)
        throw error
      }

      setNewSetName('')
      setNewSetDescription('')
      setShowCreateModal(false)
      fetchSets()
    } catch (error) {
      console.error('Error creating set:', error)
      alert('Failed to create set')
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-irish-green-600 border-r-transparent"></div>
        <p className="mt-4 text-gray-600">Loading sets...</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Tune Sets</h1>
          <p className="text-gray-600 mt-2">Organize tunes into sets for performances</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-6 py-3 bg-irish-green-600 text-white rounded-lg hover:bg-irish-green-700 font-medium"
        >
          + Create Set
        </button>
      </div>

      {sets.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-xl text-gray-600 mb-4">No sets yet</p>
          <p className="text-gray-500 mb-6">Create a set to organize your tunes for performances</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-irish-green-600 text-white rounded-lg hover:bg-irish-green-700 font-medium"
          >
            Create Your First Set
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sets.map((set) => (
            <Link
              key={set.id}
              href={`/sets/${set.id}`}
              className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
            >
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{set.name}</h3>
              {set.description && (
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{set.description}</p>
              )}
              
              {/* Tune list */}
              {set.tunes.length > 0 && (
                <div className="mb-4 space-y-2">
                  {set.tunes.slice(0, 5).map((tune, idx) => {
                    // Extract first two bars from ABC notation (including pickup notes)
                    let firstTwoBarsAbc = ''
                    if (tune.abc_notation) {
                      // Get header lines
                      const lines = tune.abc_notation.split('\n')
                      const headerLines = lines.filter(line => line.match(/^[A-XWVUT]:/))
                      const musicLines = lines.filter(line => 
                        line.trim() && !line.match(/^[A-Z]:/)
                      )
                      
                      // Get first part of music including pickup
                      const musicPart = musicLines.join(' ')
                      
                      // Split by bars, but keep everything before and including the second bar
                      const barSplit = musicPart.split('|')
                      // Take first element (pickup/before first bar) + next 2 bars
                      const firstTwoBars = barSplit.slice(0, 3).join('|')
                      
                      // Reconstruct ABC with headers + pickup + first two bars
                      firstTwoBarsAbc = headerLines.join('\n') + '\n' + firstTwoBars
                    }

                    return (
                      <div key={idx} className="border-b border-gray-100 pb-1.5 last:border-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-gray-400 font-mono text-xs">{idx + 1}.</span>
                          <span className="text-gray-900 font-medium text-xs">{tune.title}</span>
                          {tune.key && (
                            <span className="text-gray-500 text-xs">({tune.key})</span>
                          )}
                        </div>
                        {firstTwoBarsAbc && (
                          <div className="ml-5 bg-gray-50 p-1.5 rounded overflow-x-auto scale-75 origin-left">
                            <ABCNotationRenderer abc={firstTwoBarsAbc} />
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {set.tunes.length > 5 && (
                    <div className="text-xs text-gray-500 italic pt-1">
                      +{set.tunes.length - 5} more...
                    </div>
                  )}
                </div>
              )}
              
              <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t">
                <span>🎵 {set.tune_count} tune{set.tune_count !== 1 ? 's' : ''}</span>
                <span>{new Date(set.created_at).toLocaleDateString()}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Set Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-4">Create New Set</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Set Name *
                </label>
                <input
                  type="text"
                  value={newSetName}
                  onChange={(e) => setNewSetName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-irish-green-500 focus:border-transparent"
                  placeholder="e.g., Session Favorites"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newSetDescription}
                  onChange={(e) => setNewSetDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-irish-green-500 focus:border-transparent"
                  placeholder="Optional description..."
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={createSet}
                disabled={!newSetName.trim() || creating}
                className="flex-1 px-4 py-2 bg-irish-green-600 text-white rounded-lg hover:bg-irish-green-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? 'Creating...' : 'Create Set'}
              </button>
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setNewSetName('')
                  setNewSetDescription('')
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
