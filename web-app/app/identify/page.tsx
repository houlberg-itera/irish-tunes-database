// @ts-nocheck
'use client'

import { useState, useRef, useEffect } from 'react'
import ABCNotationRenderer from '@/components/ABCNotationRenderer'

type DetectedNote = {
  note: string
  frequency: number
  duration: number
  timestamp: number
}

export default function IdentifyTunePage() {
  const [isRecording, setIsRecording] = useState(false)
  const [detectedNotes, setDetectedNotes] = useState<DetectedNote[]>([])
  const [abcNotation, setAbcNotation] = useState('')
  const [status, setStatus] = useState('Click "Start Recording" to begin')
  
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const lastNoteRef = useRef<{ note: string; timestamp: number } | null>(null)

  useEffect(() => {
    return () => {
      stopRecording()
    }
  }, [])

  async function startRecording() {
    try {
      setStatus('Requesting microphone access...')
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false
        } 
      })
      
      streamRef.current = stream
      
      const audioContext = new AudioContext()
      audioContextRef.current = audioContext
      
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 4096
      analyser.smoothingTimeConstant = 0.8
      analyserRef.current = analyser
      
      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)
      
      setIsRecording(true)
      setStatus('Recording... Play your tune!')
      setDetectedNotes([])
      lastNoteRef.current = null
      
      detectPitch()
    } catch (error) {
      console.error('Error accessing microphone:', error)
      setStatus('Error: Could not access microphone')
    }
  }

  function stopRecording() {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    
    analyserRef.current = null
    setIsRecording(false)
    setStatus('Recording stopped. Converting to ABC...')
    
    if (detectedNotes.length > 0) {
      convertToABC()
    }
  }

  function detectPitch() {
    if (!analyserRef.current || !audioContextRef.current) return
    
    const analyser = analyserRef.current
    const bufferLength = analyser.fftSize
    const buffer = new Float32Array(bufferLength)
    
    const detect = () => {
      if (!analyserRef.current || !audioContextRef.current || audioContextRef.current.state === 'closed') {
        return
      }
      
      analyser.getFloatTimeDomainData(buffer)
      
      const frequency = autoCorrelate(buffer, audioContextRef.current!.sampleRate)
      
      // Filter for typical musical range (C3 to C7)
      if (frequency > 130 && frequency < 2100) {
        const note = frequencyToNote(frequency)
        const now = Date.now()
        
        // Only record if it's a different note or enough time has passed (increased to 300ms)
        if (!lastNoteRef.current || 
            lastNoteRef.current.note !== note || 
            now - lastNoteRef.current.timestamp > 300) {
          
          const duration = lastNoteRef.current 
            ? now - lastNoteRef.current.timestamp 
            : 300
          
          setDetectedNotes(prev => [...prev, {
            note,
            frequency,
            duration,
            timestamp: now
          }])
          
          lastNoteRef.current = { note, timestamp: now }
        }
      }
      
      animationFrameRef.current = requestAnimationFrame(detect)
    }
    
    detect()
  }

  function autoCorrelate(buffer: Float32Array, sampleRate: number): number {
    // Find the fundamental frequency using autocorrelation
    let size = buffer.length
    let maxSamples = Math.floor(size / 2)
    let bestOffset = -1
    let bestCorrelation = 0
    let rms = 0
    
    // Calculate RMS (root mean square) for volume detection
    for (let i = 0; i < size; i++) {
      const val = buffer[i]
      rms += val * val
    }
    rms = Math.sqrt(rms / size)
    
    // Ignore if too quiet (increased threshold)
    if (rms < 0.02) return -1
    
    // Find the best correlation
    let lastCorrelation = 1
    for (let offset = 0; offset < maxSamples; offset++) {
      let correlation = 0
      
      for (let i = 0; i < maxSamples; i++) {
        correlation += Math.abs(buffer[i] - buffer[i + offset])
      }
      
      correlation = 1 - (correlation / maxSamples)
      
      if (correlation > 0.92 && correlation > lastCorrelation) {
        const foundGoodCorrelation = correlation > bestCorrelation
        if (foundGoodCorrelation) {
          bestCorrelation = correlation
          bestOffset = offset
        }
      }
      
      lastCorrelation = correlation
    }
    
    if (bestCorrelation > 0.1 && bestOffset > 0) {
      return sampleRate / bestOffset
    }
    
    return -1
  }

  function frequencyToNote(frequency: number): string {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    const A4 = 440
    const C0 = A4 * Math.pow(2, -4.75)
    
    const halfSteps = 12 * Math.log2(frequency / C0)
    const noteIndex = Math.round(halfSteps) % 12
    const octave = Math.floor(Math.round(halfSteps) / 12)
    
    return noteNames[noteIndex] + octave
  }

  function convertToABC() {
    if (detectedNotes.length === 0) {
      setStatus('No notes detected')
      return
    }
    
    // Group notes by duration to determine note values
    const avgDuration = detectedNotes.reduce((sum, n) => sum + n.duration, 0) / detectedNotes.length
    
    // Convert to ABC note format
    const abcNotes = detectedNotes.map(note => {
      const noteName = note.note.replace(/[0-9]/g, '') // Remove octave number
      const octave = parseInt(note.note.match(/[0-9]/)?.[0] || '4')
      
      // ABC octave notation: C,, C, C c c' c''
      let abcNote = noteName
      if (octave <= 2) {
        abcNote = noteName + ','.repeat(3 - octave)
      } else if (octave === 3) {
        abcNote = noteName + ','
      } else if (octave === 4) {
        abcNote = noteName
      } else if (octave === 5) {
        abcNote = noteName.toLowerCase()
      } else if (octave >= 6) {
        abcNote = noteName.toLowerCase() + "'".repeat(octave - 5)
      }
      
      // Determine duration (simplified: use eighth notes mostly)
      const relDuration = note.duration / avgDuration
      let duration = ''
      if (relDuration < 0.5) {
        duration = '/2' // sixteenth
      } else if (relDuration > 1.5) {
        duration = '2' // quarter
      }
      // else eighth note (default, no suffix needed)
      
      return abcNote + duration
    }).join(' ')
    
    // Create simple ABC notation
    const abc = `X:1
T:Detected Tune
M:4/4
L:1/8
K:C
${abcNotes}|]`
    
    setAbcNotation(abc)
    setStatus(`Detected ${detectedNotes.length} notes`)
  }

  function clearRecording() {
    setDetectedNotes([])
    setAbcNotation('')
    setStatus('Click "Start Recording" to begin')
    lastNoteRef.current = null
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold text-gray-900 mb-2">🎵 Identify Tune</h1>
      <p className="text-gray-600 mb-8">Play a tune and we'll try to detect the notes</p>

      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="flex flex-col items-center gap-4">
          <div className="flex gap-4">
            {!isRecording ? (
              <button
                onClick={startRecording}
                className="px-6 py-3 bg-irish-green-600 text-white rounded-lg hover:bg-irish-green-700 font-medium"
              >
                🎤 Start Recording
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium animate-pulse"
              >
                ⏹️ Stop Recording
              </button>
            )}
            
            {detectedNotes.length > 0 && !isRecording && (
              <button
                onClick={clearRecording}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
              >
                🗑️ Clear
              </button>
            )}
          </div>
          
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700">{status}</p>
            {isRecording && (
              <p className="text-xs text-gray-500 mt-1">
                Play slowly and clearly for best results
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Detected Notes */}
      {detectedNotes.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Detected Notes ({detectedNotes.length})</h2>
          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
            {detectedNotes.map((note, idx) => (
              <span
                key={idx}
                className="px-3 py-1 bg-irish-green-100 text-irish-green-800 rounded text-sm font-mono"
              >
                {note.note}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ABC Notation */}
      {abcNotation && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">ABC Notation</h2>
          <div className="mb-4">
            <textarea
              value={abcNotation}
              onChange={(e) => setAbcNotation(e.target.value)}
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm"
            />
          </div>
          
          <h3 className="text-lg font-semibold mb-2">Preview</h3>
          <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
            <ABCNotationRenderer abc={abcNotation} />
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-2">💡 Tips for Best Results</h3>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
          <li>Play slowly and clearly</li>
          <li>Use a quiet environment</li>
          <li>Play one note at a time (no chords)</li>
          <li>Stay close to the microphone</li>
          <li>Try whistling or humming if you don't have an instrument</li>
          <li>This is experimental - results may vary!</li>
        </ul>
      </div>
    </div>
  )
}
