// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import type { Database } from '@/lib/database.types'
import ABCNotationRenderer from '@/components/ABCNotationRenderer'
import { extractABCPreview } from '@/lib/abc-utils'

type Tune = Database['public']['Tables']['tunes']['Row'] & {
  tune_type?: string
  key?: string
}

export default function TunesPage() {
  const [tunes, setTunes] = useState<Tune[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'learned' | 'to-learn'>('all')
  const [tuneTypes, setTuneTypes] = useState<Array<{ id: string; name: string }>>([])
  const [selectedType, setSelectedType] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')

  useEffect(() => {
    fetchTuneTypes()
  }, [])

  useEffect(() => {
    fetchTunes()
  }, [filter, selectedType, searchQuery])

  async function fetchTuneTypes() {
    try {
      const { data, error } = await supabase
        .from('tune_types')
        .select('id, name')
        .order('name')

      if (error) throw error
      setTuneTypes(data || [])
    } catch (error) {
      console.error('Error fetching tune types:', error)
    }
  }

  async function fetchTunes() {
    setLoading(true)
    try {
      const { data: tunesData, error: tunesError } = await supabase
        .from('tunes')
        .select(`
          *,
          tune_types(name),
          musical_keys(name)
        `)
        .order('title')

      if (tunesError) throw tunesError

      // Transform the data
      const transformedData: Tune[] = (tunesData || []).map((tune: any) => ({
        ...tune,
        tune_type: tune.tune_types?.name,
        key: tune.musical_keys?.name,
      }))

      // Apply filters
      let filtered = transformedData
      if (filter === 'learned') {
        filtered = transformedData.filter(t => !t.to_be_learned)
      } else if (filter === 'to-learn') {
        filtered = transformedData.filter(t => t.to_be_learned)
      }

      // Apply tune type filter
      if (selectedType !== 'all') {
        filtered = filtered.filter(t => t.tune_type === selectedType)
      }

      // Apply search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        filtered = filtered.filter(t => 
          t.title.toLowerCase().includes(query) ||
          t.tune_type?.toLowerCase().includes(query) ||
          t.key?.toLowerCase().includes(query) ||
          t.notes?.toLowerCase().includes(query)
        )
      }

      setTunes(filtered)
    } catch (error) {
      console.error('Error fetching tunes:', error)
    } finally {
      setLoading(false)
    }
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
      <div className="mb-6 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search tunes by name, type, key, or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-irish-green-500 focus:border-transparent"
          />
          <svg
            className="absolute left-3 top-3.5 h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>

        {/* Status Filter */}
        <div className="flex gap-2">
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
            onClick={() => setFilter('learned')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'learned'
                ? 'bg-irish-green-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            ✓ Learned
          </button>
          <button
            onClick={() => setFilter('to-learn')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'to-learn'
                ? 'bg-irish-green-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            📖 To Learn
          </button>
        </div>

        {/* Tune Type Filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Type:</label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-irish-green-500"
          >
            <option value="all">All Types</option>
            {tuneTypes.map((type) => (
              <option key={type.id} value={type.name}>
                {type.name}
              </option>
            ))}
          </select>
        </div>
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
          {tunes.map((tune) => {
            let snippetAbc = null
            if (tune.abc_notation) {
              try {
                snippetAbc = extractABCPreview(tune.abc_notation, 2)
              } catch (e) {
                console.error('Error extracting preview for', tune.title, e)
              }
            }
            
            return (
              <div
                key={tune.id}
                className="bg-white rounded-lg shadow hover:shadow-md transition-shadow border-2 border-transparent hover:border-irish-green-200"
              >
                <Link
                  href={`/tunes/${tune.id}`}
                  className="block p-4 sm:p-6"
                >
                  <div className="flex flex-col gap-4">
                    {/* Tune info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-gray-900 truncate">
                          {tune.title}
                        </h3>
                        {tune.to_be_learned && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded flex-shrink-0">
                            📖 To Learn
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3 sm:gap-4 text-sm text-gray-600 mb-2">
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
                      </div>
                      {tune.notes && (
                        <p className="text-gray-600 text-sm line-clamp-2">{tune.notes}</p>
                      )}
                    </div>
                    
                    {/* ABC snippet - full width below */}
                    {snippetAbc && (
                      <div className="bg-gray-50 p-3 rounded overflow-x-auto">
                        <ABCNotationRenderer abc={snippetAbc} />
                      </div>
                    )}
                  </div>
                </Link>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
