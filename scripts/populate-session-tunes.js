/**
 * Script to populate session_tunes table with data from The Session
 * Run this with: node scripts/populate-session-tunes.js
 * 
 * Make sure you have a .env.local file in web-app/ with:
 * NEXT_PUBLIC_SUPABASE_URL=your_url
 * SUPABASE_SERVICE_ROLE_KEY=your_service_role_key (from Supabase dashboard)
 */

const https = require('https')
const fs = require('fs')
const path = require('path')

// Load environment variables from web-app/.env.local
const envPath = path.join(__dirname, '..', 'web-app', '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim()
      process.env[key] = value
    }
  })
  console.log('Loaded environment variables from .env.local')
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('\n❌ Missing environment variables!')
  console.error('Make sure your web-app/.env.local file has:')
  console.error('  NEXT_PUBLIC_SUPABASE_URL=your_url')
  console.error('  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key')
  console.error('\nYou can find the service role key in:')
  console.error('  Supabase Dashboard → Settings → API → service_role key')
  process.exit(1)
}

async function fetchSessionTunes() {
  return new Promise((resolve, reject) => {
    console.log('\n📥 Fetching tunes from The Session GitHub repository...')
    
    https.get('https://raw.githubusercontent.com/adactio/TheSession-data/main/json/tunes.json', (res) => {
      let data = ''
      
      res.on('data', (chunk) => {
        data += chunk
      })
      
      res.on('end', () => {
        try {
          const tunes = JSON.parse(data)
          console.log(`✅ Fetched ${tunes.length} tunes`)
          resolve(tunes)
        } catch (err) {
          reject(err)
        }
      })
    }).on('error', reject)
  })
}

async function insertTunes(tunes) {
  console.log('\n💾 Inserting tunes into database...')
  
  // Debug: Check first tune structure
  if (tunes.length > 0) {
    console.log('  Sample tune keys:', Object.keys(tunes[0]))
    console.log('  Sample tune:', JSON.stringify(tunes[0], null, 2).substring(0, 500))
  }
  
  // Transform tunes to match our schema
  const transformedTunes = tunes.map(tune => ({
    id: parseInt(tune.id || tune.tune_id || tune.tuneId),
    name: tune.name || tune.title || 'Unknown',
    type: tune.type || null,
    abc: tune.abc || null,
    data: tune // Store full object in JSONB
  })).filter(tune => !isNaN(tune.id))
  
  console.log(`  Processed ${transformedTunes.length} tunes with valid IDs`)
  
  // Insert in batches of 100
  const batchSize = 100
  let inserted = 0
  
  for (let i = 0; i < transformedTunes.length; i += batchSize) {
    const batch = transformedTunes.slice(i, i + batchSize)
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/session_tunes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Prefer': 'resolution=ignore-duplicates'
      },
      body: JSON.stringify(batch)
    })
    
    if (!response.ok) {
      const error = await response.text()
      console.error(`❌ Error inserting batch ${i / batchSize + 1}:`, error)
    } else {
      inserted += batch.length
      process.stdout.write(`\r  Progress: ${inserted}/${transformedTunes.length} tunes`)
    }
  }
  
  console.log('\n✅ Done!')
}

async function main() {
  try {
    console.log('\n🎵 The Session Tunes Import Script')
    console.log('===================================')
    const tunes = await fetchSessionTunes()
    await insertTunes(tunes)
    console.log('\n🎉 Successfully imported all tunes!\n')
  } catch (error) {
    console.error('\n❌ Error:', error.message)
    process.exit(1)
  }
}

main()
