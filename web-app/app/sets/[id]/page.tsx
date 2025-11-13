// @ts-nocheck
'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import ABCNotationRenderer from '@/components/ABCNotationRenderer'
import { extractABCPreview } from '@/lib/abc-utils'

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
    abc_notation?: string
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
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

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
              abc_notation: tuneData?.abc_notation || '',
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

      // Fetch all tunes that are not marked as "to be learned"
      const { data: tunesData, error } = await supabase
        .from('tunes')
        .select(`
          *,
          tune_types(name),
          musical_keys(name)
        `)
        .eq('to_be_learned', false)
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

  async function reorderTunes(fromIndex: number, toIndex: number) {
    const reorderedTunes = [...tunes]
    const [movedTune] = reorderedTunes.splice(fromIndex, 1)
    reorderedTunes.splice(toIndex, 0, movedTune)

    // Update local state immediately for better UX
    setTunes(reorderedTunes)

    try {
      // Update positions in database
      const updates = reorderedTunes.map((tune, index) => ({
        id: tune.id,
        position: index + 1,
      }))

      // Update each item's position
      await Promise.all(
        updates.map((update) =>
          supabase.from('tune_set_items').update({ position: update.position }).eq('id', update.id)
        )
      )
    } catch (error) {
      console.error('Error reordering tunes:', error)
      alert('Failed to reorder tunes')
      // Reload data on error
      fetchSetData()
    }
  }

  function handleDragStart(index: number) {
    setDraggedIndex(index)
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault()
    
    if (draggedIndex === null || draggedIndex === index) return

    // Move the item while dragging
    const reorderedTunes = [...tunes]
    const [movedTune] = reorderedTunes.splice(draggedIndex, 1)
    reorderedTunes.splice(index, 0, movedTune)
    
    setTunes(reorderedTunes)
    setDraggedIndex(index)
  }

  function handleDragEnd() {
    if (draggedIndex === null) return

    // Save the new order to database
    const updates = tunes.map((tune, index) => ({
      id: tune.id,
      position: index + 1,
    }))

    Promise.all(
      updates.map((update) =>
        supabase.from('tune_set_items').update({ position: update.position }).eq('id', update.id)
      )
    ).catch((error) => {
      console.error('Error saving order:', error)
      fetchSetData() // Reload on error
    })

    setDraggedIndex(null)
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
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
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
          <div className="p-4 bg-gray-50 border-b">
            <p className="text-sm text-gray-600">💡 Drag and drop to reorder tunes</p>
          </div>
          <div className="divide-y">
            {tunes.map((item, index) => {
              const snippetAbc = item.tune.abc_notation 
                ? extractABCPreview(item.tune.abc_notation, 2)
                : null

              return (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`p-4 transition-colors ${
                    draggedIndex === index ? 'bg-irish-green-50 opacity-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-4 cursor-move mb-3">
                    <div className="text-gray-400 cursor-grab active:cursor-grabbing">
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 8h16M4 16h16"
                        />
                      </svg>
                    </div>
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
                  
                  {/* ABC snippet */}
                  {snippetAbc && (
                    <div className="ml-14 bg-gray-50 p-3 rounded overflow-x-auto">
                      <ABCNotationRenderer abc={snippetAbc} />
                    </div>
                  )}
                </div>
              )
            })}
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
