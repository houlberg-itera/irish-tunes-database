import { NextResponse } from 'next/server'
import { cleanAndCompleteABC } from '@/lib/abc-utils'

export async function GET() {
  try {
    // The Session API: Fetch popular tunes and create a random set from them
    console.log('Fetching popular tunes from The Session...')
    const response = await fetch(
      'https://thesession.org/tunes/popular?format=json&perpage=100',
      {
        headers: {
          'User-Agent': 'Irish Tunes Tracker App',
        },
      }
    )

    if (!response.ok) {
      console.error('Failed to fetch tunes list:', response.status)
      return NextResponse.json(
        { error: 'Could not fetch tunes from The Session' },
        { status: response.status }
      )
    }

    const data = await response.json()
    const tunes = data.tunes || []

    if (tunes.length === 0) {
      console.error('No tunes found in response')
      return NextResponse.json(
        { error: 'No tunes available' },
        { status: 404 }
      )
    }

    // Pick 3-4 random tunes of the same type to make a set
    // Shuffle and pick tunes
    const shuffled = [...tunes].sort(() => Math.random() - 0.5)
    const selectedTunes = shuffled.slice(0, 3)

    console.log(`Creating set with ${selectedTunes.length} tunes`)

    // Fetch detailed information for each tune
    const tunesWithDetails = await Promise.all(
      selectedTunes.map(async (tune: any) => {
        try {
          const tuneResponse = await fetch(
            `https://thesession.org/tunes/${tune.id}?format=json`,
            {
              headers: {
                'User-Agent': 'Irish Tunes Tracker App',
              },
            }
          )

          if (!tuneResponse.ok) {
            console.log(`Could not fetch tune ${tune.id}`)
            return {
              id: tune.id,
              title: tune.name || 'Unknown',
              type: tune.type || '',
              abc: null,
              key: null,
            }
          }

          const tuneData = await tuneResponse.json()
          const firstSetting = tuneData.settings?.[0]

          const completeAbc = firstSetting?.abc
            ? cleanAndCompleteABC(
                firstSetting.abc,
                tuneData.name,
                firstSetting.key,
                firstSetting.meter
              )
            : null

          return {
            id: tune.id,
            title: tuneData.name || tune.name || 'Unknown',
            type: tuneData.type || '',
            abc: completeAbc,
            key: firstSetting?.key || null,
          }
        } catch (err) {
          console.error(`Error fetching tune ${tune.id}:`, err)
          return {
            id: tune.id,
            title: tune.name || 'Unknown',
            type: tune.type || '',
            abc: null,
            key: null,
          }
        }
      })
    )

    return NextResponse.json({
      id: Math.floor(Math.random() * 10000),
      name: 'Random Session Set',
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
