import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { createClient } from '@/lib/supabase-server'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    // Verify the requester is an admin
    const serverSupabase = await createClient()
    const { data: { user } } = await serverSupabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').split(',')
    if (!adminEmails.includes(user.email || '')) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const body = await req.json()
    const { action, userId } = body

    const adminClient = createAdminClient()

    if (action === 'delete') {
      // Delete user's data first
      await serverSupabase.from('user_tune_practice').delete().eq('user_id', userId)
      
      const { data: sets } = await serverSupabase.from('tune_sets').select('id').eq('user_id', userId)
      if (sets && sets.length > 0) {
        await serverSupabase.from('tune_set_items').delete().in('set_id', sets.map(s => s.id))
      }
      
      await serverSupabase.from('tune_sets').delete().eq('user_id', userId)
      await serverSupabase.from('tunes').delete().eq('user_id', userId)

      // Delete auth user
      const { error } = await adminClient.auth.admin.deleteUser(userId)
      
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    if (action === 'disable') {
      const { error } = await adminClient.auth.admin.updateUserById(userId, {
        ban_duration: '876000h' // 100 years
      })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    if (action === 'enable') {
      const { error } = await adminClient.auth.admin.updateUserById(userId, {
        ban_duration: 'none'
      })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Admin action error:', error)
    return NextResponse.json(
      { error: 'Failed to perform action' }, 
      { status: 500 }
    )
  }
}
