/**
 * Cleans and completes ABC notation to ensure proper rendering
 */
export function cleanAndCompleteABC(
  abc: string,
  title?: string,
  key?: string,
  meter?: string
): string {
  if (!abc) return ''

  // Check if ABC already has proper headers
  const hasHeaders = abc.includes('X:')
  
  let completeAbc = ''
  
  if (!hasHeaders) {
    // Add minimal headers for proper rendering
    completeAbc = 'X:1\n'
    if (title) {
      completeAbc += `T:${title}\n`
    }
    if (meter) {
      completeAbc += `M:${meter}\n`
    }
    completeAbc += 'L:1/8\n'
    if (key) {
      completeAbc += `K:${key}\n`
    }
  }
  
  // Clean up the ABC notation
  const cleanedAbc = abc
    .split('\n')
    .map(line => line.trim())
    // Remove standalone ! characters (line breaks in The Session notation)
    .filter(line => line !== '!')
    // Replace ! with actual line breaks in the music
    .map(line => line.replace(/\s*!\s*/g, '\n'))
    .join('\n')
    // Remove multiple consecutive newlines
    .replace(/\n\n+/g, '\n')
    .trim()
  
  completeAbc += cleanedAbc
  
  return completeAbc
}

/**
 * Extracts the first phrase (usually 4 bars) from ABC notation for preview
 */
export function extractABCPreview(abc: string, numBars: number = 4): string {
  if (!abc) return ''
  
  const lines = abc.split('\n')
  const headerLines: string[] = []
  const musicLines: string[] = []
  
  // Separate headers from music
  lines.forEach(line => {
    const trimmed = line.trim()
    if (trimmed.match(/^[A-Z]:/)) {
      headerLines.push(trimmed)
    } else if (trimmed && !trimmed.startsWith('%')) {
      musicLines.push(trimmed)
    }
  })
  
  if (musicLines.length === 0) return abc
  
  // Join all music into one string
  const allMusic = musicLines.join(' ')
  
  // Split on bars (|) but preserve repeat markers
  const bars: string[] = []
  let currentBar = ''
  let inBracket = false
  
  for (let i = 0; i < allMusic.length; i++) {
    const char = allMusic[i]
    
    if (char === '[') inBracket = true
    if (char === ']') inBracket = false
    
    currentBar += char
    
    // Found a bar line (not in brackets)
    if (char === '|' && !inBracket) {
      bars.push(currentBar.trim())
      currentBar = ''
    }
  }
  
  // Add any remaining music
  if (currentBar.trim()) {
    bars.push(currentBar.trim())
  }
  
  // Take the first numBars bars
  const previewBars = bars.slice(0, numBars).join(' ')
  
  // Reconstruct with headers
  return headerLines.join('\n') + '\n' + previewBars
}
