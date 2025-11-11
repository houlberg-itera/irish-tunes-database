// @ts-nocheck
'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type TuneSet = {
  id: string
  name: string
  description: string | null
}

type SetTune = {
  id: string
  position: number
  tune: {
    id: string
    title: string
    tune_type?: { name: string }
    musical_key?: { name: string }
  }
}

type AvailableTune = {
  id: string
  title: string
  tune_type?: { name: string }
  musical_key?: { name: string }
}

export default function SetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [set, setSet] = useState<TuneSet | null>(null)
  const [tunes, setTunes] = useState<SetTune[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [availableTunes, setAvailableTunes] = useState<AvailableTune[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    fetchSetData()
  }, [id])

  async function fetchSetData() {
    try {
      // Fetch set details
      const { data: setData, error: setError } = await supabase
        .from('tune_sets')
        .select('*')
        .eq('id', id)
        .single()

      if (setError) throw setError
      setSet(setData)

      // Fetch tunes in this set
      const { data: itemsData, error: itemsError } = await supabase
        .from('tune_set_items')
        .select('*')
        .eq('set_id', id)
        .order('position')

      if (itemsError) throw itemsError

      // Fetch tune details for each item
      const tunesWithDetails = await Promise.all(
        (itemsData || []).map(async (item) => {
          const { data: tuneData } = await supabase
            .from('tunes')
            .select(`
              *,
              tune_types(name),
              musical_keys(name)
            `)
            .eq('id', item.tune_id)
            .single()

          return {
            id: item.id,
            position: item.position,
            tune: {
              id: tuneData?.id || '',
              title: tuneData?.title || '',
              tune_type: tuneData?.tune_types,
              musical_key: tuneData?.musical_keys,
            },
          }
        })
      )

      setTunes(tunesWithDetails)
    } catch (error) {
      console.error('Error fetching set data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchAvailableTunes() {
    try {
      // Get tunes not already in this set
      const tunesInSet = tunes.map((t) => t.tune.id)

      // Fetch all tunes
      const { data: tunesData, error } = await supabase
        .from('tunes')
        .select(`
          *,
          tune_types(name),
          musical_keys(name)
        `)
        .order('title')

      if (error) {
        console.error('Error fetching tunes:', error)
        return
      }

      // Filter out tunes already in the set
      const available = (tunesData || [])
        .filter((t) => !tunesInSet.includes(t.id))
        .map((t) => ({
          id: t.id,
          title: t.title,
          tune_type: t.tune_types,
          musical_key: t.musical_keys,
        }))

      setAvailableTunes(available)
    } catch (error) {
      console.error('Error fetching available tunes:', error)
    }
  }

  async function addTuneToSet(tuneId: string) {
    setAdding(true)
    try {
      const nextPosition = tunes.length > 0 ? Math.max(...tunes.map((t) => t.position)) + 1 : 1

      const { error } = await supabase.from('tune_set_items').insert([
        {
          set_id: id,
          tune_id: tuneId,
          position: nextPosition,
        },
      ])

      if (error) throw error

      setShowAddModal(false)
      setSearchQuery('')
      fetchSetData()
    } catch (error) {
      console.error('Error adding tune to set:', error)
      alert('Failed to add tune to set')
    } finally {
      setAdding(false)
    }
  }

  async function removeTuneFromSet(itemId: string) {
    if (!confirm('Remove this tune from the set?')) return

    try {
      const { error } = await supabase.from('tune_set_items').delete().eq('id', itemId)

      if (error) throw error
      fetchSetData()
    } catch (error) {
      console.error('Error removing tune:', error)
      alert('Failed to remove tune')
    }
  }

  async function deleteSet() {
    if (!confirm(`Delete "${set?.name}"? This cannot be undone.`)) return

    try {
      const { error } = await supabase.from('tune_sets').delete().eq('id', id)

      if (error) throw error
      router.push('/sets')
    } catch (error) {
      console.error('Error deleting set:', error)
      alert('Failed to delete set')
    }
  }

  const filteredTunes = availableTunes.filter((tune) =>
    tune.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-irish-green-600 border-r-transparent"></div>
        <p className="mt-4 text-gray-600">Loading set...</p>
      </div>
    )
  }

  if (!set) {
    return (
      <div className="text-center py-12">
        <p className="text-xl text-gray-600 mb-4">Set not found</p>
        <Link href="/sets" className="text-irish-green-600 hover:text-irish-green-700">
          ← Back to sets
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <Link href="/sets" className="text-irish-green-600 hover:text-irish-green-700 mb-4 inline-block">
          ← Back to sets
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">{set.name}</h1>
            {set.description && <p className="text-gray-600">{set.description}</p>}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowAddModal(true)
                fetchAvailableTunes()
              }}
              className="px-4 py-2 bg-irish-green-600 text-white rounded-lg hover:bg-irish-green-700 font-medium"
            >
              + Add Tune
            </button>
            <Link
              href={`/sets/${id}/edit`}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
            >
              ✏️ Edit Set
            </Link>
            <button
              onClick={deleteSet}
              className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium"
            >
              Delete Set
            </button>
          </div>
        </div>
      </div>

      {tunes.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-xl text-gray-600 mb-4">No tunes in this set yet</p>
          <button
            onClick={() => {
              setShowAddModal(true)
              fetchAvailableTunes()
            }}
            className="px-6 py-3 bg-irish-green-600 text-white rounded-lg hover:bg-irish-green-700 font-medium"
          >
            Add Your First Tune
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow">
          <div className="divide-y">
            {tunes.map((item, index) => (
              <div key={item.id} className="p-4 hover:bg-gray-50 flex items-center gap-4">
                <div className="text-2xl font-bold text-gray-400 w-8">{index + 1}</div>
                <Link href={`/tunes/${item.tune.id}`} className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{item.tune.title}</h3>
                  <div className="flex gap-4 text-sm text-gray-600">
                    {item.tune.tune_type && <span>🎵 {item.tune.tune_type.name}</span>}
                    {item.tune.musical_key && <span>🎹 {item.tune.musical_key.name}</span>}
                  </div>
                </Link>
                <button
                  onClick={() => removeTuneFromSet(item.id)}
                  className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Tune Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[80vh] flex flex-col">
            <h2 className="text-2xl font-bold mb-4">Add Tune to Set</h2>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-irish-green-500 focus:border-transparent mb-4"
              placeholder="Search tunes..."
              autoFocus
            />

            <div className="flex-1 overflow-y-auto mb-4">
              {filteredTunes.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  {availableTunes.length === 0
                    ? 'All your tunes are already in this set'
                    : 'No tunes found'}
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredTunes.map((tune) => (
                    <div
                      key={tune.id}
                      className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center justify-between"
                    >
                      <div>
                        <h3 className="font-semibold text-gray-900">{tune.title}</h3>
                        <div className="flex gap-3 text-sm text-gray-600">
                          {tune.tune_type && <span>{tune.tune_type.name}</span>}
                          {tune.musical_key && <span>{tune.musical_key.name}</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => addTuneToSet(tune.id)}
                        disabled={adding}
                        className="px-4 py-2 bg-irish-green-600 text-white rounded-lg hover:bg-irish-green-700 font-medium disabled:opacity-50"
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => {
                setShowAddModal(false)
                setSearchQuery('')
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
