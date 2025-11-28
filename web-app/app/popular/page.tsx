// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type PopularTune = {
  id: number
  name: string
  type: string
  tunebooks: number
  recordings: number
  url: string
}

export default function PopularTunesPage() {
  const [tunes, setTunes] = useState<PopularTune[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState<'rank' | 'tunebooks' | 'recordings' | 'type'>('rank')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [selectedType, setSelectedType] = useState<string>('all')
  const perPage = 50

  useEffect(() => {
    fetchPopularTunes()
  }, [page])

  async function fetchPopularTunes() {
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch(
        `https://thesession.org/tunes/popular?format=json&page=${page}&perpage=${perPage}`
      )
      
      if (!response.ok) {
        throw new Error('Failed to fetch popular tunes')
      }
      
      const data = await response.json()
      
      if (data.tunes && Array.isArray(data.tunes)) {
        setTunes(data.tunes)
      } else {
        setTunes([])
        setError('No tunes found')
      }
    } catch (err) {
      console.error('Error fetching popular tunes:', err)
      setError('Failed to load popular tunes from The Session')
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (column: 'rank' | 'tunebooks' | 'recordings' | 'type') => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortDirection(column === 'rank' || column === 'type' ? 'asc' : 'desc')
    }
  }

  // Get unique tune types for filter
  const tuneTypes = ['all', ...Array.from(new Set(tunes.map(t => t.type))).sort()]

  // Filter tunes by type
  const filteredTunes = selectedType === 'all' 
    ? tunes 
    : tunes.filter(tune => tune.type === selectedType)

  // Sort filtered tunes
  const sortedTunes = [...filteredTunes].sort((a, b) => {
    let comparison = 0
    
    if (sortBy === 'rank') {
      const rankA = tunes.indexOf(a)
      const rankB = tunes.indexOf(b)
      comparison = rankA - rankB
    } else if (sortBy === 'tunebooks') {
      comparison = a.tunebooks - b.tunebooks
    } else if (sortBy === 'recordings') {
      comparison = a.recordings - b.recordings
    } else if (sortBy === 'type') {
      comparison = a.type.localeCompare(b.type)
    }
    
    return sortDirection === 'asc' ? comparison : -comparison
  })

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          🌟 Most Popular Tunes
        </h1>
        <p className="text-gray-600">
          From The Session - ranked by tunebooks and recordings
        </p>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Filter by type:
        </label>
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-irish-green-500 focus:border-transparent"
        >
          {tuneTypes.map((type) => (
            <option key={type} value={type}>
              {type === 'all' ? 'All Types' : type}
            </option>
          ))}
        </select>
        {selectedType !== 'all' && (
          <span className="ml-4 text-sm text-gray-600">
            Showing {sortedTunes.length} of {tunes.length} tunes
          </span>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-irish-green-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading popular tunes...</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('rank')}
                  >
                    <div className="flex items-center gap-1">
                      Rank
                      {sortBy === 'rank' && (
                        <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tune Name
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('type')}
                  >
                    <div className="flex items-center gap-1">
                      Type
                      {sortBy === 'type' && (
                        <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('tunebooks')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Tunebooks
                      {sortBy === 'tunebooks' && (
                        <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('recordings')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Recordings
                      {sortBy === 'recordings' && (
                        <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedTunes.map((tune, index) => {
                  const originalIndex = tunes.indexOf(tune)
                  return (
                    <tr key={tune.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {(page - 1) * perPage + originalIndex + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <a
                          href={tune.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-irish-green-600 hover:text-irish-green-700"
                        >
                          {tune.name}
                        </a>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {tune.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                        📚 {tune.tunebooks}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                        🎵 {tune.recordings}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <Link
                          href={`/tunes/add?sessionId=${tune.id}`}
                          className="text-irish-green-600 hover:text-irish-green-900 font-medium"
                        >
                          Add to My Tunes →
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>
            
            <span className="text-gray-600">
              Page {page}
            </span>
            
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={tunes.length < perPage}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        </>
      )}
    </div>
  )
}
