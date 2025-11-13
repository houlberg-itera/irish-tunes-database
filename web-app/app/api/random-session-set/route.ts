import { NextResponse } from 'next/server'
import { cleanAndCompleteABC } from '@/lib/abc-utils'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  try {
    console.log('Fetching random tunes from database...')
    
    // Get a random tune type that has at least 3 tunes
    const { data: typeCounts, error: typeError } = await supabase
      .from('session_tunes')
      .select('type')
      .not('type', 'is', null)
    
    if (typeError) throw typeError
    
    // Count tunes by type
    const typeMap = new Map<string, number>()
    typeCounts?.forEach((row: any) => {
      const count = typeMap.get(row.type) || 0
      typeMap.set(row.type, count + 1)
    })
    
    // Filter types with at least 3 tunes
    const validTypes = Array.from(typeMap.entries())
      .filter(([_, count]) => count >= 3)
      .map(([type]) => type)
    
    if (validTypes.length === 0) {
      return NextResponse.json(
        { error: 'Not enough tunes in database. Please run populate-session-tunes script.' },
        { status: 404 }
      )
    }
    
    // Pick random type
    const selectedType = validTypes[Math.floor(Math.random() * validTypes.length)]
    console.log(`Selected type: ${selectedType}`)
    
    // Fetch all tunes of this type
    const { data: tunes, error: tunesError } = await supabase
      .from('session_tunes')
      .select('*')
      .eq('type', selectedType)
    
    if (tunesError) throw tunesError
    if (!tunes || tunes.length < 3) {
      return NextResponse.json(
        { error: 'Not enough tunes of selected type' },
        { status: 404 }
      )
    }
    
    console.log(`Found ${tunes.length} ${selectedType} tunes`)
    
    // Shuffle and pick 3 with different keys
    const shuffled = [...tunes]
      .sort(() => Math.random() - 0.5)
      .sort(() => Math.random() - 0.5)
      .sort(() => Math.random() - 0.5)
    
    const selectedTunes: any[] = []
    const usedKeys = new Set<string>()
    
    for (const tune of shuffled) {
      if (selectedTunes.length >= 3) break
      
      // Extract key from ABC notation
      let key = null
      if (tune.abc) {
        const keyMatch = tune.abc.match(/K:\s*([A-G][#b]?(?:maj|min)?)/i)
        key = keyMatch ? keyMatch[1] : null
      }
      
      // Only add if key is different or unknown
      if (!key || !usedKeys.has(key)) {
        selectedTunes.push(tune)
        if (key) usedKeys.add(key)
      }
    }
    
    // If couldn't find 3 with different keys, just use first 3
    if (selectedTunes.length < 3) {
      console.log('Could not find 3 tunes with different keys, using first 3')
      selectedTunes.length = 0
      selectedTunes.push(...shuffled.slice(0, 3))
    }
    
    console.log(`Selected tunes: ${selectedTunes.map(t => t.name).join(', ')}`)
    
    // Format response
    const tunesWithDetails = selectedTunes.map((tune: any) => {
      // Get ABC notation - it's directly on the tune object
      const abc = tune.abc
      
      // Try to extract key from ABC notation
      let key = null
      if (abc) {
        const keyMatch = abc.match(/K:\s*([A-G][#b]?(?:maj|min)?)/i)
        key = keyMatch ? keyMatch[1] : null
      }
      
      const completeAbc = abc
        ? cleanAndCompleteABC(abc, tune.name, key || undefined, undefined)
        : null
      
      return {
        id: tune.id,
        title: tune.name,
        type: tune.type,
        abc: completeAbc,
        key: key,
      }
    })
    
    return NextResponse.json({
      id: Math.floor(Math.random() * 10000),
      name: `Random ${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} Set`,
      date: new Date().toISOString().split('T')[0],
      tunes: tunesWithDetails,
    })
  } catch (error) {
    console.error('Error creating random set:', error)
    return NextResponse.json(
      { error: 'Failed to create random set' },
      { status: 500 }
    )
  }
}
