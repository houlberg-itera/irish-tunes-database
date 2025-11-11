// @ts-nocheck
'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function EditSetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  })

  useEffect(() => {
    fetchSet()
  }, [id])

  async function fetchSet() {
    try {
      const { data: set, error } = await supabase
        .from('tune_sets')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error

      setFormData({
        name: (set as any)?.name || '',
        description: (set as any)?.description || '',
      })
    } catch (error) {
      console.error('Error fetching set:', error)
      alert('Failed to load set')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      const { error } = await supabase
        .from('tune_sets')
        .update({
          name: formData.name,
          description: formData.description || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (error) throw error

      router.push(`/sets/${id}`)
    } catch (error) {
      console.error('Error updating set:', error)
      alert('Failed to update set')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-irish-green-600 border-r-transparent"></div>
        <p className="mt-4 text-gray-600">Loading set...</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          href={`/sets/${id}`}
          className="text-irish-green-600 hover:text-irish-green-700 mb-4 inline-block"
        >
          ← Back to set
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Edit Set</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Set Name *
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-irish-green-500 focus:border-transparent"
            placeholder="e.g., Session Favorites"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-irish-green-500 focus:border-transparent"
            placeholder="Optional description of this set..."
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 px-6 py-3 bg-irish-green-600 text-white rounded-lg hover:bg-irish-green-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <Link
            href={`/sets/${id}`}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium text-center"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
