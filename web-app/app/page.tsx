'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import ABCNotationRenderer from '@/components/ABCNotationRenderer'

type TuneSet = {
  id: string
  name: string
  description: string | null
  tunes: Array<{ id: string; title: string; abc_notation: string | null; key: string | null }>
}

export default function Home() {
  const [sets, setSets] = useState<TuneSet[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedSets, setExpandedSets] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchSets()
  }, [])

  async function fetchSets() {
    try {
      const { data: setsData, error } = await supabase
        .from('tune_sets')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(10)

      if (error) throw error

      // Get tunes for each set
      const setsWithTunes = await Promise.all(
        (setsData || []).map(async (set: any) => {
          const { data: items } = await supabase
            .from('tune_set_items')
            .select('tune_id, position')
            .eq('set_id', set.id)
            .order('position')

          const tuneDetails = await Promise.all(
            (items || []).map(async (item: any) => {
              const { data: tune } = await supabase
                .from('tunes')
                .select(`
                  id,
                  title,
                  abc_notation,
                  musical_keys(name)
                `)
                .eq('id', item.tune_id)
                .single()

              return {
                id: item.tune_id,
                title: (tune as any)?.title || 'Unknown',
                abc_notation: (tune as any)?.abc_notation || null,
                key: (tune as any)?.musical_keys?.name || null,
              }
            })
          )

          return {
            id: set.id,
            name: set.name,
            description: set.description,
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

  const toggleSet = (setId: string) => {
    const newExpanded = new Set(expandedSets)
    if (newExpanded.has(setId)) {
      newExpanded.delete(setId)
    } else {
      newExpanded.add(setId)
    }
    setExpandedSets(newExpanded)
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          🎵 Irish Session Helper
        </h1>
        <p className="text-lg text-gray-600">
          Quick access to your tune sets
        </p>
      </div>

      {/* Sets List */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Your Sets</h2>
          <Link
            href="/sets"
            className="text-sm text-irish-green-600 hover:text-irish-green-700 font-medium"
          >
            View All →
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-irish-green-600 border-r-transparent"></div>
          </div>
        ) : sets.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-600 mb-4">No sets yet</p>
            <Link
              href="/sets"
              className="inline-block px-6 py-3 bg-irish-green-600 text-white rounded-lg hover:bg-irish-green-700 font-medium"
            >
              Create Your First Set
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {sets.map((set) => (
              <div key={set.id} className="bg-white rounded-lg shadow-md p-4">
                <div className="flex items-start justify-between mb-2">
                  <Link href={`/sets/${set.id}`} className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{set.name}</h3>
                    {set.description && (
                      <p className="text-sm text-gray-600 mb-3">{set.description}</p>
                    )}
                  </Link>
                  <button
                    onClick={() => toggleSet(set.id)}
                    className="ml-2 px-3 py-1 text-sm text-irish-green-600 hover:bg-irish-green-50 rounded"
                  >
                    {expandedSets.has(set.id) ? '🎼 Hide Music' : '🎼 Show Music'}
                  </button>
                </div>

                {set.tunes.length > 0 && (
                  <div className="space-y-2">
                    {set.tunes.map((tune, idx) => {
                      // Extract first two bars
                      let firstTwoBarsAbc = ''
                      if (tune.abc_notation) {
                        const lines = tune.abc_notation.split('\n')
                        const headerLines = lines.filter(line => line.match(/^[A-XWVUT]:/))
                        const musicLines = lines.filter(line => 
                          line.trim() && !line.match(/^[A-Z]:/)
                        )
                        const musicPart = musicLines.join(' ')
                        const barSplit = musicPart.split('|')
                        const firstTwoBars = barSplit.slice(0, 3).join('|')
                        firstTwoBarsAbc = headerLines.join('\n') + '\n' + firstTwoBars
                      }

                      return (
                        <div key={idx} className="border-b border-gray-100 pb-2 last:border-0">
                          <Link href={`/tunes/${set.tunes[idx]?.id || '#'}`}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-gray-400 font-mono text-xs">{idx + 1}.</span>
                              <span className="text-gray-900 font-medium text-sm">{tune.title}</span>
                              {tune.key && (
                                <span className="text-gray-500 text-xs">({tune.key})</span>
                              )}
                            </div>
                          </Link>
                          {expandedSets.has(set.id) && firstTwoBarsAbc && (
                            <div className="ml-5 bg-gray-50 p-1.5 rounded overflow-x-auto scale-75 origin-left">
                              <ABCNotationRenderer abc={firstTwoBarsAbc} />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

