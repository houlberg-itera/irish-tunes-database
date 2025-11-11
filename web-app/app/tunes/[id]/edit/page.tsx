'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import ABCNotationRenderer from '@/components/ABCNotationRenderer'

export default function EditTunePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    tune_type_id: '',
    key_id: '',
    time_signature: '',
    abc_notation: '',
    notes: '',
    region: '',
  })
  const [tuneTypes, setTuneTypes] = useState<any[]>([])
  const [musicalKeys, setMusicalKeys] = useState<any[]>([])

  useEffect(() => {
    fetchData()
  }, [id])

  async function fetchData() {
    try {
      // Fetch reference data
      const [typesResult, keysResult] = await Promise.all([
        supabase.from('tune_types').select('*').order('name'),
        supabase.from('musical_keys').select('*').order('display_order'),
      ])

      if (typesResult.data) setTuneTypes(typesResult.data)
      if (keysResult.data) setMusicalKeys(keysResult.data)

      // Fetch tune data
      const { data: tune, error } = await supabase
        .from('tunes')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error

      setFormData({
        title: tune.title || '',
        tune_type_id: tune.tune_type_id || '',
        key_id: tune.key_id || '',
        time_signature: tune.time_signature || '',
        abc_notation: tune.abc_notation || '',
        notes: tune.notes || '',
        region: tune.region || '',
      })
    } catch (error) {
      console.error('Error fetching data:', error)
      alert('Failed to load tune')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      const { error } = await supabase
        .from('tunes')
        .update({
          title: formData.title,
          tune_type_id: formData.tune_type_id || null,
          key_id: formData.key_id || null,
          time_signature: formData.time_signature || null,
          abc_notation: formData.abc_notation || null,
          notes: formData.notes || null,
          region: formData.region || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (error) throw error

      router.push(`/tunes/${id}`)
    } catch (error) {
      console.error('Error updating tune:', error)
      alert('Failed to update tune')
    } finally {
      setSaving(false)
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

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <Link
          href={`/tunes/${id}`}
          className="text-irish-green-600 hover:text-irish-green-700 mb-4 inline-block"
        >
          ← Back to tune
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Edit Tune</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Basic Information</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tune Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-irish-green-500 focus:border-transparent"
              />
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tune Type
                </label>
                <select
                  value={formData.tune_type_id}
                  onChange={(e) =>
                    setFormData({ ...formData, tune_type_id: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-irish-green-500 focus:border-transparent"
                >
                  <option value="">Select type...</option>
                  {tuneTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Key
                </label>
                <select
                  value={formData.key_id}
                  onChange={(e) => setFormData({ ...formData, key_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-irish-green-500 focus:border-transparent"
                >
                  <option value="">Select key...</option>
                  {musicalKeys.map((key) => (
                    <option key={key.id} value={key.id}>
                      {key.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time Signature
                </label>
                <input
                  type="text"
                  value={formData.time_signature}
                  onChange={(e) =>
                    setFormData({ ...formData, time_signature: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-irish-green-500 focus:border-transparent"
                  placeholder="e.g., 6/8, 4/4"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Region
              </label>
              <input
                type="text"
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-irish-green-500 focus:border-transparent"
                placeholder="e.g., Ireland, Scotland"
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">ABC Notation</h2>
          <textarea
            value={formData.abc_notation}
            onChange={(e) => setFormData({ ...formData, abc_notation: e.target.value })}
            rows={10}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-irish-green-500 focus:border-transparent font-mono text-sm"
            placeholder="Enter ABC notation..."
          />
          {formData.abc_notation && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Preview:</h3>
              <div className="bg-gray-50 p-4 rounded-lg overflow-x-auto">
                <ABCNotationRenderer abc={formData.abc_notation} />
              </div>
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Notes</h2>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-irish-green-500 focus:border-transparent"
            placeholder="Additional notes about this tune..."
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-irish-green-600 text-white rounded-lg hover:bg-irish-green-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Changes'}
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
