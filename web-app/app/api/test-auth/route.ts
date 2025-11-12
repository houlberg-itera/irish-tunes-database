import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET() {
  console.log('=== TEST AUTH ENDPOINT CALLED ===')
  
  try {
    const supabase = await createClient()
    
    // Test database connection
    console.log('Testing database connection...')
    const { data: testData, error: testError } = await supabase
      .from('tunes')
      .select('count')
      .limit(1)
    
    console.log('Database test result:', { testData, testError })
    
    // Test auth
    console.log('Testing auth session...')
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    console.log('Session test result:', { 
      hasSession: !!session, 
      sessionError,
      user: session?.user?.email 
    })
    
    return NextResponse.json({
      status: 'ok',
      database: testError ? 'error' : 'connected',
      auth: sessionError ? 'error' : (session ? 'authenticated' : 'not authenticated'),
      user: session?.user?.email || null,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    })
  } catch (error) {
    console.error('Test endpoint error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
