// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

type User = {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string
  email_confirmed_at: string
  app_metadata: {
    provider?: string
  }
}

type UserStats = {
  user_id: string
  tune_count: number
  set_count: number
  practice_count: number
}

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([])
  const [userStats, setUserStats] = useState<Record<string, UserStats>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    checkAdminAccess()
  }, [user])

  async function checkAdminAccess() {
    if (!user) {
      router.push('/login')
      return
    }

    // Check if user is admin (you'll need to add admin role to your user's metadata)
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    
    // For now, check if user email matches admin email(s)
    // You should configure this in your Supabase dashboard or environment variables
    const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').split(',')
    const isUserAdmin = adminEmails.includes(currentUser?.email || '')
    
    if (!isUserAdmin) {
      setError('Access denied. Admin privileges required.')
      setLoading(false)
      return
    }

    setIsAdmin(true)
    await fetchUsers()
  }

  async function fetchUsers() {
    setLoading(true)
    try {
      // Fetch users from API route
      const response = await fetch('/api/admin/users')
      const data = await response.json()
      
      if (!response.ok) {
        setError(data.error || 'Failed to load users')
        setLoading(false)
        return
      }

      setUsers(data.users || [])

      // Fetch user stats from database
      await fetchUserStats()
    } catch (err) {
      console.error('Error fetching users:', err)
      setError('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  async function fetchUserStats() {
    try {
      // Get tune counts per user
      const { data: tunes } = await supabase
        .from('tunes')
        .select('user_id')
      
      // Get set counts per user
      const { data: sets } = await supabase
        .from('tune_sets')
        .select('user_id')
      
      // Get practice counts per user
      const { data: practices } = await supabase
        .from('user_tune_practice')
        .select('user_id')

      const stats: Record<string, UserStats> = {}

      // Aggregate stats
      tunes?.forEach(t => {
        if (!stats[t.user_id]) stats[t.user_id] = { user_id: t.user_id, tune_count: 0, set_count: 0, practice_count: 0 }
        stats[t.user_id].tune_count++
      })

      sets?.forEach(s => {
        if (!stats[s.user_id]) stats[s.user_id] = { user_id: s.user_id, tune_count: 0, set_count: 0, practice_count: 0 }
        stats[s.user_id].set_count++
      })

      practices?.forEach(p => {
        if (!stats[p.user_id]) stats[p.user_id] = { user_id: p.user_id, tune_count: 0, set_count: 0, practice_count: 0 }
        stats[p.user_id].practice_count++
      })

      setUserStats(stats)
    } catch (err) {
      console.error('Error fetching user stats:', err)
    }
  }

  async function deleteUser(userId: string, email: string) {
    if (!confirm(`Are you sure you want to delete user ${email}? This will delete all their tunes, sets, and practice data.`)) {
      return
    }

    try {
      const response = await fetch('/api/admin/users/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', userId })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete user')
      }

      alert('User deleted successfully')
      await fetchUsers()
    } catch (err) {
      console.error('Error deleting user:', err)
      alert('Failed to delete user: ' + err.message)
    }
  }

  async function toggleUserAccess(userId: string, currentlyDisabled: boolean) {
    try {
      const action = currentlyDisabled ? 'enable' : 'disable'
      const response = await fetch('/api/admin/users/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, userId })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update user')
      }

      alert(currentlyDisabled ? 'User access restored' : 'User access disabled')
      await fetchUsers()
    } catch (err) {
      console.error('Error toggling user access:', err)
      alert('Failed to update user: ' + err.message)
    }
  }

  if (!isAdmin && !loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h1 className="text-2xl font-bold text-red-900 mb-2">Access Denied</h1>
          <p className="text-red-700">{error || 'You do not have admin privileges.'}</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-irish-green-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading users...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          👤 User Management
        </h1>
        <p className="text-gray-600">
          Manage registered users and their data
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700">
          {error}
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Total users: <span className="font-semibold">{users.length}</span>
        </div>
        <button
          onClick={fetchUsers}
          className="px-4 py-2 bg-irish-green-600 text-white rounded-lg hover:bg-irish-green-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tunes
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sets
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Practice
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Sign In
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((u) => {
              const stats = userStats[u.id] || { tune_count: 0, set_count: 0, practice_count: 0 }
              const isBanned = u.banned_until && new Date(u.banned_until) > new Date()
              const isCurrentUser = u.id === user?.id

              return (
                <tr key={u.id} className={isBanned ? 'bg-red-50' : 'hover:bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {u.email}
                      {isCurrentUser && (
                        <span className="ml-2 text-xs text-irish-green-600">(You)</span>
                      )}
                    </div>
                    {!u.email_confirmed_at && (
                      <div className="text-xs text-orange-600">Unconfirmed</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {isBanned ? (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                        Disabled
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                    {stats.tune_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                    {stats.set_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                    {stats.practice_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                    {!isCurrentUser && (
                      <>
                        <button
                          onClick={() => toggleUserAccess(u.id, isBanned)}
                          className={`px-3 py-1 rounded ${
                            isBanned
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                          }`}
                        >
                          {isBanned ? 'Enable' : 'Disable'}
                        </button>
                        <button
                          onClick={() => deleteUser(u.id, u.email)}
                          className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">Admin Notes:</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>This page requires admin privileges (configure NEXT_PUBLIC_ADMIN_EMAILS in environment variables)</li>
          <li>User management requires Supabase service role key for full functionality</li>
          <li>Deleting a user will permanently delete all their tunes, sets, and practice data</li>
          <li>Disabling a user prevents them from signing in but preserves their data</li>
        </ul>
      </div>
    </div>
  )
}
